import ServiceManagement
import SwiftUI

struct SettingsView: View {
    let model: AppModel
    @AppStorage("agentProvider") private var provider = "codex"
    @AppStorage("codexModel") private var codexModel = ""
    @AppStorage("grokModel") private var grokModel = ""
    @AppStorage("speechLocale") private var locale = "en-US"
    @State private var showAutomaticConfirmation = false
    @State private var launchAtLogin = SMAppService.mainApp.status == .enabled
    @State private var error: String?
    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Make it yours").font(Theme.heading(26))
                Spacer()
                Button {
                    model.showSettings = false
                } label: {
                    Image(systemName: "xmark")
                }
                .buttonStyle(QuietButtonStyle()).keyboardShortcut(.cancelAction)
                .accessibilityLabel("Close settings")
            }.padding(24)
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    SettingsSection(title: "Intelligence") {
                        Picker("Provider for new tasks", selection: $provider) {
                            ForEach(CLIProvider.allCases) { Text($0.title).tag($0.rawValue) }
                        }.disabled(model.agent.isRunning)
                        CLIConnectionView(account: model.account)
                        DefaultModelPicker(account: model.account, selection: $codexModel)
                            .disabled(model.agent.isRunning)
                        Divider()
                        CLIConnectionView(account: model.grokAccount)
                        DefaultModelPicker(account: model.grokAccount, selection: $grokModel)
                            .disabled(model.agent.isRunning)
                        Text(
                            "Toby uses the authenticated CLI installations on this Mac. Sign in through the CLI once, then Check CLI session here. Credentials and refresh remain owned by the CLIs; Toby never imports tokens or requests an API key."
                        )
                        .font(.caption).foregroundStyle(.secondary)
                    }
                    SettingsSection(title: "Voice") {
                        Label("You talk. Toby writes back.", systemImage: "text.bubble")
                        Picker("Recognition language", selection: $locale) {
                            Text("English (US)").tag("en-US")
                            Text("English (UK)").tag("en-GB")
                            Text("English (India)").tag("en-IN")
                            Text("Hindi").tag("hi-IN")
                            Text("French").tag("fr-FR")
                            Text("German").tag("de-DE")
                            Text("Spanish").tag("es-ES")
                        }.disabled(model.voice.active || model.meetings.active)
                        LabeledContent("Talk shortcut", value: "Control + Option + Space")
                        Text(
                            "Speech recognition runs on this Mac. Talking mode sends after a short pause; use Send now whenever you’re ready. Replies always appear as text in your thread. Listening resumes after each reply; End voice turns the microphone off."
                        ).font(.caption).foregroundStyle(.secondary)
                    }
                    SettingsSection(title: "Meetings") {
                        HStack {
                            Text(
                                model.schedule.hasAccess
                                    ? "Mac calendars connected" : "Calendar access not granted")
                            Spacer()
                            Button("Connect Calendar") { Task { await model.schedule.requestAccess() } }
                        }
                        Toggle(
                            "Automatically record scheduled calls",
                            isOn: Binding(
                                get: { model.schedule.automaticallyRecord },
                                set: { enabled in
                                    if enabled {
                                        showAutomaticConfirmation = true
                                    } else {
                                        model.schedule.automaticallyRecord = false
                                    }
                                })
                        ).disabled(!model.schedule.hasAccess)
                        Text(
                            "When Toby is open, recording begins at the start of calendar events with Zoom, Google Meet, Teams or Webex links and stops at their scheduled end. This is based on the calendar, not whether you joined the call. Skip individual events in Meetings. Unscheduled calls can be recorded manually."
                        ).font(.caption).foregroundStyle(.secondary)
                        Text(
                            "Meeting recording saves microphone and all Mac audio, excluding Toby, as separate local tracks. macOS may ask for Screen & System Audio Recording access. No screen images are saved. Enable automatic recording only for calls you intend to record, with participants informed."
                        ).font(.caption).foregroundStyle(.secondary)
                        if showAutomaticConfirmation {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Enable automatic recording?").font(.headline)
                                Text(
                                    "While Toby is open, it will capture your microphone and Mac audio during supported calendar calls without asking each time, even if you haven’t joined. Inform participants before recording."
                                ).font(.caption)
                                HStack {
                                    Button("Enable") {
                                        model.schedule.automaticallyRecord = true
                                        showAutomaticConfirmation = false
                                    }.buttonStyle(QuietButtonStyle())
                                    Button("Cancel") { showAutomaticConfirmation = false }.buttonStyle(
                                        QuietButtonStyle())
                                }
                            }.padding(16).background(
                                Theme.accent.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
                        }
                    }
                    SettingsSection(title: "This Mac") {
                        Toggle(
                            "Open Toby at login", isOn: Binding(get: { launchAtLogin }, set: setLaunchAtLogin)
                        )
                        Button("Open local library folder") { NSWorkspace.shared.open(AppPaths.root) }
                        LabeledContent(
                            "Version",
                            value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
                                ?? "0.4.0")
                        Text(
                            "This fresh app has its own library. Existing Toby data is not imported or modified."
                        )
                        .font(.caption).foregroundStyle(.secondary)
                        if let error { Text(error).font(.caption).foregroundStyle(.orange) }
                    }
                }.padding(.horizontal, 24).padding(.bottom, 28)
            }
        }.frame(maxHeight: .infinity).foregroundStyle(Theme.ink)
    }
    private func setLaunchAtLogin(_ enabled: Bool) {
        do {
            if enabled { try SMAppService.mainApp.register() } else { try SMAppService.mainApp.unregister() }
            launchAtLogin = SMAppService.mainApp.status == .enabled
        } catch { self.error = error.localizedDescription }
    }
}

private struct SettingsSection<Content: View>: View {
    let title: String
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(title).font(Theme.heading(19)).foregroundStyle(Theme.accent)
            content
        }.font(.system(size: 13)).frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 16).overlay(alignment: .top) { Rectangle().fill(Theme.line).frame(height: 1) }
    }
}
