import SwiftUI

struct VoiceCaptureView: View {
    let model: AppModel
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var appeared = false
    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            HStack(spacing: 24) {
                VoiceMark(level: model.voice.level, active: model.voice.phase == .listening)
                    .frame(width: 128, height: 64)
                    .scaleEffect(appeared ? 1 : 0.65)
                    .animation(reduceMotion ? nil : .easeOut(duration: 0.12), value: model.voice.level)
                VStack(alignment: .leading, spacing: 6) {
                    Text(model.voice.phase.rawValue).font(Theme.heading(24))
                    Text(
                        model.voice.phase == .thinking
                            ? "Toby’s reply will appear below." : "Take your time. Toby replies in writing."
                    )
                    .font(.system(size: 13)).foregroundStyle(Theme.secondary)
                }
                Spacer(minLength: 0)
            }
            if !model.voice.transcript.isEmpty {
                Text(model.voice.transcript).font(.system(size: 17)).lineSpacing(5)
                    .textSelection(.enabled).fixedSize(horizontal: false, vertical: true)
            }
            HStack(spacing: 12) {
                Circle().fill(model.voice.phase == .listening ? Theme.accent : Theme.secondary).frame(
                    width: 6, height: 6)
                Text(
                    model.voice.phase == .listening
                        ? "Microphone on · sends after a pause" : "Microphone paused"
                )
                .font(.system(size: 12)).foregroundStyle(Theme.secondary)
                Spacer()
                if model.voice.phase == .listening {
                    Button("Send now") { model.voice.sendNow() }.buttonStyle(QuietButtonStyle())
                } else if model.voice.phase == .thinking {
                    Button("Interrupt") {
                        model.agent.stop(notifyFailure: false)
                        model.voice.interrupt()
                    }.buttonStyle(QuietButtonStyle())
                }
                Button("End voice") { model.endVoice() }.buttonStyle(QuietButtonStyle())
                    .disabled(model.voice.phase == .stopping)
            }
        }
        .padding(26).background(Theme.accent.opacity(0.07), in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.accent.opacity(0.18)))
        .opacity(appeared ? 1 : 0).offset(y: appeared ? 0 : 12)
        .onAppear {
            withAnimation(reduceMotion ? nil : .easeOut(duration: 0.28)) { appeared = true }
        }
    }
}

struct VoiceMark: View {
    var level: Float = 0
    var active = false
    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<17, id: \.self) { index in
                let shape = 1 - abs(Double(index - 8)) / 9
                Capsule().fill(Theme.accent.opacity(active ? 1 : 0.65))
                    .frame(width: 4, height: 7 + shape * (active ? 14 + Double(level) * 55 : 34))
            }
        }.accessibilityHidden(true)
    }
}
