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
    func launchPath(binary: URL, inherited: String?) -> String {
        let home = FileManager.default.homeDirectoryForCurrentUser
        let nvm = home.appendingPathComponent(".nvm/versions/node")
        let versions =
            ((try? FileManager.default.contentsOfDirectory(at: nvm, includingPropertiesForKeys: nil)) ?? [])
            .sorted {
                $0.lastPathComponent.compare($1.lastPathComponent, options: .numeric) == .orderedDescending
            }
        var paths = [
            binary.deletingLastPathComponent().path,
            binary.resolvingSymlinksInPath().deletingLastPathComponent().path,
        ]
        paths += (inherited ?? "").split(separator: ":").map(String.init)
        paths += [".local/bin", ".volta/bin", ".asdf/shims", ".local/share/mise/shims", ".bun/bin"].map {
            home.appendingPathComponent($0).path
        }
        paths += versions.map { $0.appendingPathComponent("bin").path }
        paths += ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"]
        var seen = Set<String>()
        return paths.filter { $0.hasPrefix("/") && seen.insert($0).inserted }.joined(separator: ":")
    }
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
            .sorted {
                $0.lastPathComponent.compare($1.lastPathComponent, options: .numeric) == .orderedDescending
            }.map {
                $0.appendingPathComponent("bin/\(rawValue)").path
            }
        return candidates.first(where: { FileManager.default.isExecutableFile(atPath: $0) }).map(
            URL.init(fileURLWithPath:))
    }
}
