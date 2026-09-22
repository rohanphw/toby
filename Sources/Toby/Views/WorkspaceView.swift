import SwiftUI

struct WorkspaceView: View {
    @Bindable var model: AppModel
    @Environment(\.openWindow) private var openWindow
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        VStack(spacing: 0) {
            WorkspaceNavigation(model: model)
            Rectangle().fill(Theme.line).frame(height: 1)
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if let notice = model.notice {
                        ErrorNotice(message: notice, tone: .warning) { model.notice = nil }
                    }
                    if let error = model.library.error {
                        ErrorNotice(message: error) { model.library.error = nil }
                    }
                    if let error = model.agent.error {
                        ErrorNotice(message: error, tone: error == "Stopped" ? .warning : .failure) {
                            model.agent.error = nil
                        }
                    }
                    if let error = model.meetings.error {
                        ErrorNotice(message: error) { model.meetings.error = nil }
                    }
                    if let error = model.voice.error {
                        ErrorNotice(message: error) { model.voice.error = nil }
                    }
                    if model.voice.active, model.selected?.id != model.voice.item?.id {
                        HStack {
                            Label("Voice session active", systemImage: "waveform").foregroundStyle(
                                Theme.accent)
                            Spacer()
                            Button("Return to conversation") { model.openItem(model.voice.item) }
                            Button("End voice") { model.endVoice() }
                        }.buttonStyle(QuietButtonStyle()).surface()
                    }
                    if model.meetings.active { RecordingBanner(model: model) }
                    if let selected = model.selected {
                        ItemDetailView(model: model, item: selected).id(selected.id)
                            .frame(maxWidth: 760).frame(maxWidth: .infinity)
                    } else {
                        switch model.page {
                        case .home: HomeView(model: model)
                        case .library: LibraryView(model: model, memoryOnly: false)
                        case .meetings: MeetingsView(model: model)
                        case .memory: LibraryView(model: model, memoryOnly: true)
                        }
                    }
                }.frame(maxWidth: 920).padding(.horizontal, 48).padding(.top, 36).padding(.bottom, 60).frame(
                    maxWidth: .infinity)
            }
            .id(model.selected?.id.uuidString ?? model.page.rawValue)
            if model.agent.isRunning {
                HStack(spacing: 10) {
                    ProgressView().controlSize(.small)
                    StatusLabel(
                        text: model.agent.phase,
                        tone: model.agent.approvals.isEmpty && model.agent.question == nil
                            ? .neutral : .warning)
                    Spacer()
                    Button("Show work") {
                        model.openItem(model.library.items.first { $0.id == model.agent.activeItemID })
                    }
                    Button("Stop", role: .destructive) {
                        model.agent.stop()
                        if model.voice.active { model.voice.stop() }
                    }
                }.buttonStyle(.borderless).padding(14).background(Theme.surface)
            }
        }
        .disabled(model.onboarding.isPresented)
        .accessibilityHidden(model.onboarding.isPresented)
        .font(.system(size: 14))
        .foregroundStyle(Theme.ink).background(WorkspaceBackground())
        .overlay(alignment: .trailing) {
            if model.showSettings {
                SettingsView(model: model)
                    .frame(width: 430)
                    .background(Theme.drawer)
                    .overlay(alignment: .leading) { Rectangle().fill(Theme.line).frame(width: 1) }
                    .shadow(color: .black.opacity(0.2), radius: 24, x: -12)
                    .transition(.move(edge: .trailing).combined(with: .opacity))
                    .zIndex(1)
            }
        }
        .overlay {
            if model.onboarding.isPresented {
                OnboardingView(model: model, setup: model.onboarding)
            }
        }
        .animation(reduceMotion ? nil : .easeOut(duration: 0.25), value: model.showSettings)
        .background(
            TrackpadNavigation(enabled: model.navigationEnabled) { backward in
                withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) {
                    model.swipeNavigation(backward: backward)
                }
            }
        )
        .frame(minWidth: 880, minHeight: 620)
        .sheet(isPresented: $model.showSearch) { SearchView(model: model) }
        .sheet(item: Binding(get: { model.agent.approvals.first }, set: { _ in })) { approval in
            ApprovalView(agent: model.agent, approval: approval)
        }
        .sheet(item: Binding(get: { model.agent.question }, set: { _ in })) { question in
            QuestionView(agent: model.agent, question: question)
        }
        .onAppear {
            model.revealWorkspace = {
                openWindow(id: "main")
                NSApp.activate(ignoringOtherApps: true)
            }
        }
        .onDisappear { if model.voice.active && !model.backgroundVoice { model.endVoice() } }
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
    var body: some View {
        HStack(spacing: 22) {
            Button {
                model.navigate(to: .home)
            } label: {
                HStack(spacing: 8) {
                    if let logo = Theme.logo {
                        Image(nsImage: logo).resizable().interpolation(.high)
                            .scaledToFit().frame(width: 48, height: 48).accessibilityHidden(true)
                    }
                    Text("Toby").font(Theme.heading(25))
                }
            }.buttonStyle(.plain)
            Rectangle().fill(Theme.line).frame(width: 1, height: 20)
            ForEach(AppModel.Page.allCases, id: \.self) { page in
                Button {
                    model.navigate(to: page)
                } label: {
                    Text(page.rawValue).font(.system(size: 13, weight: .medium))
                        .foregroundStyle(
                            model.page == page && model.selected == nil ? Theme.ink : Theme.secondary)
                }.buttonStyle(.plain)
            }
            Spacer(minLength: 10)
            Button {
                model.goBack()
            } label: {
                Image(systemName: "chevron.left")
            }
            .disabled(!model.canGoBack).help("Back · ⌘[").accessibilityLabel("Go back")
            Button {
                model.goForward()
            } label: {
                Image(systemName: "chevron.right")
            }
            .disabled(!model.canGoForward).help("Forward · ⌘]").accessibilityLabel("Go forward")
            Button {
                model.showSearch = true
            } label: {
                Image(systemName: "magnifyingglass")
            }.help("Search · ⌘K").accessibilityLabel("Search library")
            Button {
                model.startVoice()
            } label: {
                Label("Talk", systemImage: "waveform")
            }
            Button {
                model.showSettings.toggle()
            } label: {
                Image(systemName: "slider.horizontal.3")
            }.accessibilityLabel("Settings")
        }.buttonStyle(.plain).padding(.leading, 80).padding(.trailing, 30).frame(height: 76)
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
                ).font(.system(size: 13, weight: .medium))
                Text("Microphone and Mac audio • saved on this Mac").font(.system(size: 11)).foregroundStyle(
                    Theme.secondary)
            }
            Spacer()
            if let started = model.meetings.startedAt {
                Text(started, style: .timer).monospacedDigit().font(.system(size: 12))
            }
            if model.selected?.id != model.meetings.item?.id {
                Button("Open recording") { model.openItem(model.meetings.item) }.buttonStyle(
                    QuietButtonStyle())
            }
            Button("Finish & take notes") { model.finishMeeting() }.buttonStyle(QuietButtonStyle()).disabled(
                model.meetings.isFinishing)
        }.padding(15).background(Color.red.opacity(0.07), in: RoundedRectangle(cornerRadius: 9))
    }
}
