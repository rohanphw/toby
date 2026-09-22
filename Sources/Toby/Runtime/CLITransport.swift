import Foundation

/// One process per owner. Account checks never share a process with running work.
@MainActor final class CLITransport {
    var onEvent: ((String, JSONValue, JSONValue?) -> Void)?
    var onExit: ((String) -> Void)?
    private var process: Process?
    private var input: FileHandle?
    private var reader: Task<Void, Never>?
    private var generation = UUID()
    private var sequence = 0
    private var pending: [Int: CheckedContinuation<JSONValue, Error>] = [:]
    private var deadlines: [Int: Task<Void, Never>] = [:]

    let provider: CLIProvider
    private let workspace: URL?
    init(provider: CLIProvider = .codex, workspace: URL? = nil) {
        self.provider = provider
        self.workspace = workspace
    }
    static func executable(for provider: CLIProvider = .codex) -> URL? {
        provider.executable
    }
    func start() async throws {
        guard process == nil else { return }
        guard let binary = Self.executable(for: provider) else {
            throw TobyError("Choose the \(provider.title) executable in Settings to connect Toby.")
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
        child.currentDirectoryURL = workspace ?? AppPaths.root
        let arguments =
            provider == .codex ? ["app-server", "--listen", "stdio://"] : ["agent", "--no-leader", "stdio"]
        if let workspace {
            // Inherited by CLI tools: prompts alone cannot protect archived data on disk.
            let sandbox = URL(fileURLWithPath: "/usr/bin/sandbox-exec")
            guard FileManager.default.isExecutableFile(atPath: sandbox.path) else {
                throw TobyError(
                    "This Mac cannot enforce Toby’s library isolation. Agent work was not started.")
            }
            let codexWrites =
                provider == .codex
                ? """
                (deny file-write*
                    (require-not
                        (require-any
                            (subpath (param "TOBY_WORKSPACE"))
                            (subpath (param "TOBY_CODEX_HOME"))
                            (subpath (param "TOBY_TEMP"))
                            (subpath "/private/tmp")
                            (literal "/dev/null")
                            (literal "/dev/tty"))))
                """ : ""
            let profile = """
                (version 1)
                (allow default)
                \(codexWrites)
                (deny file-read-data file-write*
                    (require-all
                        (subpath (param "TOBY_LIBRARY"))
                        (require-not (subpath (param "TOBY_WORKSPACE")))))
                """
            child.executableURL = sandbox
            child.arguments =
                [
                    "-D", "TOBY_LIBRARY=\(AppPaths.root.resolvingSymlinksInPath().path)",
                    "-D", "TOBY_WORKSPACE=\(workspace.resolvingSymlinksInPath().path)",
                    "-D",
                    "TOBY_CODEX_HOME=\(URL(fileURLWithPath: environment["CODEX_HOME"] ?? FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".codex").path).resolvingSymlinksInPath().path)",
                    "-D",
                    "TOBY_TEMP=\(FileManager.default.temporaryDirectory.resolvingSymlinksInPath().path)",
                    "-p", profile, binary.path,
                ] + arguments
        } else {
            child.executableURL = binary
            child.arguments = arguments
        }
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
            if provider == .codex {
                _ = try await request(
                    "initialize",
                    [
                        "clientInfo": .object([
                            "name": .string("toby_next"), "title": .string("Toby"),
                            "version": .string("0.10.0"),
                        ])
                    ])
                try send(.object(["method": .string("initialized")]))
            } else {
                let result = try await request(
                    "initialize",
                    [
                        "protocolVersion": .number(1),
                        "clientInfo": .object(["name": .string("toby"), "version": .string("0.10.0")]),
                        "clientCapabilities": .object([
                            "fs": .object(["readTextFile": .bool(false), "writeTextFile": .bool(false)]),
                            "terminal": .bool(false),
                        ]),
                    ])
                guard
                    (result["authMethods"].array ?? []).contains(where: { $0["id"].string == "cached_token" })
                else {
                    throw TobyError(
                        "Grok has no cached CLI login available. Run grok login in Terminal, then check again."
                    )
                }
                _ = try await request(
                    "authenticate",
                    ["methodId": .string("cached_token"), "_meta": .object(["headless": .bool(true)])])
            }
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
        let providerName = provider.title
        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { continuation in
                pending[id] = continuation
                deadlines[id] = Task { [weak self] in
                    try? await Task.sleep(for: .seconds(timeout))
                    guard !Task.isCancelled else { return }
                    self?.fail(
                        id, TobyError("\(providerName) did not respond to \(method). You can retry."))
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
        guard let input, process?.isRunning == true else {
            throw TobyError("\(provider.title) is not running.")
        }
        var message = value.object ?? [:]
        if provider == .grok { message["jsonrpc"] = .string("2.0") }
        var data = try JSONEncoder().encode(JSONValue.object(message))
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
        for id in Array(pending.keys) { fail(id, TobyError("\(provider.title) exited (\(status)).")) }
        process = nil
        input = nil
        onExit?("\(provider.title) exited (\(status)).")
    }
}
