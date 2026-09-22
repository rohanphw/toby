import SwiftUI

struct ConversationContent: View {
    let messages: [Message]
    var body: some View {
        LazyVStack(alignment: .leading, spacing: 26) {
            ForEach(messages) { message in
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Eyebrow(
                            text: message.role == "user"
                                ? "You" : message.role == "system" ? "Needs attention" : "Toby")
                        if message.state == "streaming" { ProgressView().controlSize(.mini) }
                        if message.state == "interrupted" {
                            Text("Interrupted").font(.caption).foregroundStyle(Theme.secondary)
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
                }
                .padding(message.role == "user" ? 20 : 4)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    message.role == "user" ? Theme.surface : .clear, in: RoundedRectangle(cornerRadius: 20))
            }
        }
    }
}

struct ApprovalView: View {
    let agent: AgentSession
    let approval: RuntimeApproval
    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            Image(systemName: "hand.raised").font(.system(size: 26)).foregroundStyle(Theme.accent)
            Text(approval.title).font(Theme.heading(29))
            Text("Toby needs your permission to continue this action.").foregroundStyle(Theme.secondary)
            ScrollView {
                Text(
                    approval.detail.isEmpty
                        ? "The runtime requested permission beyond the current workspace." : approval.detail
                ).font(.system(size: 12, design: .monospaced)).textSelection(.enabled).frame(
                    maxWidth: .infinity, alignment: .leading)
            }.frame(maxHeight: 220)
            HStack {
                Button("Stop task", role: .destructive) { agent.stop() }
                Spacer()
                Button("Deny") { agent.resolve(approval, allow: false) }
                Button("Allow once") { agent.resolve(approval, allow: true) }.buttonStyle(.borderedProminent)
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
                Button("Continue") { agent.answer(answers) }.disabled(
                    question.questions.contains { (answers[$0.id] ?? "").isEmpty })
            }
        }.padding(30).frame(width: 560).background(Theme.canvas).interactiveDismissDisabled()
    }
}
