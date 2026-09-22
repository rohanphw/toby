import SwiftUI

struct LibraryItemActions: View {
    let model: AppModel
    let item: LibraryItem
    var body: some View {
        Button(item.isArchived ? "Restore from Archive" : "Archive") { model.archive(item) }
            .disabled(!model.canOrganizeLibrary)
        Button("Delete", role: .destructive) { model.requestDeletion(item) }
            .disabled(!model.canOrganizeLibrary)
    }
}

struct ArchivedItemView: View {
    let model: AppModel
    let item: LibraryItem
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            HStack {
                Button {
                    model.goBack()
                } label: {
                    Label("Back", systemImage: "arrow.left")
                }
                Spacer()
                Button("Restore from Archive") { model.archive(item) }.disabled(!model.canOrganizeLibrary)
                Button("Delete", role: .destructive) { model.requestDeletion(item) }.disabled(
                    !model.canOrganizeLibrary)
            }.buttonStyle(QuietButtonStyle())
            Label("Archived · Read only", systemImage: "archivebox")
                .font(Theme.label).foregroundStyle(Theme.secondary)
            Text(item.title).font(Theme.heading(28))
                .contextMenu { LibraryItemActions(model: model, item: item) }
            Text(
                "This chat is excluded from Toby’s memory and future chat context. Restore it to continue; remembering it again is a separate choice."
            )
            .font(Theme.caption).foregroundStyle(Theme.secondary)
            if !item.notes.isEmpty { MarkdownDocument(text: item.notes) }
            if !item.body.isEmpty { Text(item.body).font(Theme.body).textSelection(.enabled) }
            if !item.messages.isEmpty { ConversationContent(messages: item.orderedMessages) }
            if !item.attachmentNames.isEmpty {
                Text("Saved attachments: \(item.attachmentNames.joined(separator: ", "))")
                    .font(Theme.caption).foregroundStyle(Theme.secondary)
            }
        }
    }
}
