import AppKit
import Observation

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
    var driveEnabled: Bool?
}

@MainActor @Observable final class GoogleCalendarStore {
    private(set) var accounts: [GoogleCalendarAccount] = []
    private(set) var agenda: [CalendarEntry] = []
    private(set) var hasClient = false
    private(set) var connecting = false
    private(set) var refreshing = false
    var error: String?
    var onDisconnect: ((String) -> Void)?
    var onChange: (() -> Void)?
    private var oauth: GoogleOAuth?
    private var task: Task<Void, Never>?
    private var connectTask: Task<Void, Never>?
    private var eventsByAccount: [String: [CalendarEntry]] = [:]
    private var revision = UUID()

    init() {
        if let data = UserDefaults.standard.data(forKey: "googleCalendarAccounts") {
            accounts = (try? JSONDecoder().decode([GoogleCalendarAccount].self, from: data)) ?? []
        }
        do {
            let client = try Self.appClient()
            hasClient = client != nil
        } catch { self.error = error.localizedDescription }
    }
    static func appClient() throws -> GoogleClient? {
        guard let url = Bundle.main.url(forResource: "GoogleOAuthClient", withExtension: "json") else {
            return nil
        }
        struct Configuration: Decodable { let installed: GoogleClient }
        let client = try JSONDecoder().decode(Configuration.self, from: Data(contentsOf: url)).installed
        guard client.clientID.hasSuffix(".apps.googleusercontent.com") else {
            throw CalendarFailure(message: "This build’s Google sign-in configuration is invalid.")
        }
        return client
    }
    func connect(email: String? = nil) {
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
                guard let client = try Self.appClient() else {
                    throw CalendarFailure(message: "Google sign-in is not configured in this build.")
                }
                let auth = GoogleOAuth()
                oauth = auth
                let tokens = try await auth.authorize(client: client, email: email)
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
                if let index = accounts.firstIndex(where: { $0.id == id }) {
                    accounts[index].driveEnabled = granted.contains(GoogleOAuth.driveScope)
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
            onDisconnect?(id)
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
                    var meetings: [CalendarEntry] = []
                    let formatter = ISO8601DateFormatter()
                    let query = [
                        URLQueryItem(
                            name: "timeMin",
                            value: formatter.string(from: CalendarEntry.range.start)),
                        URLQueryItem(
                            name: "timeMax",
                            value: formatter.string(from: CalendarEntry.range.end)),
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
                                let startValue = item["start"] as? [String: Any],
                                let endValue = item["end"] as? [String: Any],
                                let start = Self.eventDate(startValue), let end = Self.eventDate(endValue),
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
                            let url = ScheduledMeeting.conferenceURL(in: text)
                            return CalendarEntry(
                                id:
                                    "google-\(account.id)-\(calendar.id)-\(eventID)-\(Int(start.timeIntervalSince1970))",
                                title: item["summary"] as? String ?? "Untitled event", start: start, end: end,
                                allDay: startValue["date"] != nil, calendarName: calendar.name,
                                account: account.email, conferenceURL: url,
                                location: item["location"] as? String,
                                details: Self.descriptionText(item["description"] as? String),
                                organizer: (item["organizer"] as? [String: Any]).flatMap(Self.personName),
                                guests: (item["attendees"] as? [[String: Any]] ?? []).compactMap(
                                    Self.personName),
                                externalID: item["iCalUID"] as? String)
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
        agenda = eventsByAccount.values.flatMap { $0 }
        onChange?()
    }
    func accessToken(_ id: String, forDrive: Bool = false) async throws -> String {
        guard accounts.contains(where: { $0.id == id }) else { throw CancellationError() }
        guard var token: GoogleTokens = try CalendarKeychain.read(id) else {
            throw CalendarFailure(message: "Reconnect this Google account.")
        }
        if forDrive, !(token.scope ?? "").split(separator: " ").contains(Substring(GoogleOAuth.driveScope)) {
            throw CalendarFailure(message: "Reconnect this account to allow Drive access.")
        }
        if (token.expiresAt ?? .distantPast).timeIntervalSinceNow > 120 { return token.accessToken }
        guard let refresh = token.refreshToken,
            let client = try Self.appClient()
        else { throw CalendarFailure(message: "Reconnect this Google account.") }
        let renewed = try await GoogleOAuth.tokenRequest([
            "client_id": client.clientID, "client_secret": client.clientSecret ?? "",
            "refresh_token": refresh, "grant_type": "refresh_token",
        ])
        try Task.checkCancellation()
        guard accounts.contains(where: { $0.id == id }) else { throw CancellationError() }
        // A reconnect may have replaced a narrower grant while this refresh was in flight.
        if let latest: GoogleTokens = try CalendarKeychain.read(id), latest.accessToken != token.accessToken {
            return try await accessToken(id, forDrive: forDrive)
        }
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
    private static func personName(_ person: [String: Any]) -> String? {
        let name = person["displayName"] as? String
        let email = person["email"] as? String
        if let name, !name.isEmpty, let email, name != email { return "\(name) · \(email)" }
        return email ?? name
    }
    private static func descriptionText(_ html: String?) -> String? {
        guard let html else { return nil }
        // Render calendar HTML as inert text; never load remote resources or execute markup.
        var text =
            html
            .replacingOccurrences(
                of: "(?is)<(script|style)\\b[^>]*>.*?</\\1>", with: "", options: .regularExpression
            )
            .replacingOccurrences(
                of: "(?i)<br\\s*/?>|</(?:p|div|li|h[1-6])>", with: "\n", options: .regularExpression
            )
            .replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
        for (entity, value) in [
            ("&nbsp;", " "), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", "\""), ("&#39;", "'"), ("&amp;", "&"),
        ] {
            text = text.replacingOccurrences(of: entity, with: value)
        }
        return text.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    private static func eventDate(_ value: [String: Any]) -> Date? {
        if let text = value["dateTime"] as? String { return date(text) }
        guard let text = value["date"] as? String else { return nil }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: text)
    }
    private static func date(_ text: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: text) { return date }
        formatter.formatOptions.insert(.withFractionalSeconds)
        return formatter.date(from: text)
    }
}
