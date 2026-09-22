import AppKit
import Observation
import UniformTypeIdentifiers

struct GoogleCalendarChoice: Codable, Identifiable {
    let id: String
    let name: String
    var selected: Bool
}
struct GoogleCalendarAccount: Codable, Identifiable {
    let id: String
    let email: String
    var calendars: [GoogleCalendarChoice]
    var lastSynced: Date?
    var error: String?
}

@MainActor @Observable final class GoogleCalendarStore {
    private(set) var accounts: [GoogleCalendarAccount] = []
    private(set) var events: [ScheduledMeeting] = []
    private(set) var hasClient = false
    private(set) var connecting = false
    private(set) var refreshing = false
    var error: String?
    var onChange: (() -> Void)?
    private var oauth: GoogleOAuth?
    private var task: Task<Void, Never>?
    private var connectTask: Task<Void, Never>?
    private var eventsByAccount: [String: [ScheduledMeeting]] = [:]
    private var revision = UUID()

    init() {
        if let data = UserDefaults.standard.data(forKey: "googleCalendarAccounts") {
            accounts = (try? JSONDecoder().decode([GoogleCalendarAccount].self, from: data)) ?? []
        }
        do {
            let client: GoogleClient? = try CalendarKeychain.read("client")
            hasClient = client != nil
        } catch { self.error = error.localizedDescription }
    }
    func importClient() {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.json]
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = false
        panel.message = "Choose the Desktop OAuth client JSON downloaded from Google Cloud."
        panel.begin { [weak self] result in
            Task { @MainActor in
                guard let self, result == .OK, let url = panel.url else { return }
                do {
                    struct Download: Decodable { let installed: GoogleClient }
                    let client = try JSONDecoder().decode(Download.self, from: Data(contentsOf: url))
                        .installed
                    guard client.clientID.hasSuffix(".apps.googleusercontent.com") else {
                        throw CalendarFailure(message: "Choose a Google Desktop OAuth client JSON.")
                    }
                    let old: GoogleClient? = try CalendarKeychain.read("client")
                    guard self.accounts.isEmpty || old?.clientID == client.clientID else {
                        throw CalendarFailure(
                            message: "Disconnect existing Google accounts before replacing the OAuth client.")
                    }
                    try CalendarKeychain.save(client, key: "client")
                    self.hasClient = true
                    self.error = nil
                } catch { self.error = error.localizedDescription }
            }
        }
    }
    func connect() {
        guard !connecting else { return }
        connecting = true
        error = nil
        connectTask = Task {
            defer {
                connecting = false
                oauth = nil
                connectTask = nil
            }
            do {
                guard let client: GoogleClient = try CalendarKeychain.read("client") else {
                    throw CalendarFailure(message: "Import a Google Desktop OAuth client first.")
                }
                let auth = GoogleOAuth()
                oauth = auth
                let tokens = try await auth.authorize(client: client)
                try Task.checkCancellation()
                let granted = Set((tokens.scope ?? "").split(separator: " ").map(String.init))
                guard granted.contains("https://www.googleapis.com/auth/calendar.calendarlist.readonly"),
                    granted.contains("https://www.googleapis.com/auth/calendar.events.readonly")
                else {
                    throw CalendarFailure(
                        message:
                            "Calendar access was not granted. Connect again and allow both calendar permissions."
                    )
                }
                let profile = try await Self.get(
                    URL(string: "https://openidconnect.googleapis.com/v1/userinfo")!,
                    token: tokens.accessToken)
                guard let id = profile["sub"] as? String, let email = profile["email"] as? String else {
                    throw CalendarFailure(message: "Google did not return an account identity.")
                }
                var saved = tokens
                if saved.refreshToken == nil {
                    let previous: GoogleTokens? = try CalendarKeychain.read(id)
                    saved.refreshToken = previous?.refreshToken
                }
                guard saved.refreshToken != nil else {
                    throw CalendarFailure(
                        message:
                            "Google did not grant offline access. Remove Toby’s access in your Google account and connect again."
                    )
                }
                try Task.checkCancellation()
                try CalendarKeychain.save(saved, key: id)
                if !accounts.contains(where: { $0.id == id }) {
                    accounts.append(.init(id: id, email: email, calendars: []))
                }
                persist()
                refresh()
            } catch is CancellationError {} catch { self.error = error.localizedDescription }
        }
    }
    func cancelConnection() {
        connectTask?.cancel()
        oauth?.cancel()
    }
    func disconnect(_ id: String) {
        do {
            try CalendarKeychain.remove(id)
            accounts.removeAll { $0.id == id }
            eventsByAccount.removeValue(forKey: id)
            persist()
            publish()
            refresh()
        } catch { self.error = error.localizedDescription }
    }
    func select(account id: String, calendar calendarID: String, enabled: Bool) {
        guard let index = accounts.firstIndex(where: { $0.id == id }),
            let c = accounts[index].calendars.firstIndex(where: { $0.id == calendarID })
        else { return }
        accounts[index].calendars[c].selected = enabled
        // Remove cached events immediately when preferences change; republish only selected calendars.
        eventsByAccount[id] = []
        persist()
        publish()
        refresh()
    }
    func refresh() {
        revision = UUID()
        task?.cancel()
        let generation = revision
        refreshing = true
        task = Task {
            defer { if revision == generation { refreshing = false } }
            for account in accounts {
                do {
                    let token = try await accessToken(account.id)
                    let list = try await pages(path: "users/me/calendarList", token: token, query: [])
                    let previous = Dictionary(
                        uniqueKeysWithValues: account.calendars.map { ($0.id, $0.selected) })
                    let calendars = list.compactMap { item -> GoogleCalendarChoice? in
                        guard let id = item["id"] as? String, item["deleted"] as? Bool != true else {
                            return nil
                        }
                        return .init(
                            id: id,
                            name: item["summaryOverride"] as? String ?? item["summary"] as? String ?? id,
                            selected: previous[id] ?? true)
                    }
                    var meetings: [ScheduledMeeting] = []
                    let formatter = ISO8601DateFormatter()
                    let query = [
                        URLQueryItem(
                            name: "timeMin",
                            value: formatter.string(from: Date().addingTimeInterval(-4 * 3600))),
                        URLQueryItem(
                            name: "timeMax",
                            value: formatter.string(from: Date().addingTimeInterval(24 * 3600))),
                        URLQueryItem(name: "singleEvents", value: "true"),
                        URLQueryItem(name: "orderBy", value: "startTime"),
                    ]
                    for calendar in calendars where calendar.selected {
                        let escaped = calendar.id.addingPercentEncoding(
                            withAllowedCharacters: .alphanumerics)!
                        let items = try await pages(
                            path: "calendars/\(escaped)/events", token: token, query: query)
                        meetings += items.compactMap { item in
                            guard item["status"] as? String != "cancelled",
                                !((item["attendees"] as? [[String: Any]] ?? []).contains {
                                    $0["self"] as? Bool == true
                                        && $0["responseStatus"] as? String == "declined"
                                }),
                                let startText = (item["start"] as? [String: Any])?["dateTime"] as? String,
                                let endText = (item["end"] as? [String: Any])?["dateTime"] as? String,
                                let start = Self.date(startText), let end = Self.date(endText), end > .now,
                                let eventID = item["id"] as? String
                            else { return nil }
                            let conference = item["conferenceData"] as? [String: Any]
                            let video =
                                (conference?["entryPoints"] as? [[String: Any]])?.first {
                                    $0["entryPointType"] as? String == "video"
                                }?["uri"] as? String
                            let text = [
                                item["hangoutLink"] as? String, video, item["location"] as? String,
                                item["description"] as? String,
                            ].compactMap { $0 }.joined(separator: " ")
                            guard let url = ScheduledMeeting.conferenceURL(in: text) else { return nil }
                            return ScheduledMeeting(
                                id:
                                    "google-\(account.id)-\(calendar.id)-\(eventID)-\(Int(start.timeIntervalSince1970))",
                                title: item["summary"] as? String ?? "Meeting", start: start, end: end,
                                url: url)
                        }
                    }
                    try Task.checkCancellation()
                    guard revision == generation,
                        let index = accounts.firstIndex(where: { $0.id == account.id })
                    else { return }
                    accounts[index].calendars = calendars
                    accounts[index].lastSynced = .now
                    accounts[index].error = nil
                    eventsByAccount[account.id] = meetings
                } catch is CancellationError { return } catch {
                    guard revision == generation,
                        let index = accounts.firstIndex(where: { $0.id == account.id })
                    else { return }
                    accounts[index].error = error.localizedDescription
                    eventsByAccount[account.id] = []
                }
            }
            guard revision == generation else { return }
            persist()
            publish()
        }
    }
    func stop() {
        revision = UUID()
        task?.cancel()
        cancelConnection()
    }
    private func persist() {
        UserDefaults.standard.set(try? JSONEncoder().encode(accounts), forKey: "googleCalendarAccounts")
    }
    private func publish() {
        events = eventsByAccount.values.flatMap { $0 }
        onChange?()
    }
    private func accessToken(_ id: String) async throws -> String {
        guard var token: GoogleTokens = try CalendarKeychain.read(id) else {
            throw CalendarFailure(message: "Reconnect this Google account.")
        }
        if (token.expiresAt ?? .distantPast).timeIntervalSinceNow > 120 { return token.accessToken }
        guard let refresh = token.refreshToken,
            let client: GoogleClient = try CalendarKeychain.read("client")
        else { throw CalendarFailure(message: "Reconnect this Google account.") }
        let renewed = try await GoogleOAuth.tokenRequest([
            "client_id": client.clientID, "client_secret": client.clientSecret ?? "",
            "refresh_token": refresh, "grant_type": "refresh_token",
        ])
        try Task.checkCancellation()
        token.accessToken = renewed.accessToken
        token.expiresAt = renewed.expiresAt
        token.refreshToken = renewed.refreshToken ?? refresh
        try CalendarKeychain.save(token, key: id)
        return token.accessToken
    }
    private func pages(path: String, token: String, query: [URLQueryItem]) async throws -> [[String: Any]] {
        var result: [[String: Any]] = []
        var next: String?
        repeat {
            try Task.checkCancellation()
            var url = URLComponents(string: "https://www.googleapis.com/calendar/v3/\(path)")!
            url.queryItems =
                query + [URLQueryItem(name: "maxResults", value: "250")]
                + (next.map { [URLQueryItem(name: "pageToken", value: $0)] } ?? [])
            let page = try await Self.get(url.url!, token: token)
            result += page["items"] as? [[String: Any]] ?? []
            next = page["nextPageToken"] as? String
        } while next != nil
        return result
    }
    private static func get(_ url: URL, token: String) async throws -> [String: Any] {
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 30
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw CalendarFailure(message: "Google Calendar did not respond.")
        }
        guard http.statusCode == 200 else {
            switch http.statusCode {
            case 401:
                throw CalendarFailure(
                    message: "Google access expired or was revoked. Reconnect this account.")
            case 403:
                throw CalendarFailure(
                    message:
                        "Google Calendar access was denied. Enable the Calendar API for your OAuth project and grant both read permissions."
                )
            case 429:
                throw CalendarFailure(
                    message: "Google Calendar is busy. Toby will retry during the next sync.")
            default:
                throw CalendarFailure(
                    message: "Google Calendar could not sync (HTTP \(http.statusCode)). Toby will retry.")
            }
        }
        guard let object = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw CalendarFailure(message: "Google returned an unreadable calendar response.")
        }
        return object
    }
    private static func date(_ text: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: text) { return date }
        formatter.formatOptions.insert(.withFractionalSeconds)
        return formatter.date(from: text)
    }
}
