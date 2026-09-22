import Foundation

/// One process per owner. Account checks never share a process with running work.
@MainActor final class CodexTransport {
    var onEvent: ((String, JSONValue, JSONValue?) -> Void)?
    var onExit: ((String) -> Void)?
    private var process: Process?
    private var input: FileHandle?
    private var reader: Task<Void, Never>?
    private var generation = UUID()
    private var sequence = 0
    private var pending: [Int: CheckedContinuation<JSONValue, Error>] = [:]
    private var deadlines: [Int: Task<Void, Never>] = [:]

    static func executable() -> URL? {
        let configured = UserDefaults.standard.string(forKey: "codexBinary")
        let bundled = Bundle.main.url(forResource: "codex", withExtension: nil, subdirectory: "bin")?.path
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        var candidates = [
            configured, bundled, "/opt/homebrew/bin/codex", "/usr/local/bin/codex",
            "\(home)/.local/bin/codex",
        ].compactMap { $0 }
        candidates += (ProcessInfo.processInfo.environment["PATH"] ?? "").split(separator: ":").map {
            "\($0)/codex"
        }
        let nvm = URL(fileURLWithPath: home).appendingPathComponent(".nvm/versions/node")
        candidates +=
            ((try? FileManager.default.contentsOfDirectory(at: nvm, includingPropertiesForKeys: nil)) ?? [])
            .sorted { $0.lastPathComponent > $1.lastPathComponent }.map {
                $0.appendingPathComponent("bin/codex").path
            }
        return candidates.first(where: { FileManager.default.isExecutableFile(atPath: $0) }).map(
            URL.init(fileURLWithPath:))
    }
    func start() async throws {
        guard process == nil else { return }
        guard let binary = Self.executable() else {
            throw TobyError("Choose a Codex executable in Settings to connect Toby.")
        }
        let child = Process()
        let stdin = Pipe()
        let stdout = Pipe()
        let stderr = Pipe()
        let token = UUID()
        generation = token
        var environment = ProcessInfo.processInfo.environment
        environment["PATH"] =
            binary.deletingLastPathComponent().path + ":/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:"
            + (environment["PATH"] ?? "")
        child.environment = environment
        child.executableURL = binary
        child.arguments = ["app-server", "--listen", "stdio://"]
        child.standardInput = stdin
        child.standardOutput = stdout
        child.standardError = stderr
        stderr.fileHandleForReading.readabilityHandler = { handle in _ = handle.availableData }
        let chunks = AsyncStream<Data> { continuation in
            DispatchQueue(label: "toby.codex.stdout.\(token)").async {
                while true {
                    let data = stdout.fileHandleForReading.availableData
                    if data.isEmpty { break }
                    continuation.yield(data)
                }
                continuation.finish()
            }
        }
        child.terminationHandler = { [weak self] child in
            Task { @MainActor in self?.exited(token, status: child.terminationStatus) }
        }
        do { try child.run() } catch {
            try? stdout.fileHandleForWriting.close()
            throw error
        }
        process = child
        input = stdin.fileHandleForWriting
        reader = Task { [weak self] in
            var buffer = Data()
            for await chunk in chunks {
                guard !Task.isCancelled else { return }
                buffer.append(chunk)
                while let end = buffer.firstIndex(of: 10) {
                    let line = buffer.prefix(upTo: end)
                    buffer.removeSubrange(...end)
                    if let json = try? JSONDecoder().decode(JSONValue.self, from: line) {
                        self?.receive(json, generation: token)
                    }
                }
            }
        }
        do {
            _ = try await request(
                "initialize",
                [
                    "clientInfo": .object([
                        "name": .string("toby_next"), "title": .string("Toby"), "version": .string("0.1.0"),
                    ])
                ])
            try send(.object(["method": .string("initialized")]))
        } catch {
            stop()
            throw error
        }
    }
    func request(_ method: String, _ params: [String: JSONValue] = [:], timeout: Double = 30) async throws
        -> JSONValue
    {
        try Task.checkCancellation()
        sequence += 1
        let id = sequence
        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { continuation in
                pending[id] = continuation
                deadlines[id] = Task { [weak self] in
                    try? await Task.sleep(for: .seconds(timeout))
                    guard !Task.isCancelled else { return }
                    self?.fail(id, TobyError("Codex did not respond to \(method). You can retry."))
                }
                do {
                    try send(
                        .object([
                            "id": .number(Double(id)), "method": .string(method), "params": .object(params),
                        ]))
                } catch { fail(id, error) }
            }
        } onCancel: {
            Task { @MainActor [weak self] in self?.fail(id, CancellationError()) }
        }
    }
    func reply(_ id: JSONValue, result: JSONValue) throws { try send(.object(["id": id, "result": result])) }
    func reject(_ id: JSONValue) {
        try? send(
            .object([
                "id": id,
                "error": .object([
                    "code": .number(-32601), "message": .string("This interaction is not supported by Toby."),
                ]),
            ]))
    }
    func stop() {
        generation = UUID()
        reader?.cancel()
        reader = nil
        let child = process
        process = nil
        try? input?.close()
        input = nil
        for id in Array(pending.keys) { fail(id, CancellationError()) }
        if child?.isRunning == true {
            child?.terminate()
            DispatchQueue.global().asyncAfter(deadline: .now() + 2) {
                if let child, child.isRunning { kill(child.processIdentifier, SIGKILL) }
            }
        }
    }
    private func send(_ value: JSONValue) throws {
        guard let input, process?.isRunning == true else { throw TobyError("Codex is not running.") }
        var data = try JSONEncoder().encode(value)
        data.append(10)
        try input.write(contentsOf: data)
    }
    private func receive(_ value: JSONValue, generation token: UUID) {
        guard token == generation else { return }
        if let id = value["id"].int, value["method"].string == nil {
            deadlines.removeValue(forKey: id)?.cancel()
            guard let continuation = pending.removeValue(forKey: id) else { return }
            if let message = value["error"]["message"].string {
                continuation.resume(throwing: TobyError(message))
            } else {
                continuation.resume(returning: value["result"])
            }
        } else if let method = value["method"].string {
            onEvent?(method, value["params"], value.object?["id"])
        }
    }
    private func fail(_ id: Int, _ error: Error) {
        deadlines.removeValue(forKey: id)?.cancel()
        pending.removeValue(forKey: id)?.resume(throwing: error)
    }
    private func exited(_ token: UUID, status: Int32) {
        guard generation == token else { return }
        for id in Array(pending.keys) { fail(id, TobyError("Codex exited (\(status)).")) }
        process = nil
        input = nil
        onExit?("Codex exited (\(status)).")
    }
}
