import SwiftUI

struct WorkspaceView: View {
    @Bindable var model: AppModel
    @Environment(\.openWindow) private var openWindow
    @Environment(\.openSettings) private var openSettings
    var body: some View {
        VStack(spacing: 0) {
            WorkspaceNavigation(model: model)
            Rectangle().fill(Theme.line).frame(height: 1)
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if let notice = model.notice { ErrorNotice(message: notice) { model.notice = nil } }
                    if let error = model.library.error {
                        ErrorNotice(message: error) { model.library.error = nil }
                    }
                    if let error = model.agent.error {
                        ErrorNotice(message: error) { model.agent.error = nil }
                    }
                    if let error = model.meetings.error {
                        ErrorNotice(message: error) { model.meetings.error = nil }
                    }
                    if model.meetings.active { RecordingBanner(model: model) }
                    if let selected = model.selected {
                        ItemDetailView(model: model, item: selected).id(selected.id)
                    } else {
                        switch model.page {
                        case .home: HomeView(model: model)
                        case .library: LibraryView(model: model, memoryOnly: false)
                        case .meetings: MeetingsView(model: model)
                        case .memory: LibraryView(model: model, memoryOnly: true)
                        }
                    }
                }.frame(maxWidth: 1040).padding(.horizontal, 48).padding(.top, 36).padding(.bottom, 60).frame(
                    maxWidth: .infinity)
            }
            if model.agent.isRunning {
                HStack(spacing: 10) {
                    ProgressView().controlSize(.small)
                    Text(model.agent.phase).font(.system(size: 12))
                    Spacer()
                    Button("Show work") {
                        model.selected = model.library.items.first { $0.id == model.agent.activeItemID }
                    }
                    Button("Stop", role: .destructive) {
                        model.agent.stop()
                        if model.voice.active { model.voice.stop() }
                    }
                }.buttonStyle(.borderless).padding(14).background(Theme.surface)
            }
        }
        .foregroundStyle(Theme.ink).background(WorkspaceBackground())
        .frame(minWidth: 880, minHeight: 620)
        .sheet(isPresented: $model.showSearch) { SearchView(model: model) }
        .sheet(item: Binding(get: { model.agent.approvals.first }, set: { _ in })) { approval in
            ApprovalView(agent: model.agent, approval: approval)
        }
        .sheet(item: Binding(get: { model.agent.question }, set: { _ in })) { question in
            QuestionView(agent: model.agent, question: question)
        }
        .onAppear {
            model.openVoiceWindow = {
                openWindow(id: "voice")
                NSApp.activate(ignoringOtherApps: true)
            }
        }
        .onChange(of: model.agent.error) { _, error in
            if let error, model.voice.active {
                model.voice.error = error
                model.voice.stop()
            }
        }
    }
}

private struct WorkspaceNavigation: View {
    @Bindable var model: AppModel
    @Environment(\.openWindow) private var openWindow
    @Environment(\.openSettings) private var openSettings
    var body: some View {
        HStack(spacing: 26) {
            Button {
                model.selected = nil
                model.page = .home
            } label: {
                Text("Toby").font(Theme.editorial(25))
            }.buttonStyle(.plain)
            Rectangle().fill(Theme.line).frame(width: 1, height: 20)
            ForEach(AppModel.Page.allCases, id: \.self) { page in
                Button {
                    model.selected = nil
                    model.page = page
                } label: {
                    Text(page.rawValue).font(.system(size: 12, weight: .medium))
                        .foregroundStyle(
                            model.page == page && model.selected == nil ? Theme.ink : Theme.secondary)
                }.buttonStyle(.plain)
            }
            Spacer(minLength: 10)
            Button {
                model.showSearch = true
            } label: {
                Image(systemName: "magnifyingglass")
            }.help("Search · ⌘K").accessibilityLabel("Search library")
            Button {
                openWindow(id: "voice")
            } label: {
                Label("Talk", systemImage: "waveform")
            }.keyboardShortcut(" ", modifiers: [.control, .option])
            Button {
                openSettings()
            } label: {
                Image(systemName: "slider.horizontal.3")
            }.accessibilityLabel("Settings")
        }.buttonStyle(.plain).padding(.leading, 80).padding(.trailing, 30).frame(height: 64)
    }
}

private struct RecordingBanner: View {
    let model: AppModel
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "record.circle.fill").foregroundStyle(.red)
            VStack(alignment: .leading, spacing: 3) {
                Text(
                    model.meetings.isStarting
                        ? "Preparing recording…" : "Recording · \(model.meetings.item?.title ?? "Meeting")"
                ).font(.system(size: 12, weight: .medium))
                Text("Microphone and Mac audio • saved on this Mac").font(.system(size: 11)).foregroundStyle(
                    Theme.secondary)
            }
            Spacer()
            if let started = model.meetings.startedAt {
                Text(started, style: .timer).monospacedDigit().font(.system(size: 12))
            }
            Button("Finish & take notes") { model.finishMeeting() }.buttonStyle(QuietButtonStyle()).disabled(
                model.meetings.isFinishing)
        }.padding(15).background(Color.red.opacity(0.07), in: RoundedRectangle(cornerRadius: 9))
    }
}
