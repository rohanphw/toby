import SwiftUI

struct ProviderUsageView: View {
    let account: AccountConnection
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Usage").font(Theme.label)
                Spacer()
                if account.usage.isLoading { ProgressView().controlSize(.small) }
                if account.provider == .codex {
                    Button {
                        account.usage.refresh(provider: account.provider)
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(account.usage.isLoading || !account.isAuthenticated).help("Refresh usage")
                }
            }
            if !account.isAuthenticated {
                Text("Connect your account to see usage.").font(Theme.caption).foregroundStyle(
                    Theme.secondary)
            } else {
                ForEach(account.usage.windows) { window in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(window.title)
                            Spacer()
                            Text("\(Int(window.remaining))% left").monospacedDigit()
                        }.font(Theme.caption)
                        GeometryReader { geometry in
                            Capsule().fill(Theme.line)
                                .overlay(alignment: .leading) {
                                    Capsule().fill(
                                        window.remaining <= 10
                                            ? Theme.failure
                                            : window.remaining <= 25 ? Theme.warning : Theme.success
                                    )
                                    .frame(width: geometry.size.width * window.remaining / 100)
                                }
                        }.frame(height: 4)
                        if let reset = window.resetsAt {
                            Text("Resets \(reset.formatted(date: .abbreviated, time: .shortened))")
                                .font(.system(size: 11)).foregroundStyle(Theme.secondary)
                        }
                    }
                }
                if let message = account.usage.message {
                    Text(message).font(Theme.caption).foregroundStyle(Theme.secondary)
                }
                if account.provider == .grok {
                    Link("View Grok account ↗", destination: URL(string: "https://grok.com")!).font(
                        Theme.caption)
                } else if let refreshed = account.usage.refreshedAt {
                    Text("Account-wide · Updated \(refreshed.formatted(date: .omitted, time: .shortened))")
                        .font(.system(size: 11)).foregroundStyle(Theme.secondary)
                }
            }
        }.task(id: account.isAuthenticated) {
            guard account.isAuthenticated else { return }
            repeat {
                account.usage.refresh(provider: account.provider)
                if account.provider == .grok { return }
                try? await Task.sleep(for: .seconds(60))
            } while !Task.isCancelled
        }
    }
}
