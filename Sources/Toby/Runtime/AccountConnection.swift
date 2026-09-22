import AppKit
import Observation

struct ModelOption: Identifiable {
    let id: String
    let name: String
}
@MainActor @Observable final class AccountConnection {
    var status = "Not checked"
    var isBusy = false
    var models: [ModelOption] = []
    var error: String?
    private var operation: Task<Void, Never>?
    private var transport: CodexTransport?
    func refresh() { run(login: false) }
    func signIn() { run(login: true) }
    func cancel() {
        operation?.cancel()
        transport?.stop()
        isBusy = false
        status = "Connection check cancelled"
    }
    private func run(login: Bool) {
        guard !isBusy else { return }
        isBusy = true
        error = nil
        operation = Task {
            let client = CodexTransport()
            transport = client
            defer {
                client.stop()
                transport = nil
                isBusy = false
            }
            do {
                try await client.start()
                if login {
                    let challenge = try await client.request(
                        "account/login/start", ["type": .string("chatgpt")])
                    guard let raw = challenge["authUrl"].string, let url = URL(string: raw),
                        NSWorkspace.shared.open(url)
                    else {
                        throw TobyError("Could not open the sign-in page.")
                    }
                    status = "Finish signing in in your browser"
                }
                let deadline = Date().addingTimeInterval(login ? 180 : 0)
                repeat {
                    try Task.checkCancellation()
                    let result = try await client.request("account/read", ["refreshToken": .bool(false)])
                    if result["account"].object != nil {
                        status = result["account"]["email"].string ?? "Connected to Codex"
                        let response = try await client.request(
                            "model/list", ["includeHidden": .bool(false), "limit": .number(100)])
                        models = (response["data"].array ?? []).compactMap {
                            guard let model = $0["model"].string else { return nil }
                            return ModelOption(id: model, name: $0["displayName"].string ?? model)
                        }
                        return
                    }
                    if !login {
                        status = "Sign in to connect"
                        return
                    }
                    try await Task.sleep(for: .seconds(2))
                } while Date() < deadline
                throw TobyError("Sign-in timed out. You can try again.")
            } catch is CancellationError {} catch {
                self.error = error.localizedDescription
                status = "Connection needs attention"
            }
        }
    }
    func chooseExecutable() {
        let panel = NSOpenPanel()
        panel.title = "Choose the Codex executable"
        panel.canChooseDirectories = false
        guard panel.runModal() == .OK, let url = panel.url else { return }
        guard FileManager.default.isExecutableFile(atPath: url.path) else {
            error = "Choose an executable file."
            return
        }
        UserDefaults.standard.set(url.path, forKey: "codexBinary")
        refresh()
    }
}
