import SwiftUI

struct DailyBriefView: View {
    let model: AppModel
    var body: some View {
        TimelineView(.periodic(from: .now, by: 60)) { timeline in
            let today = Calendar.current.startOfDay(for: timeline.date)
            let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: today) ?? today
            let tasks = model.workspace.visibleTasks(library: model.library).filter {
                $0.status == .open && $0.due.map { $0 < tomorrow } == true
            }.sorted { ($0.due ?? .distantFuture) < ($1.due ?? .distantFuture) }
            let events = model.schedule.agenda.filter { $0.start < tomorrow && $0.end > timeline.date }
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Text("Today, at a glance").font(Theme.heading(22))
                    Spacer()
                    Button("Write my brief") { model.dailyBrief() }
                        .buttonStyle(QuietButtonStyle()).disabled(!model.canStartWorkspaceTask)
                }
                if !model.schedule.hasCalendarConnection {
                    Text("Connect a calendar in Settings to include upcoming meetings.").font(Theme.caption)
                        .foregroundStyle(Theme.secondary)
                }
                if model.schedule.google.refreshing {
                    Text("Updating calendars…").font(Theme.caption).foregroundStyle(Theme.secondary)
                }
                if let error = model.schedule.error { ErrorNotice(message: error, tone: .warning) }
                ForEach(model.schedule.google.accounts.filter { $0.error != nil }) { account in
                    ErrorNotice(message: "\(account.email): \(account.error ?? "")", tone: .warning)
                }
                if events.isEmpty && tasks.isEmpty {
                    Text("No upcoming events or dated commitments in the current snapshot.").foregroundStyle(
                        Theme.secondary)
                }
                ForEach(events.prefix(6)) { event in
                    HStack {
                        Text(
                            event.allDay ? "All day" : event.start.formatted(date: .omitted, time: .shortened)
                        )
                        .font(Theme.caption).foregroundStyle(Theme.secondary).frame(
                            width: 75, alignment: .leading)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(event.title).font(Theme.label)
                            Text(event.account).font(Theme.caption).foregroundStyle(Theme.secondary)
                        }
                        Spacer()
                        Button("Prepare") { model.prepareMeeting(event) }.buttonStyle(QuietButtonStyle())
                            .disabled(!model.canStartWorkspaceTask)
                    }
                }
                if !tasks.isEmpty {
                    Text("Due today & overdue").font(Theme.label)
                    ForEach(tasks.prefix(5)) { task in TaskRow(model: model, task: task) }
                }
                HStack {
                    Button("All tasks") { model.navigate(to: .tasks) }
                    Button("Calendar") { model.navigate(to: .calendar) }
                    Spacer()
                    Text("Refreshes while Toby is open").font(Theme.caption).foregroundStyle(Theme.secondary)
                }.buttonStyle(.plain).font(Theme.caption)
            }.surface()
        }
    }
}
