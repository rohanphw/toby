import SwiftUI

struct DriveToolsView: View {
    let model: AppModel
    let item: LibraryItem
    @State private var expanded = false
    @State private var selectedID: String?
    @State private var choosingAccount = false
    private var account: GoogleCalendarAccount? {
        if let selectedID, let selected = model.schedule.google.accounts.first(where: { $0.id == selectedID })
        {
            return selected
        }
        return model.schedule.google.accounts.first
    }
    private var content: String { item.kind == .meeting && !item.notes.isEmpty ? item.notes : item.body }
    private var statusVisible: Bool { model.drive.itemID == item.id }
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Button {
                expanded.toggle()
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "externaldrive")
                    Text("Google Drive")
                    Image(systemName: expanded ? "chevron.up" : "chevron.down").font(.system(size: 10))
                }.font(Theme.label)
            }.buttonStyle(.plain).foregroundStyle(Theme.secondary)
            if expanded {
                if let account {
                    Button {
                        choosingAccount.toggle()
                    } label: {
                        HStack {
                            Text(account.email).lineLimit(1)
                            Image(systemName: "chevron.down")
                        }
                    }.buttonStyle(QuietButtonStyle()).disabled(model.drive.busy)
                        .popover(isPresented: $choosingAccount, arrowEdge: .bottom) {
                            VStack(alignment: .leading, spacing: 4) {
                                ForEach(model.schedule.google.accounts) { candidate in
                                    Button {
                                        selectedID = candidate.id
                                        choosingAccount = false
                                    } label: {
                                        HStack {
                                            Text(candidate.email)
                                            Spacer()
                                            if candidate.id == account.id { Image(systemName: "checkmark") }
                                        }.padding(10).contentShape(Rectangle())
                                    }.buttonStyle(.plain)
                                }
                            }.padding(8).frame(width: 320).background(Theme.drawer)
                        }
                    Text("Choose files to attach, or save a new copy of this document to your Drive.")
                        .font(Theme.caption).foregroundStyle(Theme.secondary)
                    HStack {
                        Button("Add from Drive") {
                            model.drive.importFiles(
                                account: account, google: model.schedule.google,
                                item: item, library: model.library)
                        }
                        if item.kind != .conversation {
                            Button(
                                item.kind == .meeting && item.notes.isEmpty
                                    ? "Save transcript as Google Doc" : "Save as Google Doc"
                            ) {
                                model.drive.saveDocument(
                                    account: account, google: model.schedule.google, item: item,
                                    content: content)
                            }.disabled(
                                content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                                    || account.driveEnabled != true)
                        }
                    }.buttonStyle(QuietButtonStyle())
                        .disabled(
                            model.drive.busy || model.agent.isRunning || model.meetings.item?.id == item.id)
                    if account.driveEnabled != true {
                        HStack {
                            Text("Reconnect to enable saving to Drive.").font(Theme.caption).foregroundStyle(
                                Theme.secondary)
                            Button("Enable Drive") { model.schedule.google.connect(email: account.email) }
                                .buttonStyle(QuietButtonStyle()).disabled(model.schedule.google.connecting)
                        }
                    }
                } else {
                    Text("Connect a Google account to bring files into this conversation.")
                        .font(Theme.caption).foregroundStyle(Theme.secondary)
                    Button("Connect Google") { model.schedule.google.connect() }
                        .buttonStyle(QuietButtonStyle()).disabled(
                            model.schedule.google.connecting || !model.schedule.google.hasClient)
                }
                if model.schedule.google.connecting {
                    HStack {
                        ProgressView().controlSize(.small)
                        Text("Continue in your browser…").font(Theme.caption)
                        Button("Cancel") { model.schedule.google.cancelConnection() }.buttonStyle(.plain)
                    }
                }
                if let error = model.schedule.google.error {
                    ErrorNotice(message: error) { model.schedule.google.error = nil }
                }
            }
            if statusVisible {
                if model.drive.busy {
                    HStack {
                        ProgressView().controlSize(.small)
                        Text(model.drive.phase).font(Theme.caption)
                        Button("Cancel") { model.drive.cancel() }.buttonStyle(.plain)
                    }
                }
                if let message = model.drive.message {
                    StatusLabel(text: message, tone: .success)
                }
                if let url = model.drive.documentURL {
                    Link("Open Google Doc ↗", destination: url).font(Theme.label).foregroundStyle(Theme.ink)
                }
                if let error = model.drive.error { ErrorNotice(message: error) { model.drive.error = nil } }
            }
        }.padding(.vertical, 6)
    }
}
