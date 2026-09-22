import Foundation
import Observation

@MainActor @Observable final class GoogleDriveStore {
    private(set) var busy = false
    private(set) var itemID: UUID?
    private(set) var accountID: String?
    private(set) var phase = ""
    private(set) var message: String?
    private(set) var documentURL: URL?
    var error: String?
    private var operation: Task<Void, Never>?
    private var picker: GoogleOAuth?
    private var uploading = false

    func cancel() {
        guard busy else { return }
        operation?.cancel()
        picker?.cancel()
        if uploading { error = "Saving was interrupted. Check Google Drive before saving another copy." }
    }
    func removeAccount(_ id: String) { if accountID == id { cancel() } }

    func importFiles(
        account: GoogleCalendarAccount, google: GoogleCalendarStore, item: LibraryItem, library: Library
    ) {
        guard !busy else { return }
        begin(account: account.id, item: item.id, phase: "Choose files in your browser…")
        operation = Task {
            defer { finish() }
            do {
                guard let client = try GoogleCalendarStore.appClient() else {
                    throw CalendarFailure(message: "Google sign-in is not configured in this build.")
                }
                let auth = GoogleOAuth()
                picker = auth
                // Picker requires drive.file alone. Never overwrite the Calendar token with this grant.
                let tokens = try await auth.authorize(
                    client: client, pickingFiles: true, email: account.email)
                try checkAccount(account.id, google: google)
                let identity = try await json(
                    "https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)",
                    token: tokens.accessToken)
                guard let user = identity["user"] as? [String: Any],
                    (user["emailAddress"] as? String)?.lowercased() == account.email.lowercased()
                else {
                    throw CalendarFailure(
                        message:
                            "Choose \(account.email) in the browser, or select the other account in Toby.")
                }
                guard !auth.pickedFileIDs.isEmpty else {
                    message = "No files selected."
                    return
                }
                var count = 0
                for id in auth.pickedFileIDs {
                    try checkAccount(account.id, google: google)
                    phase = "Importing file \(count + 1) of \(auth.pickedFileIDs.count)…"
                    let escaped = id.addingPercentEncoding(withAllowedCharacters: .alphanumerics)!
                    let base = "https://www.googleapis.com/drive/v3/files/\(escaped)"
                    let metadata = try await json(
                        base + "?fields=name,mimeType,size&supportsAllDrives=true", token: tokens.accessToken)
                    let mime = metadata["mimeType"] as? String ?? ""
                    var name = metadata["name"] as? String ?? "Drive file"
                    var url = base + "?alt=media&supportsAllDrives=true"
                    if mime.hasPrefix("application/vnd.google-apps.") {
                        let export: (String, String)
                        switch mime {
                        case "application/vnd.google-apps.document": export = ("text/plain", ".txt")
                        case "application/vnd.google-apps.spreadsheet":
                            export = (
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"
                            )
                        case "application/vnd.google-apps.presentation": export = ("application/pdf", ".pdf")
                        default:
                            throw CalendarFailure(
                                message:
                                    "‘\(name)’ cannot be imported. Choose a document, spreadsheet, presentation or regular file."
                            )
                        }
                        url =
                            base + "/export?mimeType=" + export.0.addingPercentEncoding(
                                withAllowedCharacters: .alphanumerics)!
                        name += export.1
                    } else if let size = (metadata["size"] as? String).flatMap(Int.init), size > 20_000_000 {
                        throw CalendarFailure(message: "‘\(name)’ is larger than the 20 MB attachment limit.")
                    }
                    var request = URLRequest(url: URL(string: url)!)
                    request.setValue("Bearer \(tokens.accessToken)", forHTTPHeaderField: "Authorization")
                    request.timeoutInterval = 60
                    let (temporary, response) = try await URLSession.shared.download(for: request)
                    defer { try? FileManager.default.removeItem(at: temporary) }
                    try validate(response)
                    try checkAccount(account.id, google: google)
                    let size = try temporary.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
                    guard size <= 20_000_000 else {
                        throw CalendarFailure(message: "‘\(name)’ exceeds the 20 MB attachment limit.")
                    }
                    guard library.items.contains(where: { $0.id == item.id }) else {
                        throw CancellationError()
                    }
                    try library.attachDownloadedFile(temporary, name: name, to: item)
                    count += 1
                    message = "\(count) \(count == 1 ? "file attached" : "files attached")."
                }
            } catch is CancellationError {} catch { self.error = error.localizedDescription }
        }
    }

    func saveDocument(
        account: GoogleCalendarAccount, google: GoogleCalendarStore, item: LibraryItem, content: String
    ) {
        guard !busy else { return }
        begin(account: account.id, item: item.id, phase: "Saving to Google Drive…")
        let title = item.title
        operation = Task {
            defer { finish() }
            do {
                guard content.utf8.count <= 5_000_000 else {
                    throw CalendarFailure(
                        message: "This document exceeds the 5 MB export limit. Export it locally instead.")
                }
                let token = try await google.accessToken(account.id, forDrive: true)
                try checkAccount(account.id, google: google)
                let boundary = "toby-\(UUID().uuidString)"
                let metadata = try JSONSerialization.data(withJSONObject: [
                    "name": title, "mimeType": "application/vnd.google-apps.document",
                ])
                var body = Data("--\(boundary)\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n".utf8)
                body.append(metadata)
                body.append(
                    Data(
                        "\r\n--\(boundary)\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n\(content)\r\n--\(boundary)--\r\n"
                            .utf8))
                var request = URLRequest(
                    url: URL(
                        string:
                            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink"
                    )!)
                request.httpMethod = "POST"
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                request.setValue(
                    "multipart/related; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
                request.httpBody = body
                request.timeoutInterval = 60
                uploading = true
                let (data, response) = try await URLSession.shared.data(for: request)
                try validate(response)
                let result = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                guard let id = result?["id"] as? String,
                    let escaped = id.addingPercentEncoding(withAllowedCharacters: .alphanumerics)
                else {
                    throw CalendarFailure(
                        message: "Google did not return the saved document. Check Drive before trying again.")
                }
                documentURL = URL(string: "https://docs.google.com/document/d/\(escaped)/edit")
                message = "Saved to \(account.email)."
            } catch is CancellationError {
                if uploading {
                    self.error = "Saving was interrupted. Check Drive before saving another copy."
                }
            } catch {
                self.error =
                    uploading
                    ? "Could not confirm the save. Check Drive before saving another copy. \(error.localizedDescription)"
                    : error.localizedDescription
            }
        }
    }
    private func begin(account: String, item: UUID, phase: String) {
        busy = true
        accountID = account
        itemID = item
        self.phase = phase
        message = nil
        documentURL = nil
        error = nil
        uploading = false
    }
    private func finish() {
        busy = false
        picker = nil
        operation = nil
        uploading = false
    }
    private func checkAccount(_ id: String, google: GoogleCalendarStore) throws {
        try Task.checkCancellation()
        guard google.accounts.contains(where: { $0.id == id }) else { throw CancellationError() }
    }
    private func json(_ url: String, token: String) async throws -> [String: Any] {
        var request = URLRequest(url: URL(string: url)!)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 30
        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response)
        guard let result = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw CalendarFailure(message: "Google returned an unreadable response.")
        }
        return result
    }
    private func validate(_ response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse else {
            throw CalendarFailure(message: "Google Drive did not respond.")
        }
        guard (200..<300).contains(http.statusCode) else {
            switch http.statusCode {
            case 401: throw CalendarFailure(message: "Google access expired. Reconnect this account.")
            case 403:
                throw CalendarFailure(
                    message:
                        "Drive access was denied. Check this file’s permissions and that Toby’s Drive API is enabled."
                )
            case 404:
                throw CalendarFailure(
                    message: "This file is no longer available. Choose it again from Drive.")
            default: throw CalendarFailure(message: "Google Drive returned an error (\(http.statusCode)).")
            }
        }
    }
}
