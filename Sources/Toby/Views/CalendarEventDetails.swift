import SwiftUI

struct CalendarEventDetails: View {
    let entry: CalendarEntry
    private var when: String {
        if entry.allDay {
            // Calendar APIs represent the end of an all-day event as an exclusive date.
            let lastDay = Calendar.current.date(byAdding: .day, value: -1, to: entry.end) ?? entry.start
            let first = entry.start.formatted(date: .complete, time: .omitted)
            return Calendar.current.isDate(entry.start, inSameDayAs: lastDay)
                ? "\(first) · All day"
                : "\(first) – \(lastDay.formatted(date: .complete, time: .omitted)) · All day"
        }
        return
            "\(entry.start.formatted(date: .abbreviated, time: .shortened)) – \(entry.end.formatted(date: .abbreviated, time: .shortened)) · \(TimeZone.current.identifier)"
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            field("When", value: when)
            if let location = entry.location,
                !location.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            {
                field("Where", value: location)
            }
            if let organizer = entry.organizer, !organizer.isEmpty {
                field("Organizer", value: organizer)
            }
            if !entry.guests.isEmpty {
                field("Guests · \(entry.guests.count)", value: entry.guests.joined(separator: "\n"))
            }
            if let details = entry.details, !details.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                field("About this event", value: details)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.leading, 16)
        .overlay(alignment: .leading) { Rectangle().fill(Theme.line).frame(width: 2) }
        .textSelection(.enabled)
    }
    private func field(_ title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title).font(Theme.caption).foregroundStyle(Theme.secondary)
            Text(value).font(Theme.body).foregroundStyle(Theme.ink)
                .lineSpacing(4).fixedSize(horizontal: false, vertical: true)
        }
    }
}
