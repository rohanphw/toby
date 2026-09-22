import AVFoundation
import Observation

@MainActor @Observable final class VoiceSession: NSObject, AVSpeechSynthesizerDelegate {
    enum Phase: String {
        case idle = "Ready to listen"
        case starting = "Opening microphone"
        case listening = "Listening"
        case submitting = "Sending"
        case thinking = "Thinking"
        case speaking = "Speaking"
        case stopping = "Finishing"
    }
    private(set) var phase: Phase = .idle
    private(set) var partial = ""
    private(set) var level: Float = 0
    private(set) var item: LibraryItem?
    var error: String?
    var onUtterance: ((LibraryItem, String) -> Void)?
    private let capture = AudioCapture()
    private let speech = AVSpeechSynthesizer()
    private let library: Library
    private var silence: Task<Void, Never>?
    private var operation: Task<Void, Never>?
    private var committed = ""
    private var continuous = false
    private var lastText = ""
    private var token = UUID()
    init(library: Library) {
        self.library = library
        super.init()
        speech.delegate = self
        capture.onText = { [weak self] _, text, final in self?.receive(text, final: final) }
        capture.onLevel = { [weak self] in self?.level = $0 }
        capture.onError = { [weak self] message in
            self?.error = message
            self?.stop()
        }
    }
    var active: Bool { phase != .idle }
    func start(item: LibraryItem? = nil) {
        guard phase == .idle else { return }
        self.item = item ?? library.create(.conversation, title: "A conversation")
        continuous = true
        listen()
    }
    func listen() {
        guard continuous else { return }
        phase = .starting
        partial = ""
        committed = ""
        lastText = ""
        error = nil
        let token = UUID()
        self.token = token
        operation = Task {
            do {
                try await capture.start(
                    meeting: false, directory: nil,
                    locale: UserDefaults.standard.string(forKey: "speechLocale") ?? "en-US")
                guard self.token == token, !Task.isCancelled else {
                    await capture.stop()
                    return
                }
                phase = .listening
            } catch is CancellationError {} catch {
                self.error = error.localizedDescription
                phase = .idle
                continuous = false
            }
        }
    }
    func sendNow() {
        guard phase == .listening else { return }
        silence?.cancel()
        let submissionToken = token
        phase = .submitting
        operation = Task {
            await capture.stop()
            // Capture drains its ordered transcript callbacks before returning.
            await Task.yield()
            let text = (committed + " " + partial).trimmingCharacters(in: .whitespacesAndNewlines)
            guard continuous, token == submissionToken, !Task.isCancelled, let item else { return }
            if text.isEmpty {
                listen()
                return
            }
            if item.messages.isEmpty { item.title = String(text.prefix(70)) }
            partial = text
            committed = ""
            phase = .thinking
            onUtterance?(item, text)
        }
    }
    func respond(_ text: String) {
        guard continuous, phase == .thinking else { return }
        guard UserDefaults.standard.object(forKey: "spokenReplies") as? Bool ?? true else {
            listen()
            return
        }
        let clean = text.replacingOccurrences(of: "#", with: "").replacingOccurrences(of: "**", with: "")
        guard !clean.isEmpty else {
            listen()
            return
        }
        phase = .speaking
        let utterance = AVSpeechUtterance(string: String(clean.prefix(6000)))
        utterance.voice = AVSpeechSynthesisVoice(
            language: UserDefaults.standard.string(forKey: "speechLocale") ?? "en-US")
        speech.speak(utterance)
    }
    func interrupt() {
        guard phase == .speaking || phase == .thinking else { return }
        phase = .idle
        speech.stopSpeaking(at: .immediate)
        listen()
    }
    func stop() {
        guard phase != .stopping else { return }
        let preserveDraft = phase == .listening || phase == .starting || phase == .submitting
        continuous = false
        token = UUID()
        silence?.cancel()
        operation?.cancel()
        phase = .stopping
        speech.stopSpeaking(at: .immediate)
        operation = Task {
            await capture.stop()
            await Task.yield()
            let unsent = (committed + " " + partial).trimmingCharacters(in: .whitespacesAndNewlines)
            if preserveDraft, let item, !unsent.isEmpty,
                item.messages.last(where: { $0.role == "user" })?.text != unsent
            {
                item.draft = unsent
                library.changed(item, immediately: true)
            }
            phase = .idle
            level = 0
        }
    }
    private func receive(_ text: String, final: Bool) {
        if final {
            committed += (committed.isEmpty ? "" : " ") + text
            partial = ""
        } else {
            partial = text
        }
        guard phase == .listening, text != lastText else { return }
        lastText = text
        silence?.cancel()
        silence = Task {
            try? await Task.sleep(for: .seconds(1.8))
            guard !Task.isCancelled else { return }
            sendNow()
        }
    }
    nonisolated func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance
    ) {
        Task { @MainActor [weak self] in if self?.phase == .speaking { self?.listen() } }
    }
}
