import SwiftUI

struct VoicePanel: View {
    let model: AppModel
    @Environment(\.openWindow) private var openWindow
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        VStack(spacing: 22) {
            HStack {
                Text("Toby").font(Theme.editorial(24))
                Spacer()
                Text("⌃ ⌥ Space").font(.system(size: 10, design: .monospaced)).foregroundStyle(
                    Theme.secondary)
            }
            VoiceMark(level: model.voice.level, active: model.voice.phase == .listening)
                .frame(height: 76)
                .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: model.voice.level)
            VStack(spacing: 9) {
                Text(model.voice.phase == .idle ? "What’s on your mind?" : model.voice.phase.rawValue + "…")
                    .font(Theme.editorial(28))
                Text(model.voice.partial.isEmpty ? "A little room to think out loud." : model.voice.partial)
                    .font(.system(size: 13)).foregroundStyle(Theme.secondary).lineLimit(4)
                    .multilineTextAlignment(.center).frame(minHeight: 36)
            }
            if let error = model.voice.error { ErrorNotice(message: error) { model.voice.error = nil } }
            if let notice = model.notice { ErrorNotice(message: notice) { model.notice = nil } }
            if !model.agent.approvals.isEmpty || model.agent.question != nil {
                Button("Toby needs your input — open workspace") {
                    openWindow(id: "main")
                    NSApp.activate(ignoringOtherApps: true)
                }.buttonStyle(QuietButtonStyle())
            }
            HStack(spacing: 14) {
                if model.voice.active {
                    Button("End conversation") {
                        model.voice.stop()
                        if model.agent.activeItemID == model.voice.item?.id { model.agent.stop() }
                    }.buttonStyle(QuietButtonStyle())
                    if model.voice.phase == .listening {
                        Button("Send now") { model.voice.sendNow() }.buttonStyle(.borderedProminent)
                    } else if model.voice.phase == .speaking || model.voice.phase == .thinking {
                        Button("Interrupt") {
                            model.agent.stop(notifyFailure: false)
                            model.voice.interrupt()
                        }.buttonStyle(.borderedProminent)
                    }
                } else {
                    Button {
                        model.startVoice()
                    } label: {
                        Label("Start talking", systemImage: "mic.fill")
                    }.buttonStyle(.borderedProminent).controlSize(.large)
                }
            }
            Button("Open in your workspace") {
                if let item = model.voice.item { model.selected = item }
                openWindow(id: "main")
                NSApp.activate(ignoringOtherApps: true)
            }.buttonStyle(.plain).font(.system(size: 11)).foregroundStyle(Theme.secondary)
        }.padding(28).frame(width: 420).background(WorkspaceBackground()).foregroundStyle(Theme.ink)
            .onAppear { if !model.voice.active { model.startVoice() } }
            .onDisappear {
                if model.voice.active {
                    model.voice.stop()
                    if model.agent.activeItemID == model.voice.item?.id { model.agent.stop() }
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

private struct VoiceMark: View {
    let level: Float
    let active: Bool
    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<17, id: \.self) { index in
                let distance = abs(Double(index - 8)) / 8
                Capsule().fill(Theme.accent.opacity(active ? 0.9 : 0.35))
                    .frame(
                        width: 3,
                        height: active
                            ? 8 + CGFloat((1 - distance) * Double(level) * 65)
                            : 5 + CGFloat((1 - distance) * 18))
            }
        }.accessibilityLabel(active ? "Microphone is listening" : "Microphone is off")
    }
}

struct MenuBarView: View {
    let model: AppModel
    @Environment(\.openWindow) private var openWindow
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Toby").font(Theme.editorial(25))
            if model.meetings.active {
                Label("Recording your meeting", systemImage: "record.circle.fill").foregroundStyle(.red)
                Button("Finish & take notes") { model.finishMeeting() }
            } else if model.voice.active {
                Label(model.voice.phase.rawValue, systemImage: "waveform")
                Button("End conversation") {
                    model.voice.stop()
                    if model.agent.activeItemID == model.voice.item?.id { model.agent.stop() }
                }
            }
            Button("Talk to Toby") {
                openWindow(id: "voice")
                NSApp.activate(ignoringOtherApps: true)
            }
            Button("Record a meeting") {
                model.startMeeting()
                openWindow(id: "main")
            }.disabled(model.meetings.active || model.voice.active)
            Divider()
            Button("Open workspace") {
                openWindow(id: "main")
                NSApp.activate(ignoringOtherApps: true)
            }
            if model.agent.isRunning {
                Text(model.agent.phase).font(.caption)
                Button("Stop current task") {
                    model.agent.stop()
                    if model.voice.active { model.voice.stop() }
                }
            }
            Button("Quit Toby") { NSApp.terminate(nil) }
        }.buttonStyle(.plain).padding(22).frame(width: 275).foregroundStyle(Theme.ink).background(
            Theme.canvas)
    }
}
