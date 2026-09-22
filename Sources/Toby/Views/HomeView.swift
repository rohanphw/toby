import SwiftUI

struct HomeView: View {
    let model: AppModel
    @State private var prompt = ""
    private var recent: [LibraryItem] {
        Array(model.library.items.sorted { $0.updatedAt > $1.updatedAt }.prefix(6))
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 36) {
            VStack(alignment: .leading, spacing: 16) {
                Eyebrow(text: Date().formatted(.dateTime.weekday(.wide).month(.wide).day()))
                Text("What’s on\nyour mind?").font(Theme.heading(58)).tracking(-2).lineSpacing(-2)
                Text("A passing thought. A big question. Something you don’t want to forget.")
                    .font(.system(size: 15)).foregroundStyle(Theme.secondary)
            }.padding(.top, 20)
            HomeModelSelector(model: model)
            HStack(alignment: .center, spacing: 32) {
                Button(action: model.startVoice) {
                    HStack(spacing: 24) {
                        VoiceMark().frame(width: 120, height: 76)
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Talk to Toby").font(Theme.heading(27))
                            Text("Think out loud. Get a written reply.").font(.system(size: 13))
                                .foregroundStyle(Theme.secondary)
                            Text("⌃ ⌥ Space").font(.system(size: 12)).foregroundStyle(Theme.accent)
                        }
                        Spacer(minLength: 8)
                        Image(systemName: "arrow.up.right").font(.system(size: 20, weight: .light))
                    }.padding(28).background(
                        Theme.accent.opacity(0.08), in: RoundedRectangle(cornerRadius: 26)
                    )
                    .overlay(RoundedRectangle(cornerRadius: 26).stroke(Theme.accent.opacity(0.2)))
                    .contentShape(RoundedRectangle(cornerRadius: 26))
                }.buttonStyle(.plain)
                VStack(alignment: .leading, spacing: 24) {
                    Button(action: model.newNote) { Label("Write a note", systemImage: "square.and.pencil") }
                    Button {
                        model.startMeeting()
                    } label: {
                        Label("Record a meeting", systemImage: "record.circle")
                    }
                    .disabled(model.meetings.active || model.voice.active)
                }.buttonStyle(.plain).font(.system(size: 14)).fixedSize()
            }
            HStack(alignment: .bottom, spacing: 16) {
                TextField("Or start with a few words…", text: $prompt, axis: .vertical)
                    .textFieldStyle(.plain).font(.system(size: 16)).lineLimit(1...5).onSubmit(submit)
                Button(action: submit) { Image(systemName: "arrow.up.circle.fill").font(.system(size: 28)) }
                    .buttonStyle(.plain).foregroundStyle(Theme.accent)
                    .disabled(
                        prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            || model.agent.isRunning || model.voice.active
                    )
                    .accessibilityLabel("Ask Toby")
            }.padding(.vertical, 20)
                .overlay(alignment: .bottom) { Rectangle().fill(Theme.line).frame(height: 1) }
            if let upcoming = model.schedule.upcoming.first {
                HStack(spacing: 14) {
                    Image(systemName: "calendar").foregroundStyle(Theme.accent)
                    Text(upcoming.start, format: .dateTime.hour().minute()).foregroundStyle(Theme.secondary)
                    Text(upcoming.title).lineLimit(1)
                    Spacer()
                    Button("Join meeting") { NSWorkspace.shared.open(upcoming.url) }.buttonStyle(
                        QuietButtonStyle())
                }.font(.system(size: 13))
            }
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Pick up where you left off").font(Theme.heading(22))
                    Spacer()
                    Button("View all →") { model.page = .library }.buttonStyle(.plain)
                        .font(.system(size: 13)).foregroundStyle(Theme.secondary)
                }
                if recent.isEmpty {
                    Text("Your notes, conversations, and meetings will find a home here.")
                        .foregroundStyle(Theme.secondary).padding(.vertical, 20)
                } else {
                    LazyVStack(spacing: 4) {
                        ForEach(recent) { item in LibraryRow(item: item) { model.selected = item } }
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
                    Text(item.title).font(Theme.heading(18)).lineLimit(1)
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
                Text("Default model").foregroundStyle(Theme.secondary)
                ProviderSelector(selection: $provider).frame(width: 150)
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
