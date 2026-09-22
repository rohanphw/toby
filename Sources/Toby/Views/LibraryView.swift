import SwiftUI

struct LibraryView: View {
    let model: AppModel
    let memoryOnly: Bool
    @State private var query = ""
    @State private var kind: ItemKind?
    private var items: [LibraryItem] {
        model.library.items.filter {
            (!memoryOnly || $0.isMemory) && (kind == nil || $0.kind == kind)
                && (query.isEmpty
                    || ($0.title + $0.body + $0.notes + $0.messages.map(\.text).joined())
                        .localizedCaseInsensitiveContains(query))
        }.sorted {
            if $0.isPinned != $1.isPinned { return $0.isPinned }
            return $0.updatedAt > $1.updatedAt
        }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            Eyebrow(text: memoryOnly ? "What Toby remembers" : "Your personal collection")
            HStack {
                Text(memoryOnly ? "Things worth remembering." : "All the pieces, together.").font(
                    Theme.editorial(37))
                Spacer()
                Button("New note", action: model.newNote).buttonStyle(QuietButtonStyle())
            }
            if memoryOnly {
                Text(
                    "Only notes you mark ‘Remember’ are included in Toby’s future tasks. You can change or remove them at any time."
                ).font(.system(size: 13)).foregroundStyle(Theme.secondary)
            }
            HStack {
                TextField("Find a thought, meeting or conversation", text: $query).textFieldStyle(
                    .roundedBorder
                ).frame(maxWidth: 350)
                Spacer()
                Picker("Show", selection: $kind) {
                    Text("Everything").tag(Optional<ItemKind>.none)
                    ForEach(ItemKind.allCases) { Text($0.label).tag(Optional($0)) }
                }.labelsHidden().frame(width: 150)
            }
            if items.isEmpty {
                EmptyWorkspace(
                    symbol: memoryOnly ? "sparkles" : "books.vertical",
                    title: query.isEmpty ? "Make room for an idea." : "Nothing found.",
                    detail: query.isEmpty
                        ? "Start with a note or a conversation. Your work will find its place here."
                        : "Try another word or a different filter.")
            } else {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 270), alignment: .top)], spacing: 16) {
                    ForEach(items) { item in LibraryCard(item: item) { model.selected = item } }
                }
            }
        }
    }
}

struct SearchView: View {
    let model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @FocusState private var focused: Bool
    private var results: [LibraryItem] {
        guard !query.isEmpty else { return Array(model.library.items.prefix(10)) }
        return model.library.items.filter {
            ($0.title + $0.body + $0.notes + $0.messages.map(\.text).joined())
                .localizedCaseInsensitiveContains(query)
        }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Image(systemName: "magnifyingglass").foregroundStyle(Theme.secondary)
                TextField("What are you looking for?", text: $query).textFieldStyle(.plain).font(
                    .system(size: 20)
                ).focused($focused)
                Button("Done") { dismiss() }.keyboardShortcut(.cancelAction)
            }
            Divider()
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 4) {
                    ForEach(results) { item in
                        Button {
                            model.selected = item
                            dismiss()
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: item.kind.symbol).frame(width: 24).foregroundStyle(
                                    Theme.secondary)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(item.title)
                                    Text(item.kind.label).font(.caption).foregroundStyle(Theme.secondary)
                                }
                                Spacer()
                                Image(systemName: "arrow.up.left").foregroundStyle(Theme.secondary)
                            }.padding(12).contentShape(Rectangle())
                        }.buttonStyle(.plain)
                    }
                }
            }
        }.padding(28).frame(width: 640, height: 430).background(Theme.canvas).foregroundStyle(Theme.ink)
            .onAppear { focused = true }
    }
}
