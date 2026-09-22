import SwiftUI

struct HomeView: View {
    let model: AppModel
    @State private var prompt = ""
    private var recent: [LibraryItem] {
        Array(model.library.items.sorted { $0.updatedAt > $1.updatedAt }.prefix(6))
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 32) {
            VStack(alignment: .leading, spacing: 12) {
                Eyebrow(text: Date().formatted(.dateTime.weekday(.wide).month(.wide).day()))
                Text("What’s on your mind?").font(Theme.heading(36)).tracking(-0.8)
                Text("Talk it through, write it down, or pick up a thought.")
                    .font(Theme.body).foregroundStyle(Theme.secondary)
            }.padding(.top, 10)
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    Button(action: { model.startVoice() }) {
                        Label("Talk to Toby", systemImage: "waveform")
                    }.buttonStyle(PrimaryButtonStyle())
                    Text("⌃ ⌥ Space").font(Theme.caption).foregroundStyle(Theme.secondary)
                    Spacer()
                    Button(action: model.newNote) { Label("Write a note", systemImage: "square.and.pencil") }
                        .buttonStyle(QuietButtonStyle())
                    Button {
                        model.startMeeting()
                    } label: {
                        Label("Record a meeting", systemImage: "record.circle")
                    }
                    .buttonStyle(QuietButtonStyle()).disabled(model.meetings.active || model.voice.active)
                }
                VStack(alignment: .leading, spacing: 16) {
                    HStack(alignment: .bottom, spacing: 16) {
                        TextField("Or write what you’re thinking…", text: $prompt, axis: .vertical)
                            .textFieldStyle(.plain).font(.system(size: 16)).lineLimit(2...5).onSubmit(submit)
                        Button(action: submit) {
                            Image(systemName: "arrow.up").font(.system(size: 14, weight: .semibold))
                        }
                        .buttonStyle(PrimaryButtonStyle())
                        .disabled(
                            prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                                || model.agent.isRunning || model.voice.active
                        )
                        .accessibilityLabel("Ask Toby")
                    }
                    Rectangle().fill(Theme.line).frame(height: 1)
                    HomeModelSelector(model: model)
                }.surface()
            }
            if let upcoming = model.schedule.upcoming.first {
                HStack(spacing: 14) {
                    Image(systemName: "calendar").foregroundStyle(Theme.accent)
                    Text(upcoming.start, format: .dateTime.hour().minute()).foregroundStyle(Theme.secondary)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(upcoming.title).lineLimit(1)
                        if let email = upcoming.joinEmail {
                            Text(email).font(Theme.caption).foregroundStyle(Theme.secondary)
                        }
                    }
                    Spacer()
                    Button("Join meeting") { NSWorkspace.shared.open(upcoming.joinURL) }.buttonStyle(
                        QuietButtonStyle())
                }.font(.system(size: 13))
            }
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Pick up where you left off").font(Theme.heading(20))
                    Spacer()
                    Button("View all →") { model.navigate(to: .library) }.buttonStyle(.plain)
                        .font(.system(size: 13)).foregroundStyle(Theme.secondary)
                }
                if recent.isEmpty {
                    Text("Your notes, conversations, and meetings will find a home here.")
                        .foregroundStyle(Theme.secondary).padding(.vertical, 20)
                } else {
                    LazyVStack(spacing: 4) {
                        ForEach(recent) { item in LibraryRow(item: item) { model.openItem(item) } }
                    }
                }
            }
        }
    }
    private func submit() {
        guard !prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
            !model.agent.isRunning, !model.voice.active
        else { return }
        model.ask(prompt)
        prompt = ""
    }
}

struct LibraryRow: View {
    let item: LibraryItem
    let action: () -> Void
    @State private var hovered = false
    var body: some View {
        Button(action: action) {
            HStack(spacing: 18) {
                Image(systemName: item.kind.symbol).font(.system(size: 20, weight: .light))
                    .foregroundStyle(
                        Theme.accent
                    )
                    .frame(width: 48, height: 52).background(
                        Theme.surface, in: RoundedRectangle(cornerRadius: 14))
                VStack(alignment: .leading, spacing: 6) {
                    Text(item.title).font(.system(size: 15, weight: .medium)).lineLimit(1)
                    Text(preview).font(.system(size: 13)).foregroundStyle(Theme.secondary).lineLimit(1)
                }.frame(maxWidth: .infinity, alignment: .leading)
                if item.isPinned {
                    Image(systemName: "pin.fill").font(.system(size: 11)).foregroundStyle(Theme.accent)
                }
                VStack(alignment: .trailing, spacing: 6) {
                    Text(item.updatedAt, format: .dateTime.month(.abbreviated).day())
                    Text(item.kind.label)
                }.font(.system(size: 11)).foregroundStyle(Theme.secondary)
                Image(systemName: "chevron.right").font(.system(size: 10)).foregroundStyle(Theme.secondary)
            }.padding(14).background(hovered ? Theme.surface : .clear, in: RoundedRectangle(cornerRadius: 18))
                .contentShape(RoundedRectangle(cornerRadius: 18))
        }.buttonStyle(.plain).onHover { hovered = $0 }
    }
    private var preview: String {
        if !item.notes.isEmpty { return item.notes }
        if !item.body.isEmpty { return item.body }
        return item.orderedMessages.last?.text ?? "A new beginning."
    }
}

private struct HomeModelSelector: View {
    let model: AppModel
    @AppStorage("agentProvider") private var provider = "codex"
    @AppStorage("codexModel") private var codexModel = ""
    @AppStorage("grokModel") private var grokModel = ""
    private var account: AccountConnection {
        provider == CLIProvider.grok.rawValue ? model.grokAccount : model.account
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                Text("Using").foregroundStyle(Theme.secondary)
                ProviderSelector(selection: $provider).frame(width: 228)
                DefaultModelPicker(
                    account: account,
                    selection: provider == CLIProvider.grok.rawValue ? $grokModel : $codexModel
                )
                .labelsHidden().frame(maxWidth: 240)
                Spacer(minLength: 0)
            }.font(.system(size: 13)).disabled(model.agent.isRunning)
            if let error = account.error {
                ErrorNotice(message: error) { account.error = nil }
            }
            if model.agent.isRunning {
                Text("You can change the default when the current task finishes.")
                    .font(.system(size: 12)).foregroundStyle(Theme.secondary)
            }
        }
    }
}
