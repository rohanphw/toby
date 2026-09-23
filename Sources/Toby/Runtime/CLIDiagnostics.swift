import Foundation

/// Keep only a bounded in-memory tail. Never persist or display raw CLI logs,
/// which may contain account credentials or user configuration.
final class CLIDiagnostics: @unchecked Sendable {
    private let lock = NSLock()
    private var tail = Data()
    func append(_ data: Data) {
        lock.lock()
        defer { lock.unlock() }
        tail.append(data.suffix(8192))
        if tail.count > 8192 { tail.removeFirst(tail.count - 8192) }
    }
    func failure(provider: String, status: Int32) -> String {
        lock.lock()
        let text = String(decoding: tail, as: UTF8.self).lowercased()
        lock.unlock()
        let reason: String
        if text.contains("node") && (text.contains("no such file") || text.contains("not found")) {
            reason =
                "Its Node.js runtime could not be found. Repair the CLI installation or select the executable from the same Node installation in Manage connection."
        } else if text.contains("unexpected argument") || text.contains("unrecognized")
            || text.contains("unknown command")
        {
            reason =
                "This CLI does not support the required connection protocol. Update it in Terminal, then choose the updated executable in Manage connection."
        } else if text.contains("config")
            && (text.contains("parse") || text.contains("invalid") || text.contains("error"))
        {
            reason =
                "The CLI reported a configuration error. Open it in Terminal to see and correct the configuration problem."
        } else if text.contains("permission denied") || text.contains("operation not permitted") {
            reason =
                "macOS denied access required by the CLI. Open it in Terminal to inspect the permission error."
        } else {
            reason =
                "Open it in Terminal to see its startup error. Check its installation and login, then retry."
        }
        return "\(provider) stopped (exit \(status)). \(reason)"
    }
}
