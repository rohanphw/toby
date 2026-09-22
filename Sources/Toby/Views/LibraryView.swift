import SwiftUI

struct LibraryView: View {
    let model: AppModel
    let memoryOnly: Bool
    @State private var query = ""
    @State private var showingArchive = false
    @State private var kind: ItemKind?
    private var items: [LibraryItem] {
        model.library.items.filter {
            ($0.isArchived == (!memoryOnly && showingArchive)) && (!memoryOnly || $0.isMemory)
                && (kind == nil || $0.kind == kind)
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
                Text(
                    memoryOnly
                        ? "Things worth remembering."
                        : showingArchive ? "Your archive." : "All the pieces, together."
                ).font(
                    Theme.heading(30))
                Spacer()
                Button("New note", action: model.newNote).buttonStyle(QuietButtonStyle())
            }
            if !memoryOnly {
                HStack(spacing: 16) {
                    Button("Library") { showingArchive = false }
                        .foregroundStyle(showingArchive ? Theme.secondary : Theme.ink)
                    Button {
                        showingArchive = true
                    } label: {
                        Label("Archive", systemImage: "archivebox")
                    }.foregroundStyle(showingArchive ? Theme.ink : Theme.secondary)
                }.buttonStyle(.plain).font(Theme.label)
                if showingArchive {
                    Text(
                        "Kept here for you. Excluded from Toby’s memory and future chat context until restored."
                    )
                    .font(Theme.caption).foregroundStyle(Theme.secondary)
                }
            }
            if memoryOnly {
                Text(
                    "Only notes you mark ‘Remember’ are included in Toby’s future tasks. You can change or remove them at any time."
                ).font(.system(size: 13)).foregroundStyle(Theme.secondary)
            }
            HStack {
                WorkspaceSearchField(placeholder: "Find a thought, meeting or conversation", text: $query)
                    .frame(maxWidth: 390)
                Spacer()
                HStack(spacing: 4) {
                    filterButton("All", value: nil)
                    ForEach(ItemKind.allCases) { filterButton($0.label, value: $0) }
                }.padding(4).background(Theme.surface, in: RoundedRectangle(cornerRadius: 12))

            }
            if items.isEmpty {
                EmptyWorkspace(
                    symbol: memoryOnly ? "sparkles" : "books.vertical",
                    title: query.isEmpty
                        ? (showingArchive ? "Nothing archived yet." : "Make room for an idea.")
                        : "Nothing found.",
                    detail: query.isEmpty
                        ? (showingArchive
                            ? "Right-click a chat and choose Archive to keep it here."
                            : "Start with a note or a conversation. Your work will find its place here.")
                        : "Try another word or a different filter.")
            } else {
                LazyVStack(spacing: 4) {
                    ForEach(items) { item in LibraryRow(model: model, item: item) { model.openItem(item) } }
                }
            }
        }
    }
    private func filterButton(_ title: String, value: ItemKind?) -> some View {
        Button {
            kind = value
        } label: {
            Text(title).font(.system(size: 12, weight: .medium))
                .padding(.horizontal, 10).padding(.vertical, 10)
                .background(
                    kind == value ? Color(white: 0.16) : .clear, in: RoundedRectangle(cornerRadius: 8)
                )
                .foregroundStyle(kind == value ? Theme.ink : Theme.secondary)
        }.buttonStyle(.plain).accessibilityAddTraits(kind == value ? .isSelected : [])
    }

}

struct SearchView: View {
    let model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    private var results: [LibraryItem] {
        guard !query.isEmpty else { return Array(model.library.activeItems.prefix(10)) }
        return model.library.activeItems.filter {
            ($0.title + $0.body + $0.notes + $0.messages.map(\.text).joined())
                .localizedCaseInsensitiveContains(query)
        }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                WorkspaceSearchField(placeholder: "What are you looking for?", text: $query, autofocus: true)
                Button("Done") { dismiss() }.keyboardShortcut(.cancelAction)
            }
            Divider()
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 4) {
                    ForEach(results) { item in
                        Button {
                            model.openItem(item)
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
                            .contextMenu {
                                Button("Archive") {
                                    model.archive(item)
                                    dismiss()
                                }.disabled(!model.canOrganizeLibrary)
                                Button("Delete", role: .destructive) {
                                    model.requestDeletion(item)
                                    dismiss()
                                }
                                .disabled(!model.canOrganizeLibrary)
                            }
                    }
                }
            }
        }.padding(28).frame(width: 640, height: 430).background(Theme.canvas).foregroundStyle(Theme.ink)

    }
}
