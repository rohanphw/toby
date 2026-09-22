import AppKit
import EventKit
import Observation

struct ScheduledMeeting: Identifiable {
    let id: String
    let title: String
    let start: Date
    let end: Date
    let url: URL
    var occurrenceKey: String {
        let host = url.host?.lowercased() ?? ""
        // Ignore tracking queries; the conference path and occurrence identify a call.
        return
            "\(host)\(url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))-\(Int(start.timeIntervalSince1970))"
    }
    static func conferenceURL(in content: String) -> URL? {
        guard let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        else { return nil }
        return detector.matches(in: content, range: NSRange(content.startIndex..., in: content)).compactMap(
            \.url
        ).first { url in
            guard ["https", "http"].contains(url.scheme?.lowercased() ?? ""),
                let host = url.host?.lowercased()
            else { return false }
            return [
                "meet.google.com", "zoom.us", "teams.microsoft.com", "teams.live.com",
                "teams.cloud.microsoft", "webex.com",
            ].contains { host == $0 || host.hasSuffix("." + $0) }
        }
    }
}

@MainActor @Observable final class MeetingSchedule {
    private(set) var upcoming: [ScheduledMeeting] = []
    private(set) var hasAccess = false
    let google = GoogleCalendarStore()
    var remindersEnabled: Bool {
        didSet {
            UserDefaults.standard.set(remindersEnabled, forKey: "meetingReminders")
            if !remindersEnabled { onHideReminder?() }
        }
    }
    var includeMacCalendars: Bool {
        didSet {
            UserDefaults.standard.set(includeMacCalendars, forKey: "includeMacCalendars")
            refresh()
        }
    }
    var hasCalendarConnection: Bool { (hasAccess && includeMacCalendars) || !google.accounts.isEmpty }
    var onReminder: ((ScheduledMeeting) -> Bool)?
    var onHideReminder: (() -> Void)?
    private var prompted: Set<String>
    private var snoozed: [String: Date] = [:]
    private var nextGoogleSync = Date.distantPast
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
        remindersEnabled = UserDefaults.standard.object(forKey: "meetingReminders") as? Bool ?? true
        includeMacCalendars = UserDefaults.standard.object(forKey: "includeMacCalendars") as? Bool ?? true
        prompted = Set(UserDefaults.standard.stringArray(forKey: "promptedMeetings") ?? [])
        automaticallyRecord = UserDefaults.standard.bool(forKey: "autoRecordMeetings")
        handled = Set(UserDefaults.standard.stringArray(forKey: "handledMeetings") ?? [])
        hasAccess = EKEventStore.authorizationStatus(for: .event) == .fullAccess
        google.onChange = { [weak self] in self?.refresh() }
    }
    func beginMonitoring() {
        guard timer == nil else { return }
        timer = Task {
            while !Task.isCancelled {
                if Date() >= nextGoogleSync {
                    nextGoogleSync = Date().addingTimeInterval(120)
                    if !google.refreshing { google.refresh() }
                }
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

        let predicate = calendar.predicateForEvents(
            withStart: Date().addingTimeInterval(-4 * 3600), end: Date().addingTimeInterval(24 * 3600),
            calendars: nil)
        let local: [ScheduledMeeting] =
            (hasAccess && includeMacCalendars ? calendar.events(matching: predicate) : []).filter {
                !$0.isAllDay && $0.endDate > .now
                    && !($0.attendees ?? []).contains {
                        $0.isCurrentUser && $0.participantStatus == .declined
                    }
            }
            .compactMap { event in
                guard let url = conferenceURL(event) else { return nil }
                return ScheduledMeeting(
                    id:
                        "\(event.eventIdentifier ?? event.calendarItemIdentifier)-\(Int(event.startDate.timeIntervalSince1970))",
                    title: event.title ?? "Meeting", start: event.startDate, end: event.endDate, url: url)
            }
        var seen = Set<String>()
        upcoming = (google.events + local).filter { $0.end > .now && seen.insert($0.occurrenceKey).inserted }
            .sorted { $0.start < $1.start }
        let relevant = Set(upcoming.map(\.occurrenceKey))
        // Keep recently shown occurrences across startup and transient Google sync failures.
        prompted = Set(
            prompted.filter {
                guard let stamp = $0.split(separator: "-").last.flatMap({ Double($0) }) else { return false }
                return stamp > Date().addingTimeInterval(-86400).timeIntervalSince1970
            })
        snoozed = snoozed.filter { relevant.contains($0.key) }
        UserDefaults.standard.set(Array(prompted), forKey: "promptedMeetings")
    }
    func snooze(_ meeting: ScheduledMeeting) {
        snoozed[meeting.occurrenceKey] = Date().addingTimeInterval(300)
        prompted.remove(meeting.occurrenceKey)
    }
    func skip(_ meeting: ScheduledMeeting) { markHandled(meeting.occurrenceKey) }
    func recentlyPromptedCall() -> Bool {
        upcoming.contains {
            (prompted.contains($0.occurrenceKey) || snoozed[$0.occurrenceKey] != nil)
                && abs($0.start.timeIntervalSinceNow) < 300
        }
    }
    func wasHandled(_ meeting: ScheduledMeeting) -> Bool {
        handled.contains(meeting.occurrenceKey) || handled.contains(meeting.id)
    }
    func manualFinish() { current = nil }
    func stopMonitoring() {
        timer?.cancel()
        timer = nil
        google.stop()
        onHideReminder?()
    }
    private func tick() {
        if let current, current.end <= .now {
            self.current = nil
            onEnd?()
        }
        if remindersEnabled, current == nil {
            for event in upcoming
            where !prompted.contains(event.occurrenceKey) && !wasHandled(event) {
                let snooze = snoozed[event.occurrenceKey]
                let eligible =
                    snooze.map { $0 <= .now && event.end > .now }
                    ?? (event.start.timeIntervalSinceNow <= 60 && event.start.timeIntervalSinceNow >= -300)
                if eligible, onReminder?(event) == true {
                    prompted.insert(event.occurrenceKey)
                    snoozed.removeValue(forKey: event.occurrenceKey)
                    UserDefaults.standard.set(Array(prompted), forKey: "promptedMeetings")
                    break
                }
            }
        }
        guard automaticallyRecord, current == nil else { return }
        // Only begin near the scheduled start, never halfway through a meeting after launch.
        guard
            let event = upcoming.first(where: {
                $0.start <= .now && Date().timeIntervalSince($0.start) < 90
                    && !wasHandled($0)
            })
        else { return }
        if onStart?(event) == true {
            current = event
            markHandled(event.occurrenceKey)
        }
    }
    private func markHandled(_ id: String) {
        handled.insert(id)
        let relevant = Set(upcoming.map(\.occurrenceKey))
        handled = handled.intersection(relevant.union([id]))
        UserDefaults.standard.set(Array(handled), forKey: "handledMeetings")
    }
    private func conferenceURL(_ event: EKEvent) -> URL? {
        let content = [event.url?.absoluteString, event.location, event.notes].compactMap { $0 }.joined(
            separator: " ")
        return ScheduledMeeting.conferenceURL(in: content)
    }
}
