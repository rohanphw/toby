import SwiftUI

struct CLIConnectionView: View {
    let account: AccountConnection
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(account.provider.title).font(.headline)
                    Text(account.status).font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                if account.isBusy {
                    ProgressView().controlSize(.small)
                    Button("Cancel") { account.cancel() }
                } else {
                    Button("Check CLI session") { account.refresh() }
                }
            }
            Text(account.provider.executable?.path ?? "CLI executable not found").font(.caption)
                .foregroundStyle(.secondary).textSelection(.enabled)
            HStack {
                Button("Choose executable…") { account.chooseExecutable() }.disabled(account.isBusy)
                Button("Copy login command") { account.copyLoginCommand() }
            }
            if let error = account.error {
                Text(error).font(.caption).foregroundStyle(.orange).textSelection(.enabled)
            }
        }
    }
}
