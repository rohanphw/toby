import AppKit
import Observation

@MainActor @Observable final class AppModel {
    enum Page: String, CaseIterable {
        case home = "Home"
        case library = "Library"
        case meetings = "Meetings"
        case memory = "Memory"
    }
    let library: Library
    let agent: AgentSession
    let voice: VoiceSession
    let meetings: MeetingSession
    let schedule = MeetingSchedule()
    let account = AccountConnection()
    let grokAccount = AccountConnection(provider: .grok)
    var page: Page = .home
    var selected: LibraryItem?
    var search = ""
    var showSearch = false
    var notice: String?
    var showSettings = false
    var revealWorkspace: (() -> Void)?
    private var servicesStarted = false
    private let hotkey = GlobalShortcut()
    init() throws {
        library = try Library()
        agent = AgentSession(library: library)
        voice = VoiceSession(library: library)
        meetings = MeetingSession(library: library)
        voice.onUtterance = { [weak self] item, text in
            guard let self else { return }
            if agent.isRunning {
                voice.error = "Another task is running. Your words have been saved as a draft."
                voice.stop()
                return
            }
            agent.send(text, to: item)
        }
        agent.onCompletion = { [weak self] item, _ in
            guard let self else { return }
            if voice.item?.id == item.id { voice.responseCompleted() }
        }
        agent.onFailure = { [weak self] id, message in
            guard let self, voice.item?.id == id, voice.active else { return }
            voice.error = message == "Stopped" ? nil : message
            voice.stop()
        }
        meetings.onFinished = { [weak self] item in self?.generateNotes(item) }
        schedule.onStart = { [weak self] event in
            guard let self, !meetings.active, !voice.active else { return false }
            meetings.start(title: event.title)
            return true
        }
        schedule.onEnd = { [weak self] in self?.meetings.finish() }
    }
    func startServices() {
        guard !servicesStarted else { return }
        servicesStarted = true
        account.refresh()
        grokAccount.refresh()
        schedule.beginMonitoring()
        hotkey.register { [weak self] in self?.startVoice() }
    }
    func presentSettings() {
        showSettings = true
        revealWorkspace?()
    }
    func startVoice() {
        revealWorkspace?()
        showSettings = false
        if voice.active {
            selected = voice.item
            return
        }
        guard !meetings.active else {
            notice = "Finish the meeting recording before starting a voice conversation."
            return
        }
        guard !agent.isRunning else {
            notice = "Finish or stop the current task before starting a voice conversation."
            return
        }
        voice.start()
        selected = voice.item
    }
    func endVoice() {
        voice.stop()
        if agent.activeItemID == voice.item?.id { agent.stop() }
    }
    func startMeeting(_ event: ScheduledMeeting? = nil) {
        revealWorkspace?()
        showSettings = false
        guard !voice.active else {
            notice = "End the voice conversation before recording a meeting."
            return
        }
        if let event { schedule.skip(event) }
        meetings.start(
            title: event?.title ?? "Meeting · \(Date().formatted(date: .abbreviated, time: .shortened))")
        selected = meetings.item
    }
    func finishMeeting() {
        schedule.manualFinish()
        meetings.finish()
    }
    func newNote() { selected = library.create(.thought, title: "Untitled note") }
    func ask(_ text: String) {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        guard !agent.isRunning else {
            notice = "Finish or stop the current task first."
            return
        }
        let item = library.create(.conversation, title: String(text.prefix(70)))
        selected = item
        agent.send(text, to: item)
    }
    func generateNotes(_ item: LibraryItem) {
        guard !agent.isRunning else {
            notice =
                "Your recording and transcript are saved. Open the meeting and choose Generate notes when the current task finishes."
            return
        }
        agent.send(
            "Create useful meeting notes from the transcript: a concise summary, key decisions, and action items with owners and dates only when explicitly stated. Mark unclear points. Do not invent speakers or commitments.",
            to: item
        ) { [weak self, weak item] text in
            guard let self, let item else { return }
            item.notes = text
            library.changed(item, immediately: true)
        }
    }
    func shutdown() async {
        schedule.stopMonitoring()
        hotkey.unregister()
        account.cancel()
        grokAccount.cancel()
        agent.stop()
        voice.stop()
        if meetings.active { meetings.finish(generateNotes: false) }
        while voice.active || meetings.active { try? await Task.sleep(for: .milliseconds(50)) }
        library.save()
    }
}
