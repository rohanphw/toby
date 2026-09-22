import SwiftUI

struct MeetingsView: View {
    let model: AppModel
    var body: some View {
        VStack(alignment: .leading, spacing: 28) {
            Eyebrow(text: "Be present. Keep the details.")
            HStack {
                Text("A place for every conversation.").font(Theme.heading(30))
                Spacer()
                Button {
                    model.startMeeting()
                } label: {
                    Label("Record a meeting", systemImage: "record.circle")
                }
                .buttonStyle(QuietButtonStyle()).disabled(model.meetings.active || model.voice.active)
            }
            Text(
                "Capture your microphone and Mac audio, then turn the conversation into useful notes. Recordings and transcripts stay in your local library; generating notes sends transcript text to your selected provider."
            )
            .font(.system(size: 13)).lineSpacing(4).foregroundStyle(Theme.secondary).frame(
                maxWidth: 700, alignment: .leading)
            if !model.schedule.hasCalendarConnection {
                HStack {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Bring your calendar along.").font(Theme.heading(22))
                        Text("Connect Google accounts or calendars on your Mac to find upcoming calls.").font(
                            .system(size: 12)
                        ).foregroundStyle(Theme.secondary)
                    }
                    Spacer()
                    Button("Connect calendars") { model.presentSettings() }.buttonStyle(
                        QuietButtonStyle())
                }.surface()
            }
            if let error = model.schedule.error { ErrorNotice(message: error) { model.schedule.error = nil } }
            if !model.schedule.upcoming.isEmpty {
                Eyebrow(text: "Next 24 hours")
                ForEach(model.schedule.upcoming) { meeting in
                    HStack(spacing: 20) {
                        Text(meeting.start, format: .dateTime.hour().minute()).font(
                            .system(size: 13)
                        ).foregroundStyle(Theme.secondary).frame(width: 90, alignment: .leading)
                        Text(meeting.title).font(.system(size: 14))
                        Spacer()
                        Button("Join") { NSWorkspace.shared.open(meeting.url) }.buttonStyle(
                            QuietButtonStyle())
                        Button("Record") { model.startMeeting(meeting) }.buttonStyle(QuietButtonStyle())
                            .disabled(model.meetings.active || model.voice.active)
                        if model.schedule.automaticallyRecord, !model.schedule.wasHandled(meeting) {
                            Button("Skip auto-record") { model.schedule.skip(meeting) }.buttonStyle(.plain)
                                .font(.system(size: 11)).foregroundStyle(Theme.secondary)
                        }
                    }.padding(.vertical, 8)
                }
            }
            Eyebrow(text: "Meeting library")
            let items = model.library.items.filter { $0.kind == .meeting }.sorted {
                $0.createdAt > $1.createdAt
            }
            if items.isEmpty {
                EmptyWorkspace(
                    symbol: "person.2.wave.2", title: "Give the conversation your attention.",
                    detail: "Your recordings, transcripts and notes will be waiting here afterward.")
            }
            LazyVStack(spacing: 4) {
                ForEach(items) { item in LibraryRow(item: item) { model.selected = item } }
            }
        }
    }
}
