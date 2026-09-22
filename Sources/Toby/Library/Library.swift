import AppKit
import Observation
import SwiftData

@MainActor @Observable final class Library {
    let container: ModelContainer
    private let context: ModelContext
    private(set) var items: [LibraryItem] = []
    var activeItems: [LibraryItem] { items.filter { !$0.isArchived } }
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
        try recoverFileMoves()
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
    @discardableResult func setArchived(_ archived: Bool, item: LibraryItem) -> Bool {
        guard item.isArchived != archived else { return true }
        let source = item.isArchived ? AppPaths.archive(item.id) : AppPaths.workspace(item.id)
        let destination = archived ? AppPaths.archive(item.id) : AppPaths.workspace(item.id)
        var moved = false
        do {
            try context.save()
            if FileManager.default.fileExists(atPath: source.path) {
                try FileManager.default.createDirectory(
                    at: destination.deletingLastPathComponent(), withIntermediateDirectories: true)
                try FileManager.default.moveItem(at: source, to: destination)
                moved = true
            }
            item.archivedAt = archived ? .now : nil
            item.isMemory = false
            item.isPinned = false
            // A resumed provider session may retain remembered context that has just been withdrawn.
            for existing in items { existing.threadID = nil }
            try context.save()
            return true
        } catch {
            context.rollback()
            if moved {
                do { try FileManager.default.moveItem(at: destination, to: source) } catch {
                    self.error =
                        "Could not restore the workspace after a failed archive change. Reopen Toby to recover it."
                    return false
                }
            }
            self.error = "Could not change the archive: \(error.localizedDescription)"
            return false
        }
    }
    @discardableResult func delete(_ item: LibraryItem) -> Bool {
        let id = item.id
        let source = item.isArchived ? AppPaths.archive(id) : AppPaths.workspace(id)
        let pending = AppPaths.root.appendingPathComponent(
            "DeletionPending/\(id.uuidString)", isDirectory: true)
        var moved = false
        do {
            try context.save()
            if FileManager.default.fileExists(atPath: source.path) {
                try FileManager.default.createDirectory(
                    at: pending.deletingLastPathComponent(), withIntermediateDirectories: true)
                try FileManager.default.moveItem(at: source, to: pending)
                moved = true
            }
            context.delete(item)
            for existing in items where existing.id != id { existing.threadID = nil }
            try context.save()
        } catch {
            context.rollback()
            if moved {
                do { try FileManager.default.moveItem(at: pending, to: source) } catch {
                    self.error = "Deletion failed and the workspace needs recovery. Reopen Toby."
                    return false
                }
            }
            self.error = "Could not delete this item: \(error.localizedDescription)"
            return false
        }
        items.removeAll { $0 === item }
        if moved {
            do { try FileManager.default.removeItem(at: pending) } catch {
                self.error =
                    "Chat removed, but its files could not be deleted. Toby will retry cleanup on launch."
            }
        }
        return true
    }
    private func recoverFileMoves() throws {
        let manager = FileManager.default
        let pending = AppPaths.root.appendingPathComponent("DeletionPending", isDirectory: true)
        if manager.fileExists(atPath: pending.path) {
            for directory in try manager.contentsOfDirectory(at: pending, includingPropertiesForKeys: nil) {
                guard let id = UUID(uuidString: directory.lastPathComponent) else { continue }
                if let item = items.first(where: { $0.id == id }) {
                    let destination = item.isArchived ? AppPaths.archive(id) : AppPaths.workspace(id)
                    try manager.createDirectory(
                        at: destination.deletingLastPathComponent(), withIntermediateDirectories: true)
                    try manager.moveItem(at: directory, to: destination)
                } else {
                    try manager.removeItem(at: directory)
                }
            }
        }
        for item in items {
            let expected = item.isArchived ? AppPaths.archive(item.id) : AppPaths.workspace(item.id)
            let other = item.isArchived ? AppPaths.workspace(item.id) : AppPaths.archive(item.id)
            if !manager.fileExists(atPath: expected.path), manager.fileExists(atPath: other.path) {
                try manager.createDirectory(
                    at: expected.deletingLastPathComponent(), withIntermediateDirectories: true)
                try manager.moveItem(at: other, to: expected)
            }
        }
    }
    func attach(to item: LibraryItem) {
        guard !item.isArchived else { return }
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
    func attachDownloadedFile(_ source: URL, name: String, to item: LibraryItem) throws {
        guard !item.isArchived else { throw TobyError("Restore this item before attaching files.") }
        let directory = AppPaths.workspace(item.id).appendingPathComponent("Inputs", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let safeName = String(
            name.components(separatedBy: CharacterSet(charactersIn: "/:\\").union(.controlCharacters)).joined(
                separator: "-"
            ).prefix(160))
        let filename = "\(UUID().uuidString.prefix(8))-\(safeName.isEmpty ? "Drive file" : safeName)"
        try FileManager.default.copyItem(at: source, to: directory.appendingPathComponent(filename))
        item.attachmentNames.append(filename)
        changed(item, immediately: true)
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
