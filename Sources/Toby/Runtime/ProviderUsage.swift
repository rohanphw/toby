import Foundation
import Observation

struct UsageWindow: Identifiable {
    let id: String
    let title: String
    let remaining: Double
    let resetsAt: Date?
}
@MainActor @Observable final class ProviderUsage {
    private(set) var windows: [UsageWindow] = []
    private(set) var refreshedAt: Date?
    private(set) var isLoading = false
    private(set) var message: String?
    private var operation: Task<Void, Never>?
    private var transport: CLITransport?
    func refresh(provider: CLIProvider) {
        guard !isLoading else { return }
        guard provider == .codex else {
            message = "Account limits aren’t available through this Grok connection yet."
            return
        }
        isLoading = true
        message = nil
        operation = Task {
            let client = CLITransport(provider: provider)
            transport = client
            client.onEvent = { [weak client] _, _, id in if let id { client?.reject(id) } }
            defer {
                client.stop()
                transport = nil
                isLoading = false
            }
            do {
                try await client.start()
                let result = try await client.request("account/rateLimits/read", timeout: 10)
                try Task.checkCancellation()
                var parsed: [UsageWindow] = []
                let buckets = result["rateLimitsByLimitId"].object
                let snapshots = (buckets?.isEmpty == false ? buckets : nil) ?? ["codex": result["rateLimits"]]
                for (id, snapshot) in snapshots.sorted(by: { $0.key < $1.key }) {
                    for key in ["primary", "secondary"] {
                        let window = snapshot[key]
                        guard case .number(let used) = window["usedPercent"], used.isFinite else { continue }
                        let duration = window["windowDurationMins"].int
                        let period: String
                        switch duration {
                        case 10080: period = "Weekly"
                        case 1440: period = "Daily"
                        case let value? where value > 0 && value % 60 == 0: period = "\(value / 60) hours"
                        case let value? where value > 0: period = "\(value) minutes"
                        default: period = key == "primary" ? "Current window" : "Additional window"
                        }
                        let label = snapshot["limitName"].string ?? id
                        parsed.append(
                            UsageWindow(
                                id: "\(id)-\(key)",
                                title: snapshots.count > 1 ? "\(label) · \(period)" : period,
                                remaining: min(100, max(0, 100 - used)),
                                resetsAt: window["resetsAt"].int.map {
                                    Date(timeIntervalSince1970: Double($0))
                                }))
                    }
                }
                windows = parsed
                refreshedAt = .now
                if parsed.isEmpty { message = "This account hasn’t reported usage limits." }
            } catch is CancellationError {} catch {
                windows = []
                refreshedAt = nil
                message = "Usage couldn’t be refreshed. Try again."
            }
        }
    }
    func cancel() {
        operation?.cancel()
        transport?.stop()
    }
}
