import SwiftUI

struct CalendarConnectionsView: View {
    let schedule: MeetingSchedule
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                Label("Google Calendar", systemImage: "calendar").font(Theme.label)
                Spacer()
                if schedule.google.refreshing { ProgressView().controlSize(.small) }
                if !schedule.google.accounts.isEmpty {
                    Button {
                        schedule.google.refresh()
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(schedule.google.refreshing).help("Refresh calendars")
                }
            }
            Text("All your calendars, together.").font(Theme.caption).foregroundStyle(Theme.secondary)
            ForEach(schedule.google.accounts) { account in
                VStack(alignment: .leading, spacing: 12) {
                    StatusLabel(text: account.email, tone: account.error == nil ? .success : .warning)
                    ForEach(account.calendars) { calendar in
                        Toggle(
                            calendar.name,
                            isOn: Binding(
                                get: { calendar.selected },
                                set: {
                                    schedule.google.select(
                                        account: account.id, calendar: calendar.id, enabled: $0)
                                })
                        ).toggleStyle(.checkbox).font(Theme.caption)
                    }
                    if let error = account.error {
                        ErrorNotice(message: error)
                        Button("Reconnect") { schedule.google.connect() }.disabled(schedule.google.connecting)
                    }
                    DisclosureGroup("Account options") {
                        Button("Disconnect account") { schedule.google.disconnect(account.id) }
                            .disabled(schedule.google.connecting).padding(.top, 8)
                    }.font(Theme.caption).foregroundStyle(Theme.secondary)
                }.padding(.vertical, 6)
            }
            if schedule.google.connecting {
                HStack {
                    ProgressView().controlSize(.small)
                    Text("Continue in your browser…").font(Theme.caption)
                    Spacer()
                    Button("Cancel") { schedule.google.cancelConnection() }
                }
            } else {
                Button(schedule.google.accounts.isEmpty ? "Connect Google" : "Add Google account") {
                    schedule.google.connect()
                }
                .buttonStyle(PrimaryButtonStyle()).disabled(!schedule.google.hasClient)
            }
            if !schedule.google.hasClient {
                StatusLabel(text: "Google sign-in isn’t configured in this build yet.", tone: .warning)
            }
            if let error = schedule.google.error {
                ErrorNotice(message: error) { schedule.google.error = nil }
            }
            Divider().padding(.vertical, 8)
            Toggle(
                "Include Mac calendars",
                isOn: Binding(
                    get: { schedule.includeMacCalendars }, set: { schedule.includeMacCalendars = $0 })
            )
            .font(Theme.label).toggleStyle(.switch).controlSize(.small)
            if schedule.includeMacCalendars {
                if schedule.hasAccess {
                    StatusLabel(text: "Mac calendars connected", tone: .success)
                } else {
                    Button("Allow calendar access") { Task { await schedule.requestAccess() } }
                }
            }
        }.buttonStyle(QuietButtonStyle())
    }
}
