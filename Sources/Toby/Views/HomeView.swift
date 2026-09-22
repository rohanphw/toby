import SwiftUI

struct HomeView: View {
    let model: AppModel
    @Environment(\.openWindow) private var openWindow
    @State private var prompt = ""
    private var recent: [LibraryItem] {
        Array(model.library.items.sorted { $0.updatedAt > $1.updatedAt }.prefix(6))
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 36) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 16) {
                    Eyebrow(text: Date().formatted(.dateTime.weekday(.wide).month(.wide).day()))
                    Text("A little space\nfor everything on your mind.").font(Theme.editorial(43)).tracking(
                        -1
                    ).lineSpacing(3)
                    Text("Think out loud. Keep the good parts. Pick up where you left off.")
                        .font(.system(size: 13)).foregroundStyle(Theme.secondary)
                }
                Spacer()
                Image(systemName: "sparkle").font(.system(size: 60, weight: .ultraLight)).foregroundStyle(
                    Theme.accent.opacity(0.45)
                ).padding(.top, 40)
            }.padding(.top, 14)
            HStack(spacing: 18) {
                Button {
                    openWindow(id: "voice")
                } label: {
                    HStack(spacing: 14) {
                        Image(systemName: "waveform").font(.system(size: 22, weight: .light)).foregroundStyle(
                            Theme.accent)
                        VStack(alignment: .leading, spacing: 5) {
                            Text("Talk to Toby").font(Theme.editorial(22))
                            Text("A thought, a question, a place to begin.").font(.system(size: 12))
                                .foregroundStyle(Theme.secondary)
                        }
                        Spacer()
                        Text("⌃ ⌥ Space").font(.system(size: 10, design: .monospaced)).foregroundStyle(
                            Theme.secondary)
                    }.surface()
                }.buttonStyle(.plain)
                Button {
                    model.newNote()
                } label: {
                    VStack(alignment: .leading, spacing: 10) {
                        Image(systemName: "square.and.pencil").foregroundStyle(Theme.secondary)
                        Text("Leave a note").font(Theme.editorial(19))
                    }.frame(width: 132, alignment: .leading).surface()
                }.buttonStyle(.plain)
            }
            HStack(spacing: 12) {
                TextField("Or write what’s on your mind…", text: $prompt, axis: .vertical).textFieldStyle(
                    .plain
                ).lineLimit(1...5).onSubmit(submit)
                Button(action: submit) { Image(systemName: "arrow.up.circle.fill").font(.system(size: 26)) }
                    .buttonStyle(.plain)
                    .disabled(
                        prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            || model.agent.isRunning
                    ).accessibilityLabel("Ask Toby")
            }.padding(18).background(Theme.surface.opacity(0.45), in: RoundedRectangle(cornerRadius: 9))
                .overlay(RoundedRectangle(cornerRadius: 9).stroke(Theme.line))
            if let upcoming = model.schedule.upcoming.first {
                HStack(spacing: 14) {
                    Image(systemName: "calendar").foregroundStyle(Theme.secondary)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(upcoming.title).font(.system(size: 13, weight: .medium))
                        Text(upcoming.start, format: .dateTime.hour().minute()).font(.system(size: 11))
                            .foregroundStyle(Theme.secondary)
                    }
                    Spacer()
                    Button("Open meeting") { NSWorkspace.shared.open(upcoming.url) }.buttonStyle(
                        QuietButtonStyle())
                }
            }
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Eyebrow(text: "Pick up a thread")
                    Spacer()
                    Button("Your library →") { model.page = .library }.buttonStyle(.plain).font(
                        .system(size: 12)
                    ).foregroundStyle(Theme.secondary)
                }
                if recent.isEmpty {
                    EmptyWorkspace(
                        symbol: "text.book.closed", title: "Your second brain starts here.",
                        detail:
                            "Conversations, notes and meetings will collect here as you use Toby. There’s nothing to organize first."
                    )
                } else {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                        ForEach(recent) { item in LibraryCard(item: item) { model.selected = item } }
                    }
                }
            }
        }
    }
    private func submit() {
        guard !prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !model.agent.isRunning else {
            return
        }
        model.ask(prompt)
        prompt = ""
    }
}

struct LibraryCard: View {
    let item: LibraryItem
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    Label(item.kind.label, systemImage: item.kind.symbol).font(
                        .system(size: 10, weight: .medium)
                    ).foregroundStyle(Theme.secondary)
                    Spacer()
                    if item.isPinned {
                        Image(systemName: "pin.fill").font(.system(size: 10)).foregroundStyle(Theme.accent)
                    }
                    Text(item.updatedAt, format: .dateTime.month(.abbreviated).day()).font(.system(size: 10))
                        .foregroundStyle(Theme.secondary)
                }
                Text(item.title).font(Theme.editorial(23)).lineLimit(2).multilineTextAlignment(.leading)
                Text(preview).font(.system(size: 12)).foregroundStyle(Theme.secondary).lineLimit(2)
                    .multilineTextAlignment(.leading)
            }.frame(maxWidth: .infinity, minHeight: 112, alignment: .topLeading).surface()
        }.buttonStyle(.plain)
    }
    private var preview: String {
        if !item.notes.isEmpty { return item.notes }
        if !item.body.isEmpty { return item.body }
        return item.orderedMessages.last?.text ?? "A little space to begin."
    }
}
