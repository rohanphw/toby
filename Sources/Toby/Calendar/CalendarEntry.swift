import Foundation

struct CalendarEntry: Identifiable {
    let id: String
    let title: String
    let start: Date
    let end: Date
    let allDay: Bool
    let calendarName: String
    let account: String
    let conferenceURL: URL?
    let eventURL: URL?
    let externalID: String?

    var meeting: ScheduledMeeting? {
        guard !allDay, let url = conferenceURL else { return nil }
        return ScheduledMeeting(id: id, title: title, start: start, end: end, url: url)
    }
    var occurrenceKey: String {
        if let meeting { return meeting.occurrenceKey }
        return "\(externalID ?? id)-\(Int(start.timeIntervalSince1970))"
    }
    static var range: DateInterval {
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: .now)
        return DateInterval(start: start, end: calendar.date(byAdding: .day, value: 7, to: start)!)
    }
}
