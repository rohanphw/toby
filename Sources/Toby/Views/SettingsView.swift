import ServiceManagement
import SwiftUI

struct SettingsView: View {
    let model: AppModel
    private enum Section: String, CaseIterable {
        case models = "Models"
        case capture = "Capture"
        case calendars = "Calendars"
        case general = "General"
    }
    @State private var section: Section = .models
    @AppStorage("agentProvider") private var provider = "codex"
    @AppStorage("codexModel") private var codexModel = ""
    @AppStorage("grokModel") private var grokModel = ""
    @AppStorage("speechLocale") private var locale = "en-US"
    @State private var languageOpen = false
    @State private var showAutomaticConfirmation = false
    @State private var launchAtLogin = SMAppService.mainApp.status == .enabled
    @State private var error: String?
    private let languages = [
        ("en-US", "English (US)"), ("en-GB", "English (UK)"), ("en-IN", "English (India)"),
        ("hi-IN", "Hindi"), ("fr-FR", "French"), ("de-DE", "German"), ("es-ES", "Spanish"),
    ]
    private var account: AccountConnection { provider == "grok" ? model.grokAccount : model.account }
    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Settings").font(Theme.heading(27))
                    Text("A little more you.").font(Theme.caption).foregroundStyle(Theme.secondary)
                }
                Spacer()
                Button {
                    model.showSettings = false
                } label: {
                    Image(systemName: "xmark")
                }
                .buttonStyle(QuietButtonStyle()).keyboardShortcut(.cancelAction).accessibilityLabel(
                    "Close settings")
            }.padding(24)
            HStack(spacing: 0) {
                ForEach(Section.allCases, id: \.self) { item in
                    Button {
                        section = item
                    } label: {
                        Text(item.rawValue).font(Theme.label).foregroundStyle(
                            section == item ? Theme.ink : Theme.secondary
                        )
                        .frame(maxWidth: .infinity).padding(.bottom, 13)
                        .overlay(alignment: .bottom) {
                            Rectangle().fill(section == item ? Theme.ink : .clear).frame(height: 2)
                        }
                    }.buttonStyle(.plain).accessibilityAddTraits(section == item ? .isSelected : [])
                }
            }.padding(.horizontal, 24)
            Rectangle().fill(Theme.line).frame(height: 1)
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    switch section {
                    case .models: models
                    case .capture: capture
                    case .calendars: calendars
                    case .general: general
                    }
                }.frame(maxWidth: .infinity, alignment: .leading).padding(24)
            }.id(section)
        }.frame(maxHeight: .infinity).foregroundStyle(Theme.ink).font(Theme.body)
            .buttonStyle(QuietButtonStyle())
    }
    private var models: some View {
        VStack(alignment: .leading, spacing: 24) {
            SettingsGroup("Think with") {
                ProviderSelector(selection: $provider).disabled(model.agent.isRunning)
                Text("Your default for new conversations.").font(Theme.caption).foregroundStyle(
                    Theme.secondary)
            }
            CLIConnectionView(account: account)
            DefaultModelPicker(account: account, selection: provider == "grok" ? $grokModel : $codexModel)
                .disabled(model.agent.isRunning)
            Divider()
            ProviderUsageView(account: account).id(provider)
            DisclosureGroup("How accounts connect") {
                Text(
                    "Toby uses your existing Codex or Grok sign-in on this Mac. Account credentials stay with their command-line apps."
                )
                .font(Theme.caption).foregroundStyle(Theme.secondary).padding(.top, 8)
            }.font(Theme.caption).foregroundStyle(Theme.secondary)
        }
    }
    private var capture: some View {
        VStack(alignment: .leading, spacing: 28) {
            SettingsGroup("Voice") {
                Text("You talk. Toby writes back.").font(Theme.caption).foregroundStyle(Theme.secondary)
                HStack {
                    Text("Language").font(Theme.label)
                    Spacer()
                    Button {
                        languageOpen.toggle()
                    } label: {
                        HStack(spacing: 10) {
                            Text(languages.first(where: { $0.0 == locale })?.1 ?? locale)
                            Image(systemName: "chevron.down").font(.system(size: 9))
                        }
                    }.disabled(model.voice.active || model.meetings.active)
                        .popover(isPresented: $languageOpen, arrowEdge: .bottom) {
                            VStack(spacing: 3) {
                                ForEach(languages, id: \.0) { language in
                                    Button {
                                        locale = language.0
                                        languageOpen = false
                                    } label: {
                                        HStack {
                                            Text(language.1)
                                            Spacer()
                                            if locale == language.0 { Image(systemName: "checkmark") }
                                        }
                                        .padding(10).contentShape(Rectangle())
                                    }.buttonStyle(.plain)
                                }
                            }.font(Theme.label).padding(8).frame(width: 220).background(Theme.drawer)
                        }
                }
                LabeledContent("Open Talk", value: "⌃ ⌥ Space").font(Theme.caption)
                Text("Use Start talking in the menu bar to keep working in your current app.")
                    .font(Theme.caption).foregroundStyle(Theme.secondary)
            }
            SettingsGroup("Meetings") {
                SettingsToggle(
                    "Meeting reminders", detail: "A nudge before your next call.",
                    isOn: Binding(
                        get: { model.schedule.remindersEnabled },
                        set: { model.schedule.remindersEnabled = $0 }))
                SettingsToggle(
                    "Detect calls", detail: "Offer to take notes when a call app uses your mic.",
                    isOn: Binding(
                        get: { model.callDetection.enabled }, set: { model.callDetection.enabled = $0 }))
                if model.callDetection.unavailable {
                    StatusLabel(text: "Call detection is unavailable on this Mac.", tone: .warning)
                }
                SettingsToggle(
                    "Record automatically",
                    detail: "Start and stop at calendar times, even if you haven’t joined.",
                    isOn: Binding(
                        get: { model.schedule.automaticallyRecord },
                        set: { enabled in
                            if enabled {
                                showAutomaticConfirmation = true
                            } else {
                                model.schedule.automaticallyRecord = false
                            }
                        })
                ).disabled(!model.schedule.hasCalendarConnection)
                if showAutomaticConfirmation {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Record scheduled calls?").font(Theme.label)
                        Text(
                            "Toby will capture your microphone and Mac audio without asking each time. Let participants know before recording."
                        )
                        .font(Theme.caption).foregroundStyle(Theme.secondary)
                        HStack {
                            Button("Enable") {
                                model.schedule.automaticallyRecord = true
                                showAutomaticConfirmation = false
                            }
                            Button("Cancel") { showAutomaticConfirmation = false }
                        }
                    }.padding(14).background(Theme.surface, in: RoundedRectangle(cornerRadius: 10))
                }
            }
            DisclosureGroup("Recording details") {
                Text(
                    "Recordings stay on this Mac. Meeting notes send transcript text to your selected provider. System audio can include other apps. No screen images are saved. Call detection is approximate and may miss muted calls; it never starts a recording by itself."
                )
                .font(Theme.caption).foregroundStyle(Theme.secondary).padding(.top, 8)
            }.font(Theme.caption)
            Button("Manage permissions") { model.reopenSetup() }
        }
    }
    private var calendars: some View {
        SettingsGroup("Your calendars") { CalendarConnectionsView(schedule: model.schedule) }
    }
    private var general: some View {
        VStack(alignment: .leading, spacing: 26) {
            SettingsGroup("At home on your Mac") {
                SettingsToggle(
                    "Launch at login", detail: "Keep Toby close by.",
                    isOn: Binding(get: { launchAtLogin }, set: setLaunchAtLogin))
                Button("Open library folder") { NSWorkspace.shared.open(AppPaths.root) }
                Button("Reopen setup") { model.reopenSetup() }
            }
            SettingsGroup("Navigation") {
                LabeledContent("Back / forward", value: "⌘[ / ⌘]").font(Theme.caption)
                Text(
                    "Swipe sideways with two fingers to navigate. Vertical scrolls and text editors keep their usual behavior."
                )
                .font(Theme.caption).foregroundStyle(Theme.secondary)
            }
            Divider()
            LabeledContent(
                "Toby", value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.9.2"
            )
            .font(Theme.caption).foregroundStyle(Theme.secondary)
            DisclosureGroup("App details") {
                VStack(alignment: .leading, spacing: 10) {
                    Text("\(Bundle.main.bundleURL.path)\n\(Bundle.main.bundleIdentifier ?? "Unknown")")
                        .textSelection(.enabled)
                    Button("Show in Finder") {
                        NSWorkspace.shared.activateFileViewerSelecting([Bundle.main.bundleURL])
                    }
                }.font(Theme.caption).foregroundStyle(Theme.secondary).padding(.top, 8)
            }.font(Theme.caption)
            if let error { ErrorNotice(message: error) }
        }
    }
    private func setLaunchAtLogin(_ enabled: Bool) {
        do {
            if enabled { try SMAppService.mainApp.register() } else { try SMAppService.mainApp.unregister() }
            launchAtLogin = SMAppService.mainApp.status == .enabled
        } catch { self.error = error.localizedDescription }
    }
}

private struct SettingsGroup<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content
    init(_ title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(title).font(Theme.heading(18))
            content
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}
private struct SettingsToggle: View {
    let title: String
    let detail: String
    @Binding var isOn: Bool
    init(_ title: String, detail: String, isOn: Binding<Bool>) {
        self.title = title
        self.detail = detail
        _isOn = isOn
    }
    var body: some View {
        Toggle(isOn: $isOn) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(Theme.label)
                Text(detail).font(Theme.caption).foregroundStyle(Theme.secondary)
            }.padding(.trailing, 10)
        }.toggleStyle(.switch).controlSize(.small).padding(.vertical, 3)
    }
}
