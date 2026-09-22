import SwiftUI

struct CLIConnectionView: View {
    let account: AccountConnection
    var showSetupLink = true
    @State private var showDetails = false
    private var tone: StatusTone {
        if account.isBusy { return .neutral }
        if account.error != nil { return .failure }
        return account.isReady ? .success : .warning
    }
    private var status: String {
        if account.isBusy { return "Checking connection…" }
        if account.error != nil { return "Connection failed" }
        return account.isReady ? "Connected" : account.isAuthenticated ? "Choose a model" : "Not connected"
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(account.provider.title).font(.system(size: 18, weight: .semibold))
                Spacer()
                StatusLabel(text: status, tone: tone)
            }
            if account.isReady {
                Text(account.status).font(Theme.caption).foregroundStyle(Theme.secondary)
            }
            if let error = account.error { ErrorNotice(message: error) }
            HStack(spacing: 12) {
                if account.isBusy {
                    ProgressView().controlSize(.small)
                    Button("Cancel check") { account.cancel() }.buttonStyle(QuietButtonStyle())
                } else if !account.isReady {
                    Button("Check connection") { account.refresh() }.buttonStyle(QuietButtonStyle())
                    Button("Copy login command") { account.copyLoginCommand() }.buttonStyle(
                        QuietButtonStyle())
                }
                Button(showDetails ? "Hide details" : "Connection details") { showDetails.toggle() }
                    .buttonStyle(.plain).font(Theme.caption).foregroundStyle(Theme.secondary)
            }
            if showDetails {
                VStack(alignment: .leading, spacing: 12) {
                    Text(account.provider.executable?.path ?? "CLI executable not found")
                        .font(Theme.caption).foregroundStyle(Theme.secondary).textSelection(.enabled)
                        .fixedSize(horizontal: false, vertical: true)
                    HStack {
                        Button("Choose executable…") { account.chooseExecutable() }.disabled(account.isBusy)
                        if account.isReady { Button("Check again") { account.refresh() } }
                    }.buttonStyle(QuietButtonStyle())
                }
            }
            if showSetupLink, !account.isReady {
                Link("\(account.provider.title) setup guide ↗", destination: account.provider.setupURL)
                    .font(Theme.label).foregroundStyle(Theme.accent)
            }
        }
    }
}
