import SwiftUI

struct AppUpdateView: View {
    @ObservedObject var updater: AppUpdater
    let busy: Bool
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("App updates").font(Theme.heading(18))
            Text(
                "Toby \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "development")"
            )
            .font(Theme.caption).foregroundStyle(Theme.secondary)
            Text("Check for a new release, then download, install and restart Toby here.")
                .font(Theme.caption).foregroundStyle(Theme.secondary)
            Button("Check for updates…") { updater.check() }
                .disabled(busy || !updater.checkEnabled)
            if busy || updater.waitingForWork {
                Text("Finish the current recording, capture, or task before installing an update.")
                    .font(Theme.caption).foregroundStyle(Theme.secondary)
            }
            if let error = updater.error { ErrorNotice(message: error) }
            Link("Release notes ↗", destination: URL(string: "https://github.com/rohanphw/toby/releases")!)
                .font(Theme.caption)
        }
    }
}
