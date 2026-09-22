import Foundation
import SwiftData

enum ItemKind: String, CaseIterable, Identifiable {
    case thought, conversation, meeting
    var id: String { rawValue }
    var label: String {
        switch self {
        case .thought: "Note"
        case .conversation: "Conversation"
        case .meeting: "Meeting"
        }
    }
    var symbol: String {
        switch self {
        case .thought: "square.and.pencil"
        case .conversation: "waveform"
        case .meeting: "person.2"
        }
    }
}

@Model final class LibraryItem {
    @Attribute(.unique) var id: UUID
    var title: String
    var kindRaw: String
    var body: String
    var notes: String
    var draft: String
    var createdAt: Date
    var updatedAt: Date
    var isPinned: Bool
    var isMemory: Bool
    var archivedAt: Date?
    var isArchived: Bool { archivedAt != nil }
    var calendarOccurrenceKey: String?
    var threadID: String?
    var recordingState: String
    var attachmentNames: [String]
    @Relationship(deleteRule: .cascade) var messages: [Message]
    init(title: String, kind: ItemKind) {
        id = UUID()
        self.title = title
        kindRaw = kind.rawValue
        body = ""
        notes = ""
        draft = ""
        createdAt = .now
        updatedAt = .now
        isPinned = false
        isMemory = false
        recordingState = ""
        attachmentNames = []
        messages = []
    }
    var kind: ItemKind { ItemKind(rawValue: kindRaw) ?? .thought }
    var orderedMessages: [Message] { messages.sorted { $0.createdAt < $1.createdAt } }
}

@Model final class Message {
    @Attribute(.unique) var id: UUID
    var role: String
    var text: String
    var state: String
    var createdAt: Date
    var runtimeItemID: String?
    init(role: String, text: String, state: String = "complete", runtimeItemID: String? = nil) {
        id = UUID()
        self.role = role
        self.text = text
        self.state = state
        createdAt = .now
        self.runtimeItemID = runtimeItemID
    }
}

enum AppPaths {
    static let root = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Library/Application Support/TobyNext", isDirectory: true)
    static func archive(_ id: UUID) -> URL {
        root.appendingPathComponent("Archive/\(id.uuidString)", isDirectory: true)
    }
    static func workspace(_ id: UUID) -> URL {
        root.appendingPathComponent("Workspaces/\(id.uuidString)", isDirectory: true)
    }
}
