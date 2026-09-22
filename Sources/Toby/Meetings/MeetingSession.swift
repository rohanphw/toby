import Foundation
import Observation

@MainActor @Observable final class MeetingSession {
    private(set) var item: LibraryItem?
    private(set) var startedAt: Date?
    private(set) var isStarting = false
    private(set) var isFinishing = false
    private(set) var partials: [String: String] = [:]
    private(set) var level: Float = 0
    var error: String?
    var onFinished: ((LibraryItem) -> Void)?
    private let library: Library
    private let capture = AudioCapture()
    private var operation: Task<Void, Never>?
    private var token = UUID()
    var active: Bool { item != nil || isStarting || isFinishing }
    init(library: Library) {
        self.library = library
        capture.onText = { [weak self] label, text, final in self?.receive(label, text, final: final) }
        capture.onLevel = { [weak self] in self?.level = $0 }
        capture.onError = { [weak self] message in
            self?.error = message
            self?.finish(generateNotes: false)
        }
    }
    func start(title: String = "Meeting") {
        guard !active else { return }
        isStarting = true
        error = nil
        let token = UUID()
        self.token = token
        let item = library.create(.meeting, title: title)
        self.item = item
        item.recordingState = "recording"
        startedAt = .now
        library.changed(item, immediately: true)
        operation = Task {
            do {
                let directory = AppPaths.workspace(item.id).appendingPathComponent(
                    "Recording", isDirectory: true)
                try await capture.start(
                    meeting: true, directory: directory,
                    locale: UserDefaults.standard.string(forKey: "speechLocale") ?? "en-US")
                if self.token == token { isStarting = false }
            } catch is CancellationError {} catch {
                guard self.token == token else { return }
                self.error = error.localizedDescription
                item.recordingState = "interrupted"
                library.changed(item, immediately: true)
                self.item = nil
                isStarting = false
                startedAt = nil
            }
        }
    }
    func finish(generateNotes: Bool = true) {
        guard let item, !isFinishing else { return }
        isFinishing = true
        token = UUID()
        operation?.cancel()
        operation = Task {
            await capture.stop()
            await Task.yield()
            for (label, text) in partials where !text.isEmpty { append(label, text, to: item) }
            partials = [:]
            item.recordingState = error == nil ? "finished" : "interrupted"
            library.changed(item, immediately: true)
            self.item = nil
            startedAt = nil
            level = 0
            isStarting = false
            isFinishing = false
            if generateNotes, !item.body.isEmpty { onFinished?(item) }
        }
    }
    private func receive(_ label: String, _ text: String, final: Bool) {
        guard let item else { return }
        if final {
            append(label, text, to: item)
            partials.removeValue(forKey: label)
        } else {
            partials[label] = text
        }
    }
    private func append(_ label: String, _ text: String, to item: LibraryItem) {
        let seconds = Int(Date().timeIntervalSince(startedAt ?? .now))
        item.body += "[\(String(format: "%02d:%02d", seconds / 60, seconds % 60))] \(label)\n\(text)\n\n"
        library.changed(item)
    }
}
