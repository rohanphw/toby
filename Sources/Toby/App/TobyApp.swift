import SwiftUI

@MainActor final class AppDelegate: NSObject, NSApplicationDelegate {
    var model: AppModel?
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        guard let model else { return .terminateNow }
        Task {
            await model.shutdown()
            sender.reply(toApplicationShouldTerminate: true)
        }
        return .terminateLater
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }
}

@main struct TobyApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @State private var model: AppModel?
    private let startupError: String?
    init() {
        do {
            let model = try AppModel()
            _model = State(initialValue: model)
            startupError = nil
        } catch {
            _model = State(initialValue: nil)
            startupError = error.localizedDescription
        }
    }
    var body: some Scene {
        Window("Toby", id: "main") {
            Group {
                if let model {
                    WorkspaceView(model: model)
                        .task {
                            delegate.model = model
                            model.startServices()
                        }
                } else {
                    ContentUnavailableView(
                        "Your library couldn’t open", systemImage: "externaldrive.badge.exclamationmark",
                        description: Text(startupError ?? "Unknown storage error"))
                }
            }.preferredColorScheme(.dark).tint(Theme.accent)
        }
        .defaultSize(width: 1120, height: 780)
        .windowStyle(.hiddenTitleBar)
        .commands {
            CommandGroup(replacing: .appSettings) {
                Button("Settings…") { model?.presentSettings() }.keyboardShortcut(",")
            }
            CommandGroup(replacing: .newItem) {
                Button("New Note") { model?.newNote() }.keyboardShortcut("n")
                Button("Search Your Library") { model?.showSearch = true }.keyboardShortcut("k")
                    .disabled(model?.onboarding.isPresented == true)
            }
        }
        MenuBarExtra {
            if let model { MenuBarView(model: model).preferredColorScheme(.dark) }
        } label: {
            Image(
                systemName: model?.meetings.active == true
                    ? "record.circle" : model?.voice.active == true ? "waveform" : "sparkle"
            )
            .accessibilityLabel("Toby")
        }.menuBarExtraStyle(.window)
    }
}
