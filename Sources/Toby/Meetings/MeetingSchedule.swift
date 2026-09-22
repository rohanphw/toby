import AppKit
import EventKit
import Observation

struct ScheduledMeeting: Identifiable {
    let id: String
    let title: String
    let start: Date
    let end: Date
    let url: URL
}

@MainActor @Observable final class MeetingSchedule {
    private(set) var upcoming: [ScheduledMeeting] = []
    private(set) var hasAccess = false
    var error: String?
    var automaticallyRecord: Bool {
        didSet { UserDefaults.standard.set(automaticallyRecord, forKey: "autoRecordMeetings") }
    }
    var onStart: ((ScheduledMeeting) -> Bool)?
    var onEnd: (() -> Void)?
    private let calendar = EKEventStore()
    private var timer: Task<Void, Never>?
    private var handled: Set<String>
    private var current: ScheduledMeeting?
    init() {
        automaticallyRecord = UserDefaults.standard.bool(forKey: "autoRecordMeetings")
        handled = Set(UserDefaults.standard.stringArray(forKey: "handledMeetings") ?? [])
        hasAccess = EKEventStore.authorizationStatus(for: .event) == .fullAccess
    }
    func beginMonitoring() {
        guard timer == nil else { return }
        timer = Task {
            while !Task.isCancelled {
                refresh()
                tick()
                try? await Task.sleep(for: .seconds(20))
            }
        }
    }
    func requestAccess() async {
        do {
            hasAccess = try await calendar.requestFullAccessToEvents()
            if hasAccess { refresh() }
        } catch { self.error = error.localizedDescription }
    }
    func refresh() {
        hasAccess = EKEventStore.authorizationStatus(for: .event) == .fullAccess
        guard hasAccess else {
            upcoming = []
            return
        }
        let predicate = calendar.predicateForEvents(
            withStart: Date().addingTimeInterval(-4 * 3600), end: Date().addingTimeInterval(24 * 3600),
            calendars: nil)
        upcoming = calendar.events(matching: predicate).filter { !$0.isAllDay && $0.endDate > .now }
            .compactMap { event in
                guard let url = conferenceURL(event) else { return nil }
                return ScheduledMeeting(
                    id:
                        "\(event.eventIdentifier ?? event.calendarItemIdentifier)-\(Int(event.startDate.timeIntervalSince1970))",
                    title: event.title ?? "Meeting", start: event.startDate, end: event.endDate, url: url)
            }.sorted { $0.start < $1.start }
    }
    func skip(_ meeting: ScheduledMeeting) { markHandled(meeting.id) }
    func wasHandled(_ meeting: ScheduledMeeting) -> Bool { handled.contains(meeting.id) }
    func manualFinish() { current = nil }
    func stopMonitoring() {
        timer?.cancel()
        timer = nil
    }
    private func tick() {
        if let current, current.end <= .now {
            self.current = nil
            onEnd?()
        }
        guard automaticallyRecord, current == nil else { return }
        // Only begin near the scheduled start, never halfway through a meeting after launch.
        guard
            let event = upcoming.first(where: {
                $0.start <= .now && Date().timeIntervalSince($0.start) < 90 && !handled.contains($0.id)
            })
        else { return }
        if onStart?(event) == true {
            current = event
            markHandled(event.id)
        }
    }
    private func markHandled(_ id: String) {
        handled.insert(id)
        let relevant = Set(upcoming.map(\.id))
        handled = handled.intersection(relevant.union([id]))
        UserDefaults.standard.set(Array(handled), forKey: "handledMeetings")
    }
    private func conferenceURL(_ event: EKEvent) -> URL? {
        let content = [event.url?.absoluteString, event.location, event.notes].compactMap { $0 }.joined(
            separator: " ")
        guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        else { return nil }
        return detector.matches(in: content, range: NSRange(content.startIndex..., in: content)).compactMap(
            \.url
        ).first { url in
            guard let host = url.host?.lowercased() else { return false }
            return ["meet.google.com", "zoom.us", "teams.microsoft.com", "teams.live.com", "webex.com"]
                .contains { host == $0 || host.hasSuffix("." + $0) }
        }
    }
}
