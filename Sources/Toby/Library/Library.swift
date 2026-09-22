import AppKit
import Observation
import SwiftData

@MainActor @Observable final class Library {
    let container: ModelContainer
    private let context: ModelContext
    private(set) var items: [LibraryItem] = []
    var error: String?
    private var checkpoint: Task<Void, Never>?

    init() throws {
        try FileManager.default.createDirectory(at: AppPaths.root, withIntermediateDirectories: true)
        let schema = Schema([LibraryItem.self, Message.self])
        let configuration = ModelConfiguration(
            "Toby", schema: schema, url: AppPaths.root.appendingPathComponent("Library.store"))
        container = try ModelContainer(for: schema, configurations: [configuration])
        context = ModelContext(container)
        context.autosaveEnabled = false
        items = try context.fetch(
            FetchDescriptor<LibraryItem>(sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]))
        for item in items {
            if item.recordingState == "recording" { item.recordingState = "interrupted" }
            for message in item.messages where message.state == "streaming" { message.state = "interrupted" }
        }
        try context.save()
    }
    @discardableResult func create(_ kind: ItemKind, title: String) -> LibraryItem {
        let item = LibraryItem(title: title, kind: kind)
        context.insert(item)
        items.insert(item, at: 0)
        save()
        return item
    }
    func save() {
        checkpoint?.cancel()
        checkpoint = nil
        do { try context.save() } catch {
            self.error = "Your latest changes could not be saved: \(error.localizedDescription)"
        }
    }
    func changed(_ item: LibraryItem, immediately: Bool = false) {
        item.updatedAt = .now
        if immediately {
            save()
            return
        }
        // A bounded checkpoint, not a debounce: continuous streaming is saved too.
        guard checkpoint == nil else { return }
        checkpoint = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(500))
            guard !Task.isCancelled else { return }
            self?.save()
        }
    }
    func delete(_ item: LibraryItem) {
        context.delete(item)
        do {
            try context.save()
            items.removeAll { $0.id == item.id }
            let url = AppPaths.workspace(item.id)
            if FileManager.default.fileExists(atPath: url.path) {
                try FileManager.default.trashItem(at: url, resultingItemURL: nil)
            }
        } catch { self.error = "Could not finish deleting this item: \(error.localizedDescription)" }
    }
    func attach(to item: LibraryItem) {
        let panel = NSOpenPanel()
        panel.directoryURL = LocalFolderAccess.resolve()
        panel.allowsMultipleSelection = true
        panel.canChooseDirectories = false
        guard panel.runModal() == .OK else { return }
        do {
            let directory = AppPaths.workspace(item.id).appendingPathComponent("Inputs", isDirectory: true)
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            for url in panel.urls {
                let access = url.startAccessingSecurityScopedResource()
                defer { if access { url.stopAccessingSecurityScopedResource() } }
                let name = "\(UUID().uuidString.prefix(8))-\(url.lastPathComponent)"
                try FileManager.default.copyItem(at: url, to: directory.appendingPathComponent(name))
                item.attachmentNames.append(name)
            }
            changed(item, immediately: true)
        } catch { self.error = "Could not attach the file: \(error.localizedDescription)" }
    }
    func export(_ item: LibraryItem) {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = item.title + ".md"
        guard panel.runModal() == .OK, let url = panel.url else { return }
        let conversation = item.orderedMessages.map {
            "### \($0.role == "user" ? "You" : "Toby")\n\n\($0.text)"
        }.joined(separator: "\n\n")
        let content = "# \(item.title)\n\n\(item.notes)\n\n\(item.body)\n\n\(conversation)"
        do { try content.write(to: url, atomically: true, encoding: .utf8) } catch {
            self.error = "Export failed: \(error.localizedDescription)"
        }
    }
}
