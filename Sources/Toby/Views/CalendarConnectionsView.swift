import SwiftUI

struct CalendarConnectionsView: View {
    let schedule: MeetingSchedule
    @State private var showSetup = false
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Google Calendar").font(Theme.label)
                Spacer()
                if schedule.google.refreshing { ProgressView().controlSize(.small) }
                Button("Refresh") { schedule.google.refresh() }.disabled(
                    schedule.google.refreshing || schedule.google.accounts.isEmpty)
            }
            Text(
                "Connect Google directly. Choose calendars from each account below; macOS Calendar is optional."
            )
            .font(Theme.caption).foregroundStyle(Theme.secondary)
            ForEach(schedule.google.accounts) { account in
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        StatusLabel(text: account.email, tone: account.error == nil ? .success : .warning)
                        Spacer()
                        Button("Disconnect") { schedule.google.disconnect(account.id) }
                            .disabled(schedule.google.connecting)
                    }
                    ForEach(account.calendars) { calendar in
                        Toggle(
                            calendar.name,
                            isOn: Binding(
                                get: { calendar.selected },
                                set: {
                                    schedule.google.select(
                                        account: account.id, calendar: calendar.id, enabled: $0)
                                })
                        ).toggleStyle(.checkbox)
                    }
                    if let error = account.error {
                        ErrorNotice(message: error)
                        Button("Reconnect account") { schedule.google.connect() }.disabled(
                            schedule.google.connecting)
                    } else if let synced = account.lastSynced {
                        Text("Last synced \(synced.formatted(date: .omitted, time: .shortened))")
                            .font(.system(size: 11)).foregroundStyle(Theme.secondary)
                    }
                }.padding(.vertical, 8)
            }
            HStack {
                if schedule.google.connecting {
                    ProgressView().controlSize(.small)
                    Text("Finish sign-in in your browser…").font(Theme.caption)
                    Button("Cancel") { schedule.google.cancelConnection() }
                } else {
                    Button(
                        schedule.google.accounts.isEmpty
                            ? "Connect Google account" : "Add another Google account"
                    ) { schedule.google.connect() }
                    .disabled(!schedule.google.hasClient)
                }
            }
            DisclosureGroup("Google connection setup", isExpanded: $showSetup) {
                VStack(alignment: .leading, spacing: 10) {
                    Text(
                        "1. Create a project in Google Cloud and enable the Google Calendar API.\n2. Configure Google Auth Platform branding and audience. While in Testing, add each Google account as a test user.\n3. Create an OAuth client with application type Desktop app, then download its JSON.\n4. Import that JSON here, connect your accounts, and grant both calendar read permissions."
                    )
                    .font(Theme.caption).foregroundStyle(Theme.secondary).lineSpacing(4)
                    Link(
                        "Open Google Cloud setup ↗",
                        destination: URL(
                            string:
                                "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com")!
                    )
                    Link(
                        "Google’s desktop sign-in guide ↗",
                        destination: URL(
                            string: "https://developers.google.com/identity/protocols/oauth2/native-app")!)
                    Button(schedule.google.hasClient ? "Replace client JSON…" : "Import client JSON…") {
                        schedule.google.importClient()
                    }
                    .disabled(schedule.google.connecting || schedule.google.refreshing)
                    Text(
                        "Credentials stay in Keychain. Google projects in Testing may require reconnecting after seven days. Disconnect removes this account’s credentials from Toby; you can also revoke access in Google."
                    )
                    .font(.system(size: 11)).foregroundStyle(Theme.secondary)
                    Link(
                        "Manage Google account access ↗",
                        destination: URL(string: "https://myaccount.google.com/connections")!)
                }.padding(.top, 8)
            }.onAppear { showSetup = !schedule.google.hasClient }
            if let error = schedule.google.error {
                ErrorNotice(message: error) { schedule.google.error = nil }
            }
            Divider()
            Toggle(
                "Also include macOS calendars",
                isOn: Binding(
                    get: { schedule.includeMacCalendars }, set: { schedule.includeMacCalendars = $0 }))
            if schedule.includeMacCalendars {
                HStack {
                    StatusLabel(
                        text: schedule.hasAccess ? "Mac calendars connected" : "Mac calendar access needed",
                        tone: schedule.hasAccess ? .success : .warning)
                    Spacer()
                    if !schedule.hasAccess {
                        Button("Allow access") { Task { await schedule.requestAccess() } }
                    }
                }
                Text(
                    "Includes calendars synced to this Mac. Duplicate calls are combined with Google results."
                )
                .font(.system(size: 11)).foregroundStyle(Theme.secondary)
            }
        }.buttonStyle(QuietButtonStyle())
    }
}
