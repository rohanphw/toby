import SwiftUI

struct MenuBarView: View {
    let model: AppModel
    @Environment(\.openWindow) private var openWindow
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Toby").font(Theme.heading(25))
            if model.meetings.active {
                Label("Recording your meeting", systemImage: "record.circle.fill").foregroundStyle(.red)
                Button("Finish & take notes") { model.finishMeeting() }
            } else if model.voice.active {
                Label(model.voice.phase.rawValue, systemImage: "waveform")
                Button("End conversation") {
                    model.endVoice()
                }
            }
            Button("Talk to Toby") {
                model.startVoice()
                openWindow(id: "main")
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
