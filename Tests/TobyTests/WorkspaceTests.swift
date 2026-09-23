import XCTest

@testable import Toby

final class WorkspaceTests: XCTestCase {
    func testRetrievalFindsContentAfterFirstChunkAndKeepsSourceIdentity() {
        let id = UUID()
        let document = ContextDocument(
            itemID: id, messageID: nil, key: "note", title: "Meeting",
            text: String(repeating: "ordinary text ", count: 300) + "We selected lavender for the prototype.",
            updatedAt: .now)
        let results = LibraryContext.retrieve("lavender", documents: [document])
        XCTAssertFalse(results.isEmpty)
        XCTAssertEqual(results.first?.itemID, id)
        XCTAssertTrue(results.first?.excerpt.contains("lavender") == true)
        XCTAssertTrue(LibraryContext.retrieve("elephant", documents: [document]).isEmpty)
    }
    @MainActor func testArchivedItemsNeverBecomeContextDocuments() {
        let active = LibraryItem(title: "Active", kind: .thought)
        active.body = "Current decision"
        let archived = LibraryItem(title: "Archived", kind: .thought)
        archived.body = "Withdrawn decision"
        archived.archivedAt = .now
        XCTAssertEqual(LibraryContext.documents([active, archived]).map(\.itemID), [active.id])
    }
    func testExtractionRejectsUnknownSourcesAndInventedQuotes() throws {
        let source = SourceReference(
            id: "real", itemID: UUID(), title: "Call", excerpt: "I will send the proposal on Friday.")
        let json = """
            {"tasks":[
              {"title":"Send proposal","source_id":"real","quote":"I will send the proposal","owner":null,"due_date":null},
              {"title":"Invented","source_id":"real","quote":"Book flights tomorrow","owner":null,"due_date":null},
              {"title":"Wrong source","source_id":"missing","quote":"I will send the proposal","owner":null,"due_date":null}
            ]}
            """
        let tasks = try TaskExtraction.parse(json, sources: [source], projectID: nil)
        XCTAssertEqual(tasks.count, 1)
        XCTAssertEqual(tasks.first?.status, .suggested)
        XCTAssertNil(tasks.first?.due)
        XCTAssertEqual(tasks.first?.source?.excerpt, "I will send the proposal")
    }
    @MainActor func testWorkspacePersistsAndProjectRemovalPreservesTasks() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = try WorkspaceStore(root: root)
        let project = TobyProject(name: "Launch")
        let task = TobyTask(title: "Write announcement", projectID: project.id)
        XCTAssertTrue(
            store.update {
                $0.projects.append(project)
                $0.tasks.append(task)
            })
        let reopened = try WorkspaceStore(root: root)
        XCTAssertEqual(reopened.data.projects.first?.name, "Launch")
        XCTAssertTrue(reopened.removeProject(project.id))
        XCTAssertEqual(reopened.data.tasks.count, 1)
        XCTAssertNil(reopened.data.tasks.first?.projectID)
    }
    @MainActor func testFailedWriteDoesNotMutateVisibleState() throws {
        let absent = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let store = try WorkspaceStore(root: absent)
        XCTAssertFalse(store.update { $0.projects.append(TobyProject(name: "Unsaved")) })
        XCTAssertTrue(store.data.projects.isEmpty)
        XCTAssertNotNil(store.error)
    }
    @MainActor func testSourceDeletionClearsQuotesWithoutRenumberingCitations() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let store = try WorkspaceStore(root: root)
        let removed = UUID()
        let retained = UUID()
        let response = UUID()
        let first = SourceReference(
            id: "first", itemID: removed, title: "Private", excerpt: "Old private quote")
        let second = SourceReference(
            id: "second", itemID: retained, title: "Current", excerpt: "Retained quote")
        XCTAssertTrue(
            store.update {
                $0.references[response.uuidString] = [first, second]
                $0.tasks = [
                    TobyTask(title: "Old", source: first), TobyTask(title: "Current", source: second),
                ]
            })
        XCTAssertEqual(store.visibleTasks(activeItemIDs: [retained]).count, 1)
        store.reconcile(existing: [retained], messages: [response])
        let references = store.data.references[response.uuidString]!
        XCTAssertEqual(references.count, 2)
        XCTAssertEqual(references[0].excerpt, "")
        XCTAssertEqual(references[1].id, "second")
        XCTAssertEqual(store.data.tasks.count, 1)
    }
}
