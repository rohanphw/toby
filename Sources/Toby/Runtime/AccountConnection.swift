import AppKit
import Observation

struct ModelOption: Identifiable {
    let id: String
    let name: String
}
@MainActor @Observable final class AccountConnection {
    let provider: CLIProvider
    var status = "CLI session not checked"
    var isBusy = false
    var models: [ModelOption] = []
    var error: String?
    private var operation: Task<Void, Never>?
    private var transport: CLITransport?
    private var generation = UUID()
    init(provider: CLIProvider = .codex) { self.provider = provider }
    func cancel() {
        generation = UUID()
        operation?.cancel()
        transport?.stop()
        transport = nil
        isBusy = false
        status = "Connection check cancelled"
    }
    func refresh() {
        guard !isBusy else { return }
        isBusy = true
        error = nil
        models = []
        let token = UUID()
        generation = token
        operation = Task {
            let client = CLITransport(provider: provider)
            transport = client
            // Never accept tools or execute a prompt while checking authentication.
            client.onEvent = { [weak client] _, _, id in if let id { client?.reject(id) } }
            defer {
                client.stop()
                if generation == token {
                    transport = nil
                    isBusy = false
                }
            }
            do {
                try await client.start()
                if provider == .codex {
                    let result = try await client.request("account/read", ["refreshToken": .bool(false)])
                    guard result["account"].object != nil else {
                        throw TobyError(
                            "Run codex login in Terminal, then check again. Toby uses that CLI session.")
                    }
                    guard generation == token else { return }
                    status =
                        result["account"]["email"].string.map { "CLI session · \($0)" }
                        ?? "Using authenticated Codex CLI"
                    let response = try await client.request(
                        "model/list", ["includeHidden": .bool(false), "limit": .number(100)])
                    guard generation == token else { return }
                    models = (response["data"].array ?? []).compactMap {
                        guard let model = $0["model"].string else { return nil }
                        return ModelOption(id: model, name: $0["displayName"].string ?? model)
                    }
                } else {
                    guard generation == token else { return }
                    status = "Using authenticated Grok CLI"
                }
            } catch is CancellationError {} catch {
                guard generation == token else { return }
                self.error = error.localizedDescription
                status = "CLI session needs attention"
            }
        }
    }
    func copyLoginCommand() {
        let path = provider.executable?.path ?? provider.rawValue
        let quoted = "'" + path.replacingOccurrences(of: "'", with: "'\\''") + "'"
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString("\(quoted) login", forType: .string)
    }
    func chooseExecutable() {
        let panel = NSOpenPanel()
        panel.title = "Choose the \(provider.title) executable"
        panel.canChooseDirectories = false
        guard panel.runModal() == .OK, let url = panel.url else { return }
        guard FileManager.default.isExecutableFile(atPath: url.path) else {
            error = "Choose an executable file."
            return
        }
        UserDefaults.standard.set(url.path, forKey: provider.rawValue + "Binary")
        refresh()
    }
}
