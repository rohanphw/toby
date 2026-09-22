import AVFoundation
import EventKit
import Speech
import SwiftUI

struct OnboardingView: View {
    let model: AppModel
    @Bindable var setup: OnboardingState
    @AppStorage("agentProvider") private var provider = "codex"
    @AppStorage("codexModel") private var codexModel = ""
    @AppStorage("grokModel") private var grokModel = ""
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let steps = ["Your voice", "Files & accounts", "Your intelligence"]
    private var selectedAccount: AccountConnection {
        provider == CLIProvider.grok.rawValue ? model.grokAccount : model.account
    }
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                if let logo = Theme.logo {
                    Image(nsImage: logo).resizable().scaledToFit().frame(width: 54, height: 54)
                        .accessibilityHidden(true)
                }
                Text("Toby").font(Theme.heading(26))
                Spacer()
                Button {
                    model.schedule.google.cancelConnection()
                    setup.finish(.dismissed)
                } label: {
                    Image(systemName: "xmark")
                }
                .buttonStyle(QuietButtonStyle()).accessibilityLabel("Dismiss setup")
                .disabled(setup.busy || calendarBusy)
            }.padding(.horizontal, 38).padding(.top, 16).padding(.bottom, 14)
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    HStack(spacing: 20) {
                        ForEach(steps.indices, id: \.self) { index in
                            Button {
                                setup.step = index
                            } label: {
                                HStack(spacing: 8) {
                                    Text("\(index + 1)").font(.system(size: 11, weight: .semibold))
                                        .frame(width: 24, height: 24)
                                        .background(
                                            index == setup.step ? Color(white: 0.22) : Theme.surface,
                                            in: Circle())
                                    Text(steps[index]).font(.system(size: 13, weight: .medium))
                                }.foregroundStyle(index == setup.step ? Theme.ink : Theme.secondary)
                            }.buttonStyle(.plain).disabled(setup.busy || calendarBusy)
                        }
                    }
                    VStack(alignment: .leading, spacing: 12) {
                        Text(headline).font(Theme.heading(32))
                        Text(detail).font(.system(size: 15)).foregroundStyle(Theme.secondary).lineSpacing(4)
                    }
                    Group {
                        switch setup.step {
                        case 0: permissions
                        case 1: files
                        default: providers
                        }
                    }.id(setup.step).transition(.opacity)
                    if let error = setup.error { ErrorNotice(message: error) { setup.error = nil } }
                }.frame(maxWidth: 720, alignment: .leading).padding(32).frame(maxWidth: .infinity)
            }
            HStack(spacing: 14) {
                Button("Skip setup") {
                    model.schedule.google.cancelConnection()
                    setup.finish(.skipped)
                }.buttonStyle(.plain).foregroundStyle(
                    Theme.secondary)
                Spacer()
                if setup.step > 0 {
                    Button("Back") { setup.step -= 1 }.buttonStyle(QuietButtonStyle())
                }
                Button(setup.step == 2 ? "Finish setup" : "Continue") {
                    if setup.step == 2 {
                        model.schedule.google.cancelConnection()
                        setup.finish(.completed)
                    } else {
                        setup.step += 1
                    }
                }.buttonStyle(PrimaryButtonStyle())
                    .disabled(setup.step == 2 && !selectedAccount.isReady)
            }.padding(28).disabled(setup.busy || calendarBusy)
                .overlay(alignment: .top) { Rectangle().fill(Theme.line).frame(height: 1) }
        }.frame(maxWidth: .infinity, maxHeight: .infinity)
            .foregroundStyle(Theme.ink).background(Theme.canvas)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: setup.step)
            .onAppear { refresh() }
            .onReceive(NotificationCenter.default.publisher(for: NSApplication.didBecomeActiveNotification)) {
                _ in refresh()
            }
    }
    private var headline: String {
        ["Set up voice.", "Bring your world along.", "Connect your intelligence."][setup.step]
    }
    private var detail: String {
        [
            "Set up voice and meeting capture. Each permission is your choice; you can continue without it and enable it later.",
            "Your library stays on this Mac. Optionally connect Google accounts for calendars and files you choose from Drive.",
            "Toby uses your existing Codex or Grok CLI login. Connect either provider to get started; you don’t need both.",
        ][setup.step]
    }
    private var permissions: some View {
        VStack(spacing: 0) {
            SetupRow(
                symbol: "mic", title: "Microphone",
                detail: "For talking to Toby and recording your side of a meeting.", status: micStatus,
                tone: setup.microphone == .authorized
                    ? .success : setup.microphone == .notDetermined ? .warning : .failure,
                action: setup.microphone == .notDetermined ? "Allow microphone" : "System Settings",
                enabled: setup.microphone != .authorized && !setup.busy
            ) {
                Task { await setup.requestMicrophone() }
            }
            SetupRow(
                symbol: "waveform", title: "Speech recognition",
                detail: "Turns speech into text on this Mac. Toby always replies in writing.",
                status: speechStatus,
                tone: setup.speech == .authorized
                    ? .success : setup.speech == .notDetermined ? .warning : .failure,
                action: setup.speech == .notDetermined ? "Allow recognition" : "System Settings",
                enabled: setup.speech != .authorized && !setup.busy
            ) {
                Task { await setup.requestSpeech() }
            }
            SetupRow(
                symbol: "speaker.wave.2", title: "Meeting audio",
                detail:
                    "Optional. Captures audio from other apps during a recording. macOS calls this Screen & System Audio Recording; Toby saves no screen images. A restart may be needed after granting access.",
                status: setup.checkingSystemAudio
                    ? "Checking access…" : setup.systemAudio ? "Access confirmed" : "Access not verified",
                tone: setup.systemAudio ? .success : .warning,
                action: setup.systemAudio ? "Check again" : "Check / enable access", enabled: !setup.busy
            ) { Task { await setup.requestSystemAudio() } }
            if let message = setup.systemAudioMessage {
                ErrorNotice(message: message, tone: .warning)
                Button("Open audio privacy settings") { setup.openPrivacy("Privacy_ScreenCapture") }
                    .buttonStyle(QuietButtonStyle()).padding(.vertical, 10)
            }
            SetupRow(
                symbol: "calendar", title: "Calendar",
                detail:
                    "Optional. Find scheduled calls in your Mac calendars. Automatic recording stays a separate opt-in setting.",
                status: model.schedule.hasAccess ? "Connected" : "Not connected",
                tone: model.schedule.hasAccess
                    ? .success
                    : [.denied, .restricted].contains(EKEventStore.authorizationStatus(for: .event))
                        ? .failure : .warning,
                action: "Connect Calendar", enabled: !model.schedule.hasAccess && !calendarBusy
            ) {
                Task {
                    calendarBusy = true
                    await model.schedule.requestAccess()
                    calendarBusy = false
                    if !model.schedule.hasAccess { setup.openPrivacy("Privacy_Calendars") }
                }
            }
            if let error = model.schedule.error { ErrorNotice(message: error) { model.schedule.error = nil } }
        }
    }
    @State private var calendarBusy = false
    private var files: some View {
        VStack(alignment: .leading, spacing: 18) {
            SetupRow(
                symbol: "internaldrive", title: "Your Toby library",
                detail:
                    "Notes, conversations and recordings are stored in Toby’s own Application Support folder. No extra permission is needed.",
                status: "Ready", tone: .success, action: "Open folder", enabled: true
            ) {
                NSWorkspace.shared.open(AppPaths.root)
            }
            SetupRow(
                symbol: "folder", title: "A folder for attachments",
                detail:
                    "Optional. Choose where the file picker starts when you attach files. This doesn’t import, scan, or share the folder; you still choose each file.",
                status: setup.folderName ?? "Choose when needed",
                tone: setup.folderName == nil ? .warning : .success,
                action: setup.folderName == nil ? "Choose folder" : "Change folder", enabled: !setup.busy
            ) {
                Task { await setup.chooseFolder() }
            }
            CalendarConnectionsView(schedule: model.schedule, showMacCalendars: false)
                .padding(.vertical, 16)
            Text(
                "Toby doesn’t need Full Disk Access. macOS may ask about a protected folder when you choose files there."
            )
            .font(.system(size: 13)).foregroundStyle(Theme.secondary)
        }
    }
    private var providers: some View {
        VStack(alignment: .leading, spacing: 18) {
            ProviderSetupCard(account: model.account)
            ProviderSetupCard(account: model.grokAccount)
            Text("Use for new conversations").font(Theme.heading(18))
            HStack(spacing: 14) {
                ProviderSelector(selection: $provider).frame(width: 230)
                DefaultModelPicker(
                    account: selectedAccount,
                    selection: provider == CLIProvider.grok.rawValue ? $grokModel : $codexModel)
            }
            StatusLabel(
                text:
                    selectedAccount.isReady
                    ? "You’re ready. Any permissions you deferred will be requested when you use that feature."
                    : "Connect the selected provider to finish, or skip setup to explore your local notes.",
                tone: selectedAccount.isReady ? .success : .warning)
        }
    }
    private var micStatus: String {
        switch setup.microphone {
        case .authorized: "Allowed"
        case .denied: "Not allowed"
        case .restricted: "Restricted by this Mac"
        default: "Not requested"
        }
    }
    private var speechStatus: String {
        switch setup.speech {
        case .authorized: "Allowed"
        case .denied: "Not allowed"
        case .restricted: "Restricted by this Mac"
        default: "Not requested"
        }
    }
    private func refresh() {
        setup.refresh()
        model.schedule.refresh()
    }
}

private struct SetupRow: View {
    let symbol: String
    let title: String
    let detail: String
    let status: String
    let tone: StatusTone
    let action: String
    let enabled: Bool
    let perform: () -> Void
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: symbol).font(.system(size: 19, weight: .regular))
                .foregroundStyle(Theme.secondary).frame(width: 28).padding(.top, 2)
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline) {
                    Text(title).font(.system(size: 15, weight: .semibold))
                    Spacer()
                    StatusLabel(text: status, tone: tone)
                }
                Text(detail).font(Theme.caption).foregroundStyle(Theme.secondary)
                    .lineSpacing(3).fixedSize(horizontal: false, vertical: true)
                if enabled || tone != .success {
                    Button(action, action: perform).buttonStyle(QuietButtonStyle()).disabled(!enabled)
                        .padding(.top, 4)
                }
            }.frame(maxWidth: .infinity, alignment: .leading)
        }.padding(.vertical, 22)
            .overlay(alignment: .bottom) { Rectangle().fill(Theme.line).frame(height: 1) }

    }
}

private struct ProviderSetupCard: View {
    let account: AccountConnection
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            CLIConnectionView(account: account, showSetupLink: false)
            if !account.isReady {
                Text(
                    account.provider.executable == nil
                        ? "Install the CLI using the official guide, then sign in from Terminal. Return here and check the connection."
                        : account.isAuthenticated
                            ? "Signed in. Finish loading a model to use this provider; check the error above or retry."
                            : "Sign in from Terminal using the login command above, then check the connection. Your login stays with the CLI."
                )
                .font(.system(size: 13)).foregroundStyle(Theme.secondary)
            }
            if !account.isReady {
                Link("Open \(account.provider.title) setup guide ↗", destination: account.provider.setupURL)
                    .font(Theme.label).foregroundStyle(Theme.accent)
            }
        }.padding(.vertical, 18)
            .overlay(alignment: .bottom) { Rectangle().fill(Theme.line).frame(height: 1) }
    }
}
