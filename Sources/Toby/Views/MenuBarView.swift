import SwiftUI

struct MenuBarView: View {
    let model: AppModel
    @Environment(\.openWindow) private var openWindow
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Toby").font(Theme.heading(25))
                Spacer()
                if model.voice.active {
                    StatusLabel(
                        text: model.voice.phase.rawValue,
                        tone: model.voice.phase == .listening ? .success : .neutral)
                }
            }
            if model.meetings.active {
                Label("Recording your meeting", systemImage: "record.circle.fill").foregroundStyle(
                    Theme.failure)
                Button("Finish & take notes") { model.finishMeeting() }.buttonStyle(QuietButtonStyle())
            } else if model.voice.active {
                if !model.voice.transcript.isEmpty {
                    Text(model.voice.transcript).font(Theme.caption).foregroundStyle(Theme.secondary)
                        .lineLimit(4)
                }
                HStack {
                    Button("Send now") { model.voice.sendNow() }
                        .disabled(model.voice.phase != .listening || model.voice.transcript.isEmpty)
                    Button("End voice") { model.endVoice() }
                        .disabled(model.voice.phase == .stopping)
                }.buttonStyle(QuietButtonStyle())
            } else {
                Button {
                    model.startVoice(inBackground: true)
                } label: {
                    Label("Start talking", systemImage: "mic.fill").frame(maxWidth: .infinity)
                }.buttonStyle(PrimaryButtonStyle()).disabled(model.agent.isRunning)
                Text(
                    "Talk while you work. Toby stays in the menu bar and replies in writing. End voice turns the microphone off."
                )
                .font(Theme.caption).foregroundStyle(Theme.secondary)
            }
            if let error = model.voice.error { ErrorNotice(message: error) }
            if let notice = model.notice {
                ErrorNotice(message: notice, tone: .warning) { model.notice = nil }
            }
            if let item = model.voice.item {
                if let reply = item.orderedMessages.last(where: { $0.role == "assistant" }),
                    !reply.text.isEmpty
                {
                    ScrollView {
                        Text(reply.text).font(Theme.body).textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }.frame(maxHeight: 180)
                }
                Button("Open conversation") {
                    model.openItem(item)
                    showWorkspace()
                }.buttonStyle(QuietButtonStyle())
            }
            if !model.agent.approvals.isEmpty || model.agent.question != nil {
                StatusLabel(text: "Toby needs your input in the workspace.", tone: .warning)
            }
            Divider()
            Button("Record a meeting") {
                model.startMeeting()
                openWindow(id: "main")
            }.disabled(model.meetings.active || model.voice.active)
            Button("Quick capture") {
                model.beginCapture()
                showWorkspace()
            }
            Button("Open workspace") { showWorkspace() }
            if model.agent.isRunning {
                Text(model.agent.phase).font(.caption).foregroundStyle(Theme.secondary)
                Button("Stop current task") {
                    model.agent.stop()
                    if model.voice.active { model.endVoice() }
                }
            }
            Button("Quit Toby") { NSApp.terminate(nil) }
        }.buttonStyle(.plain).padding(22).frame(width: 340).foregroundStyle(Theme.ink).background(
            Theme.canvas)
    }
    private func showWorkspace() {
        openWindow(id: "main")
        NSApp.activate(ignoringOtherApps: true)
    }
}
