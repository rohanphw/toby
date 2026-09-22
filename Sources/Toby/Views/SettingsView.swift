import ServiceManagement
import SwiftUI

struct SettingsView: View {
    let model: AppModel
    @AppStorage("agentProvider") private var provider = "codex"
    @AppStorage("codexModel") private var codexModel = ""
    @AppStorage("speechLocale") private var locale = "en-US"
    @AppStorage("spokenReplies") private var spokenReplies = true
    @State private var showAutomaticConfirmation = false
    @State private var launchAtLogin = SMAppService.mainApp.status == .enabled
    @State private var error: String?
    var body: some View {
        Form {
            Section("Intelligence") {
                Picker("Provider for new tasks", selection: $provider) {
                    ForEach(CLIProvider.allCases) { Text($0.title).tag($0.rawValue) }
                }.disabled(model.agent.isRunning)
                CLIConnectionView(account: model.account)
                Picker("Codex model", selection: $codexModel) {
                    Text("CLI default").tag("")
                    ForEach(model.account.models) { Text($0.name).tag($0.id) }
                    if !codexModel.isEmpty, !model.account.models.contains(where: { $0.id == codexModel }) {
                        Text(codexModel).tag(codexModel)
                    }
                }
                Divider()
                CLIConnectionView(account: model.grokAccount)
                Text(
                    "Toby uses the authenticated CLI installations on this Mac. Sign in through the CLI once, then Check CLI session here. Credentials and refresh remain owned by the CLIs; Toby never imports tokens or requests an API key."
                )
                .font(.caption).foregroundStyle(.secondary)
            }
            Section("Voice") {
                Toggle("Speak Toby’s replies", isOn: $spokenReplies)
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
                    "Speech recognition runs on this Mac. Talking mode sends after a short pause; use Send now whenever you’re ready. Spoken replies pause the microphone to avoid feedback. Use Interrupt to speak again."
                ).font(.caption).foregroundStyle(.secondary)
            }
            Section {
                HStack {
                    Text(model.schedule.hasAccess ? "Mac calendars connected" : "Calendar access not granted")
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
            } header: {
                Text("Meetings")
            }
            Section("This Mac") {
                Toggle("Open Toby at login", isOn: Binding(get: { launchAtLogin }, set: setLaunchAtLogin))
                Button("Open local library folder") { NSWorkspace.shared.open(AppPaths.root) }
                LabeledContent("Version", value: "0.2.1")
                Text("This fresh app has its own library. Existing Toby data is not imported or modified.")
                    .font(.caption).foregroundStyle(.secondary)
                if let error { Text(error).font(.caption).foregroundStyle(.orange) }
            }
        }.formStyle(.grouped).frame(width: 650, height: 740)
            .confirmationDialog(
                "Automatically record scheduled calls?", isPresented: $showAutomaticConfirmation
            ) {
                Button("Enable automatic recording") { model.schedule.automaticallyRecord = true }
            } message: {
                Text(
                    "While Toby is open, it will capture your microphone and Mac audio during supported calendar calls without asking each time. You can skip calls, stop recording, or turn this off at any time."
                )
            }
    }
    private func setLaunchAtLogin(_ enabled: Bool) {
        do {
            if enabled { try SMAppService.mainApp.register() } else { try SMAppService.mainApp.unregister() }
            launchAtLogin = SMAppService.mainApp.status == .enabled
        } catch { self.error = error.localizedDescription }
    }
}
