import SwiftUI

struct CalendarPage: View {
    let model: AppModel
    @State private var period = 0
    @State private var showAccounts = false
    @State private var expandedEventID: String?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let periods = ["Today", "Tomorrow", "Upcoming"]
    private var entries: [CalendarEntry] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: .now)
        let start = calendar.date(byAdding: .day, value: period == 1 ? 1 : 0, to: today)!
        let end = calendar.date(byAdding: .day, value: period == 2 ? 7 : 1, to: start)!
        return model.schedule.agenda.filter { $0.start < end && $0.end > start }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 10) {
                    Eyebrow(text: Date().formatted(.dateTime.weekday(.wide).month(.wide).day()))
                    Text("Make space for what’s next.").font(Theme.heading(32))
                    Text("Your week, across all your calendars.")
                        .font(Theme.body).foregroundStyle(Theme.secondary)
                }
                Spacer()
                Button("Accounts") { showAccounts.toggle() }.buttonStyle(QuietButtonStyle())
                Button {
                    model.schedule.refresh()
                    model.schedule.google.refresh()
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .buttonStyle(QuietButtonStyle()).disabled(model.schedule.google.refreshing)
                .accessibilityLabel("Refresh calendar")
            }
            if showAccounts || !model.schedule.hasCalendarConnection {
                CalendarConnectionsView(schedule: model.schedule)
                    .frame(maxWidth: 540, alignment: .leading)
            }
            HStack(spacing: 24) {
                ForEach(periods.indices, id: \.self) { index in
                    Button {
                        period = index
                    } label: {
                        Text(periods[index]).font(Theme.label)
                            .foregroundStyle(period == index ? Theme.ink : Theme.secondary)
                            .padding(.vertical, 12)
                            .overlay(alignment: .bottom) {
                                Rectangle().fill(period == index ? Theme.ink : .clear).frame(height: 2)
                            }
                    }.buttonStyle(.plain).accessibilityAddTraits(period == index ? .isSelected : [])
                }
                Spacer()
                if model.schedule.google.refreshing { ProgressView().controlSize(.small) }
            }.overlay(alignment: .bottom) { Rectangle().fill(Theme.line).frame(height: 1) }
            if let error = model.schedule.error { ErrorNotice(message: error) }
            ForEach(model.schedule.google.accounts.filter { $0.error != nil }) { account in
                ErrorNotice(message: "\(account.email): \(account.error ?? "")", tone: .warning)
            }
            if entries.isEmpty {
                EmptyWorkspace(
                    symbol: "calendar", title: "A little breathing room.",
                    detail: model.schedule.google.refreshing
                        ? "Your calendars are syncing…" : "No events in this view.")
            }
            LazyVStack(alignment: .leading, spacing: 0) {
                ForEach(entries) { entry in
                    HStack(alignment: .top, spacing: 24) {
                        VStack(alignment: .leading, spacing: 5) {
                            if period == 2 {
                                Text(entry.start, format: .dateTime.weekday(.abbreviated).day()).font(
                                    Theme.label)
                            }
                            Text(
                                entry.allDay
                                    ? "All day" : entry.start.formatted(date: .omitted, time: .shortened)
                            )
                            .font(Theme.label)
                            if !entry.allDay {
                                Text(entry.end, format: .dateTime.hour().minute()).font(Theme.caption)
                                    .foregroundStyle(Theme.secondary)
                            }
                        }.frame(width: 110, alignment: .leading)
                        VStack(alignment: .leading, spacing: 8) {
                            Text(entry.title).font(Theme.heading(18))
                            Text("\(entry.calendarName) · \(entry.account)")
                                .font(Theme.caption).foregroundStyle(Theme.secondary)
                            if !entry.allDay && entry.start <= .now && entry.end > .now {
                                StatusLabel(text: "Happening now", tone: .success)
                            }
                            HStack(spacing: 10) {
                                if let meeting = entry.meeting {
                                    Button("Join") { NSWorkspace.shared.open(meeting.url) }
                                    Button("Join & take notes") {
                                        if model.startMeeting(meeting) {
                                            NSWorkspace.shared.open(meeting.url)
                                        }
                                    }.disabled(
                                        model.voice.active || model.meetings.active || entry.end <= .now)
                                }
                                if let note = model.library.items.first(where: {
                                    $0.calendarOccurrenceKey == entry.occurrenceKey
                                }) {
                                    Button("Open notes") { model.openItem(note) }
                                }
                                Button {
                                    withAnimation(reduceMotion ? nil : .easeInOut(duration: 0.2)) {
                                        expandedEventID = expandedEventID == entry.id ? nil : entry.id
                                    }
                                } label: {
                                    Label(
                                        expandedEventID == entry.id ? "Hide details" : "Event details",
                                        systemImage: expandedEventID == entry.id
                                            ? "chevron.up" : "chevron.down")
                                }
                                .accessibilityLabel("Event details for \(entry.title)")
                                .accessibilityValue(expandedEventID == entry.id ? "Expanded" : "Collapsed")
                            }.buttonStyle(QuietButtonStyle())
                            if expandedEventID == entry.id {
                                CalendarEventDetails(entry: entry)
                                    .padding(.top, 12)
                                    .transition(.opacity)
                            }
                        }
                        Spacer(minLength: 0)
                    }.padding(.vertical, 22)
                        .overlay(alignment: .bottom) { Rectangle().fill(Theme.line).frame(height: 1) }
                }
            }
        }.onAppear { model.schedule.refresh() }
    }
}
