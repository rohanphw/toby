import Foundation

enum CLIProvider: String, CaseIterable, Identifiable {
    case codex, grok
    var id: String { rawValue }
    var title: String { self == .codex ? "Codex" : "Grok" }
    var setupURL: URL {
        URL(
            string: self == .codex
                ? "https://developers.openai.com/codex/cli" : "https://docs.x.ai/build/overview")!
    }
    var loginCommand: String { "\(rawValue) login" }
    var executable: URL? {
        let home = FileManager.default.homeDirectoryForCurrentUser
        let configured = UserDefaults.standard.string(forKey: rawValue + "Binary")
        // An explicit selection must not silently fall back to a different installation.
        if let configured, !configured.isEmpty {
            return FileManager.default.isExecutableFile(atPath: configured)
                ? URL(fileURLWithPath: configured) : nil
        }
        var candidates = (ProcessInfo.processInfo.environment["PATH"] ?? "").split(separator: ":").map {
            "\($0)/\(rawValue)"
        }
        candidates += [
            home.appendingPathComponent(".local/bin/\(rawValue)").path,
            home.appendingPathComponent(".\(rawValue)/bin/\(rawValue)").path,
            "/opt/homebrew/bin/\(rawValue)", "/usr/local/bin/\(rawValue)",
        ]
        let nvm = home.appendingPathComponent(".nvm/versions/node")
        candidates +=
            ((try? FileManager.default.contentsOfDirectory(at: nvm, includingPropertiesForKeys: nil)) ?? [])
            .sorted { $0.lastPathComponent > $1.lastPathComponent }.map {
                $0.appendingPathComponent("bin/\(rawValue)").path
            }
        return candidates.first(where: { FileManager.default.isExecutableFile(atPath: $0) }).map(
            URL.init(fileURLWithPath:))
    }
}
