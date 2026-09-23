import Foundation
import Observation

struct TobyProject: Codable, Identifiable {
    var id = UUID()
    var name: String
    var detail = ""
    var createdAt = Date()
}

struct SourceReference: Codable, Identifiable, Hashable {
    var id: String
    var itemID: UUID
    var messageID: UUID?
    var title: String
    var excerpt: String
    var capturedAt = Date()
}

struct TobyTask: Codable, Identifiable {
    enum Status: String, Codable, CaseIterable { case suggested, open, done, dismissed }
    var id = UUID()
    var title: String
    var owner = ""
    var due: Date?
    var status: Status = .open
    var projectID: UUID?
    var source: SourceReference?
    var createdAt = Date()
    var completedAt: Date?
}

struct TobyWorkflow: Codable, Identifiable {
    var id = UUID()
    var name: String
    var instruction: String
    static let defaults: [TobyWorkflow] = [
        .init(
            name: "Meeting follow-through",
            instruction:
                "Summarize the meeting, list decisions and open questions, and draft a concise follow-up. Include action items with owners and dates only when stated. Cite the supplied sources. Do not send anything."
        ),
        .init(
            name: "Shape this idea",
            instruction:
                "Turn this idea into a clear problem statement, a small first version, open questions, and practical next steps. Distinguish source facts from your suggestions. Cite the supplied sources."
        ),
        .init(
            name: "Weekly project update",
            instruction:
                "Write a project update from the supplied notes: progress, decisions, blockers, outstanding commitments, and next steps. Do not assume a task is complete without evidence. Cite sources and state what is missing."
        ),
    ]
}

struct WorkspaceData: Codable {
    var version = 1
    var projects: [TobyProject] = []
    var assignments: [String: UUID] = [:]
    var tasks: [TobyTask] = []
    var workflows: [TobyWorkflow] = TobyWorkflow.defaults
    var references: [String: [SourceReference]] = [:]
    var scopes: [String: String] = [:]
}

/// Additive sidecar storage: no migration of the existing SwiftData library or legacy app data.
@MainActor @Observable final class WorkspaceStore {
    private(set) var data: WorkspaceData
    var error: String?
    private let url: URL
    init(root: URL = AppPaths.root) throws {
        url = root.appendingPathComponent("Workspace.json")
        if FileManager.default.fileExists(atPath: url.path) {
            data = try JSONDecoder().decode(WorkspaceData.self, from: Data(contentsOf: url))
            guard data.version == 1 else { throw TobyError("This workspace needs a newer version of Toby.") }
        } else {
            data = WorkspaceData()
        }
    }
    @discardableResult func update(_ change: (inout WorkspaceData) -> Void) -> Bool {
        var next = data
        change(&next)
        do {
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.sortedKeys]
            let encoded = try encoder.encode(next)
            try encoded.write(to: url, options: .atomic)
            data = next
            error = nil
            return true
        } catch {
            self.error = "Could not save workspace changes: \(error.localizedDescription)"
            return false
        }
    }
    func project(for item: LibraryItem) -> TobyProject? {
        guard let id = data.assignments[item.id.uuidString] else { return nil }
        return data.projects.first { $0.id == id }
    }
    func items(in projectID: UUID, library: Library) -> [LibraryItem] {
        library.activeItems.filter { data.assignments[$0.id.uuidString] == projectID }
    }
    func visibleTasks(library: Library) -> [TobyTask] {
        return visibleTasks(activeItemIDs: Set(library.activeItems.map(\.id)))
    }
    func visibleTasks(activeItemIDs: Set<UUID>) -> [TobyTask] {
        data.tasks.filter { $0.source.map { activeItemIDs.contains($0.itemID) } ?? true }
    }
    @discardableResult func assign(_ item: LibraryItem, to projectID: UUID?) -> Bool {
        update {
            $0.assignments[item.id.uuidString] = projectID
            if $0.scopes[item.id.uuidString] != nil {
                $0.scopes[item.id.uuidString] = projectID?.uuidString ?? "all"
            }
        }
    }
    @discardableResult func saveTask(_ task: TobyTask) -> Bool {
        update { data in
            if let index = data.tasks.firstIndex(where: { $0.id == task.id }) {
                data.tasks[index] = task
            } else {
                data.tasks.append(task)
            }
        }
    }
    @discardableResult func removeProject(_ id: UUID) -> Bool {
        update { data in
            data.projects.removeAll { $0.id == id }
            data.scopes = data.scopes.filter { $0.value != id.uuidString }
            data.assignments = data.assignments.filter { $0.value != id }
            for index in data.tasks.indices where data.tasks[index].projectID == id {
                data.tasks[index].projectID = nil
            }
        }
    }
    /// Run after library deletion and on launch to finish cleanup after an interrupted write.
    func reconcile(library: Library) {
        reconcile(
            existing: Set(library.items.map(\.id)),
            messages: Set(library.items.flatMap { $0.messages.map(\.id) }))
    }
    func reconcile(existing: Set<UUID>, messages: Set<UUID>) {
        var next = data
        next.assignments = next.assignments.filter { UUID(uuidString: $0.key).map(existing.contains) == true }
        next.scopes = next.scopes.filter { UUID(uuidString: $0.key).map(existing.contains) == true }
        next.tasks.removeAll { $0.source.map { !existing.contains($0.itemID) } ?? false }
        next.references = next.references.filter { UUID(uuidString: $0.key).map(messages.contains) == true }
        for key in Array(next.references.keys) {
            next.references[key] = next.references[key]?.map { reference in
                guard !existing.contains(reference.itemID) else { return reference }
                var cleared = reference
                cleared.title = "Deleted source"
                cleared.excerpt = ""
                cleared.messageID = nil
                return cleared
            }
        }
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        if (try? encoder.encode(next)) != (try? encoder.encode(data)) {
            update { $0 = next }
        }
    }
}
