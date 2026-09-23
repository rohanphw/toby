import AppKit
import Carbon
import Observation

@MainActor @Observable final class AppModel {
    enum Page: String, CaseIterable {
        case home = "Home"
        case library = "Library"
        case projects = "Projects"
        case tasks = "Tasks"
        case workflows = "Workflows"
        case calendar = "Calendar"
        case meetings = "Meetings"
        case memory = "Memory"
    }
    let onboarding = OnboardingState()
    let library: Library
    let workspace: WorkspaceStore
    private(set) var selectedProjectID: UUID?
    var showCapture = false
    var captureItem: LibraryItem?
    var contextSources: [UUID: [SourceReference]] = [:]
    let agent: AgentSession
    let voice: VoiceSession
    let meetings: MeetingSession
    let schedule = MeetingSchedule()
    let drive = GoogleDriveStore()
    let callDetection = CallDetection()
    private let meetingPrompt = MeetingPrompt()
    let account = AccountConnection()
    let grokAccount = AccountConnection(provider: .grok)
    private(set) var page: Page = .home
    private(set) var selected: LibraryItem?
    private(set) var backgroundVoice = false
    private struct Destination: Equatable {
        let page: Page
        let itemID: UUID?
        var projectID: UUID? = nil
    }
    private var backHistory: [Destination] = []
    private var forwardHistory: [Destination] = []
    private var destination: Destination {
        Destination(page: page, itemID: selected?.id, projectID: selectedProjectID)
    }
    var canGoBack: Bool { showSettings || !backHistory.isEmpty || selected != nil }
    var canGoForward: Bool { !showSettings && !forwardHistory.isEmpty }
    var navigationEnabled: Bool {
        !onboarding.isPresented && !showCapture && !showSearch && agent.approvals.isEmpty
            && agent.question == nil
    }
    func navigate(to page: Page) { visit(Destination(page: page, itemID: nil)) }
    func openItem(_ item: LibraryItem?) {
        guard let item else { return }
        visit(Destination(page: page, itemID: item.id, projectID: selectedProjectID))
    }
    func openProject(_ id: UUID?) { visit(Destination(page: .projects, itemID: nil, projectID: id)) }
    private func visit(_ next: Destination) {
        guard next != destination else { return }
        backHistory.append(destination)
        if backHistory.count > 100 { backHistory.removeFirst() }
        forwardHistory.removeAll()
        restore(next)
    }
    private func restore(_ next: Destination) {
        page = next.page
        selectedProjectID =
            workspace.data.projects.contains(where: { $0.id == next.projectID }) ? next.projectID : nil
        selected = next.itemID.flatMap { id in library.items.first { $0.id == id } }
    }
    func goBack() {
        guard navigationEnabled else { return }
        if showSettings {
            showSettings = false
            return
        }
        while let previous = backHistory.popLast() {
            if let id = previous.itemID, !library.items.contains(where: { $0.id == id }) { continue }
            forwardHistory.append(destination)
            restore(previous)
            return
        }
        if selected != nil {
            forwardHistory.append(destination)
            selected = nil
        }
    }
    func goForward() {
        guard navigationEnabled, !showSettings else { return }
        while let next = forwardHistory.popLast() {
            if let id = next.itemID, !library.items.contains(where: { $0.id == id }) { continue }
            backHistory.append(destination)
            restore(next)
            return
        }
    }
    func swipeNavigation(backward: Bool) {
        guard navigationEnabled else { return }
        if backward, canGoBack {
            goBack()
            return
        }
        if !backward, canGoForward {
            goForward()
            return
        }
        guard selected == nil, !showSettings,
            let index = Page.allCases.firstIndex(of: page)
        else { return }
        let next = index + (backward ? -1 : 1)
        guard Page.allCases.indices.contains(next) else { return }
        navigate(to: Page.allCases[next])
    }
    var pendingDeletion: LibraryItem?
    var canOrganizeLibrary: Bool { !agent.isRunning && !voice.active && !meetings.active && !drive.busy }
    func archive(_ item: LibraryItem) {
        guard canOrganizeLibrary else {
            notice = "Finish the current work before organizing chats."
            return
        }
        guard library.setArchived(!item.isArchived, item: item) else { return }
        forgetNavigation(item.id)
    }
    func requestDeletion(_ item: LibraryItem) {
        guard canOrganizeLibrary else {
            notice = "Finish the current work before deleting chats."
            return
        }
        pendingDeletion = item
    }
    func confirmDeletion(_ item: LibraryItem) {
        guard canOrganizeLibrary, library.items.contains(where: { $0 === item }) else { return }
        let id = item.id
        pendingDeletion = nil
        let wasSelected = selected === item
        if wasSelected { selected = nil }
        if library.delete(item) {
            workspace.reconcile(library: library)
            forgetNavigation(id)
        } else if wasSelected {
            selected = item
        }
    }
    private func forgetNavigation(_ id: UUID) {
        backHistory.removeAll { $0.itemID == id }
        forwardHistory.removeAll { $0.itemID == id }
        if selected?.id == id { selected = nil }
    }
    var search = ""
    var showSearch = false
    var notice: String?
    var showSettings = false
    var revealWorkspace: (() -> Void)?
    private var servicesStarted = false
    private let hotkey = GlobalShortcut()
    private let captureHotkey = GlobalShortcut(id: 2)
    init() throws {
        library = try Library()
        workspace = try WorkspaceStore()
        workspace.reconcile(library: library)
        agent = AgentSession(library: library)
        voice = VoiceSession(library: library)
        meetings = MeetingSession(library: library)
        agent.additionalContext = { [weak self] item, prompt in
            guard let self else { return "" }
            let scope = workspace.data.scopes[item.id.uuidString]
            let project = workspace.project(for: item)
            guard scope != nil || project != nil else { return "" }
            let scopeID = scope.flatMap(UUID.init(uuidString:)) ?? project?.id
            let items = projectItems(scopeID).filter { $0.id != item.id }
            let sources = LibraryContext.retrieve(
                prompt, documents: LibraryContext.documents(items), limit: 12, requireMatch: scope != nil)
            contextSources[item.id] = sources
            if scope != nil { item.threadID = nil }
            let heading =
                project.map { "Project: \($0.name)\nUser project context: \($0.detail)\n" }
                ?? "Library search\n"
            return heading + LibraryContext.citationRule + "\n" + LibraryContext.prompt(sources)
        }
        voice.onUtterance = { [weak self] item, text in
            guard let self else { return }
            if agent.isRunning {
                voice.error = "Another task is running. Your words have been saved as a draft."
                voice.stop()
                return
            }
            agent.send(text, to: item)
        }
        agent.onResponses = { [weak self] item, messageIDs in
            guard let self, let sources = contextSources.removeValue(forKey: item.id) else { return }
            workspace.update { data in
                for id in messageIDs { data.references[id.uuidString] = sources }
            }
        }
        agent.onCompletion = { [weak self] item, _ in
            guard let self else { return }
            if voice.item?.id == item.id { voice.responseCompleted() }
        }
        agent.onFailure = { [weak self] id, message in
            guard let self else { return }
            contextSources.removeValue(forKey: id)
            guard voice.item?.id == id, voice.active else { return }
            voice.error = message == "Stopped" ? nil : message
            voice.stop()
        }
        schedule.google.onDisconnect = { [weak self] id in
            self?.drive.removeAccount(id)
            self?.meetingPrompt.hide()
        }
        meetings.onFinished = { [weak self] item in self?.generateNotes(item) }
        schedule.onStart = { [weak self] event in
            guard let self, !onboarding.isPresented, !meetings.active, !voice.active else { return false }
            meetingPrompt.hide()
            meetings.start(title: event.title)
            if let item = meetings.item {
                item.calendarOccurrenceKey = event.occurrenceKey
                library.changed(item, immediately: true)
            }
            return true
        }
        schedule.onReminder = { [weak self] event in
            guard let self, !onboarding.isPresented, !meetings.active, !voice.active else { return false }
            return meetingPrompt.show(
                title: event.title,
                detail:
                    "\(event.start.formatted(date: .omitted, time: .shortened))–\(event.end.formatted(date: .omitted, time: .shortened))"
                    + (event.joinEmail.map { " · \($0)" } ?? ""),
                join: true,
                action: { [weak self] in
                    guard let self,
                        let current = schedule.upcoming.first(where: {
                            $0.id == event.id
                        }), current.end > .now, startMeeting(current)
                    else { return }
                    NSWorkspace.shared.open(current.joinURL)
                }, snooze: { [weak self] in self?.schedule.snooze(event) })
        }
        schedule.onHideReminder = { [weak self] in self?.meetingPrompt.hide() }
        callDetection.onDisabled = { [weak self] in self?.meetingPrompt.hide() }
        callDetection.onPossibleCall = { [weak self] app in
            guard let self, !onboarding.isPresented else { return false }
            if meetings.active || voice.active || schedule.recentlyPromptedCall() { return true }
            return meetingPrompt.show(
                title: "A conversation in \(app)?",
                detail: "Microphone in use · Start recording with Toby", join: false,
                action: { [weak self] in self?.startMeeting() })
        }
        schedule.onEnd = { [weak self] in self?.meetings.finish() }
    }
    func startServices() {
        guard !servicesStarted else { return }
        servicesStarted = true
        account.refresh()
        grokAccount.refresh()
        schedule.beginMonitoring()
        callDetection.start()
        hotkey.register { [weak self] in self?.startVoice() }
        if !captureHotkey.register(
            keyCode: UInt32(kVK_ANSI_C), action: { [weak self] in self?.beginCapture() })
        {
            notice =
                "The quick capture shortcut is already in use. Capture is still available from Toby’s menu bar or Services."
        }
    }
    func reopenSetup() {
        guard !voice.active, !meetings.active, !agent.isRunning else {
            notice = "Finish the current recording or task before reopening setup."
            return
        }
        showSettings = false
        meetingPrompt.hide()
        onboarding.reopen()
        account.refresh()
        grokAccount.refresh()
        revealWorkspace?()
    }
    func presentSettings() {
        guard !onboarding.isPresented else {
            revealWorkspace?()
            return
        }
        showSettings = true
        revealWorkspace?()
    }
    func startVoice(inBackground: Bool = false) {
        if !inBackground { revealWorkspace?() }
        if inBackground {
            notice = nil
            onboarding.refresh()
            guard !onboarding.isPresented else {
                notice = "Complete or skip setup in the workspace before talking."
                return
            }
            guard onboarding.microphone == .authorized, onboarding.speech == .authorized else {
                notice = "Allow microphone and speech recognition in setup first, then start talking here."
                return
            }
        }
        guard !onboarding.isPresented else { return }
        showSettings = false
        if voice.active {
            if !inBackground {
                backgroundVoice = false
                openItem(voice.item)
            }
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
        meetingPrompt.hide()
        backgroundVoice = inBackground
        voice.start()
        if !inBackground { openItem(voice.item) }
    }
    func endVoice() {
        backgroundVoice = false
        voice.stop()
        if agent.activeItemID == voice.item?.id { agent.stop() }
    }
    @discardableResult func startMeeting(_ event: ScheduledMeeting? = nil) -> Bool {
        revealWorkspace?()
        guard !onboarding.isPresented else { return false }
        showSettings = false
        guard !voice.active else {
            notice = "End the voice conversation before recording a meeting."
            return false
        }
        guard !meetings.active else {
            openItem(meetings.item)
            return false
        }
        meetingPrompt.hide()
        if let event { schedule.skip(event) }
        meetings.start(
            title: event?.title ?? "Meeting · \(Date().formatted(date: .abbreviated, time: .shortened))")
        if let event, let item = meetings.item {
            item.calendarOccurrenceKey = event.occurrenceKey
            library.changed(item, immediately: true)
        }
        openItem(meetings.item)
        return true
    }
    func finishMeeting() {
        schedule.manualFinish()
        meetings.finish()
    }
    func newNote() {
        guard !onboarding.isPresented else {
            revealWorkspace?()
            return
        }
        openItem(library.create(.thought, title: "Untitled note"))
    }
    func ask(_ text: String) {
        guard !onboarding.isPresented else { return }
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        guard !agent.isRunning else {
            notice = "Finish or stop the current task first."
            return
        }
        let item = library.create(.conversation, title: String(text.prefix(70)))
        openItem(item)
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
        drive.cancel()
        schedule.stopMonitoring()
        callDetection.stop()
        meetingPrompt.hide()
        hotkey.unregister()
        captureHotkey.unregister()
        account.cancel()
        grokAccount.cancel()
        agent.stop()
        voice.stop()
        if meetings.active { meetings.finish(generateNotes: false) }
        while voice.active || meetings.active { try? await Task.sleep(for: .milliseconds(50)) }
        library.save()
    }
}
