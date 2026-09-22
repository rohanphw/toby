import SwiftUI

struct ConversationContent: View {
    let messages: [Message]
    var body: some View {
        LazyVStack(alignment: .leading, spacing: 26) {
            ForEach(messages) { message in
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        if message.role == "system" {
                            StatusLabel(
                                text: message.state == "failed" && message.text != "Stopped"
                                    ? "Task failed" : "Needs attention",
                                tone: message.state == "failed" && message.text != "Stopped"
                                    ? .failure : .warning)
                        } else {
                            Image(systemName: message.role == "user" ? "person.crop.circle" : "sparkle")
                                .foregroundStyle(Theme.secondary)
                            Text(message.role == "user" ? "You" : "Toby").font(Theme.label)
                        }
                        if message.state == "streaming" { ProgressView().controlSize(.mini) }
                        if message.state == "interrupted" {
                            StatusLabel(text: "Interrupted", tone: .warning)
                        }
                        Spacer()
                        Button {
                            NSPasteboard.general.clearContents()
                            NSPasteboard.general.setString(message.text, forType: .string)
                        } label: {
                            Image(systemName: "doc.on.doc")
                        }
                        .buttonStyle(.plain).foregroundStyle(Theme.secondary).accessibilityLabel(
                            "Copy response")
                    }
                    MarkdownDocument(text: message.text)
                        .foregroundStyle(
                            message.state == "failed" && message.text != "Stopped" ? Theme.failure : Theme.ink
                        )
                }
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity, alignment: .leading)

            }
        }
    }
}

struct ApprovalView: View {
    let agent: AgentSession
    let approval: RuntimeApproval
    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            Image(systemName: "hand.raised").font(.system(size: 26)).foregroundStyle(Theme.warning)
            Text(approval.title).font(Theme.heading(29))
            Text("Toby needs your permission to continue this action.").foregroundStyle(Theme.secondary)
            ScrollView {
                Text(
                    approval.detail.isEmpty
                        ? "The runtime requested permission beyond the current workspace." : approval.detail
                ).font(.system(size: 12, design: .monospaced)).textSelection(.enabled).frame(
                    maxWidth: .infinity, alignment: .leading)
            }.frame(maxHeight: 220)
            if approval.method == "session/request_permission", approval.allowOptionID == nil {
                StatusLabel(text: "This provider has not offered an Allow decision.", tone: .warning)
            }
            HStack {
                Button("Stop task", role: .destructive) { agent.stop() }
                Spacer()
                Button("Deny") { agent.resolve(approval, allow: false) }
                Button("Allow once") { agent.resolve(approval, allow: true) }.buttonStyle(
                    PrimaryButtonStyle()
                )
                .disabled(
                    approval.method == "session/request_permission" && approval.allowOptionID == nil)
            }
        }.padding(30).frame(width: 560).background(Theme.canvas).foregroundStyle(Theme.ink)
            .interactiveDismissDisabled()
    }
}

struct QuestionView: View {
    let agent: AgentSession
    let question: RuntimeQuestion
    @State private var answers: [String: String] = [:]
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("A quick question.").font(Theme.heading(30))
            ForEach(question.questions) { q in
                VStack(alignment: .leading, spacing: 10) {
                    Text(q.prompt)
                    ForEach(q.options, id: \.self) { option in
                        Button(option) { answers[q.id] = option }.buttonStyle(QuietButtonStyle())
                    }
                    TextField(
                        "Your answer",
                        text: Binding(get: { answers[q.id] ?? "" }, set: { answers[q.id] = $0 })
                    ).textFieldStyle(.roundedBorder)
                }
            }
            HStack {
                Button("Stop task", role: .destructive) { agent.stop() }
                Spacer()
                Button("Continue") { agent.answer(answers) }.buttonStyle(PrimaryButtonStyle()).disabled(
                    question.questions.contains { (answers[$0.id] ?? "").isEmpty })
            }
        }.padding(30).frame(width: 560).background(Theme.canvas).interactiveDismissDisabled()
    }
}
