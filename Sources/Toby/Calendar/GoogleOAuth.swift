import AppKit
import CryptoKit
import Network
import Security

struct GoogleClient: Codable {
    let clientID: String
    let clientSecret: String?
    enum CodingKeys: String, CodingKey {
        case clientID = "client_id"
        case clientSecret = "client_secret"
    }
}
struct GoogleTokens: Codable {
    var accessToken: String
    var refreshToken: String?
    var expiresIn: Double?
    var scope: String?
    var expiresAt: Date?
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
        case scope, expiresAt
    }
}
struct CalendarFailure: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

enum CalendarKeychain {
    private static let service = "com.rohan.toby.next.google-calendar"
    static func read<T: Decodable>(_ key: String) throws -> T? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service, kSecAttrAccount as String: key,
            kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else {
            throw CalendarFailure(
                message: "Toby could not read Google credentials from Keychain (\(status)).")
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
    static func save<T: Encodable>(_ value: T, key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service, kSecAttrAccount as String: key,
        ]
        let data = try JSONEncoder().encode(value)
        let status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if status == errSecItemNotFound {
            var item = query
            item[kSecValueData as String] = data
            item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            let added = SecItemAdd(item as CFDictionary, nil)
            guard added == errSecSuccess else {
                throw CalendarFailure(message: "Could not save Google credentials to Keychain (\(added)).")
            }
        } else if status != errSecSuccess {
            throw CalendarFailure(message: "Could not update Google credentials in Keychain (\(status)).")
        }
    }
    static func remove(_ key: String) throws {
        let status = SecItemDelete(
            [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service, kSecAttrAccount as String: key,
            ] as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw CalendarFailure(message: "Could not remove Google credentials from Keychain (\(status)).")
        }
    }
}

@MainActor final class GoogleOAuth {
    static let scopes =
        "openid email https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.events.readonly"
    private var listener: NWListener?
    private var continuation: CheckedContinuation<String, Error>?
    private var timeout: Task<Void, Never>?
    private var state = ""
    private var verifier = ""
    private var redirect = ""

    func authorize(client: GoogleClient) async throws -> GoogleTokens {
        verifier = try Self.random()
        state = try Self.random()
        let parameters = NWParameters.tcp
        parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: .any)
        let server = try NWListener(using: parameters)
        listener = server
        let code = try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            server.stateUpdateHandler = { [weak self] status in
                Task { @MainActor in
                    guard let self, self.continuation != nil else { return }
                    switch status {
                    case .ready:
                        guard let port = self.listener?.port else {
                            self.finish(
                                .failure(CalendarFailure(message: "Could not open Google sign-in callback.")))
                            return
                        }
                        self.redirect = "http://127.0.0.1:\(port.rawValue)/oauth2callback"
                        var url = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
                        url.queryItems = [
                            "client_id": client.clientID, "redirect_uri": self.redirect,
                            "response_type": "code", "scope": Self.scopes, "state": self.state,
                            "code_challenge": Self.base64(Data(SHA256.hash(data: Data(self.verifier.utf8)))),
                            "code_challenge_method": "S256", "access_type": "offline",
                            "prompt": "consent select_account",
                        ].map { URLQueryItem(name: $0.key, value: $0.value) }
                        if !NSWorkspace.shared.open(url.url!) {
                            self.finish(
                                .failure(
                                    CalendarFailure(message: "Could not open the browser for Google sign-in.")
                                ))
                        }
                    case .failed:
                        self.finish(
                            .failure(
                                CalendarFailure(message: "Could not start the local Google sign-in callback.")
                            ))
                    default: break
                    }
                }
            }
            server.newConnectionHandler = { [weak self] connection in
                connection.start(queue: .main)
                Task { @MainActor in self?.receive(connection, buffer: Data()) }
            }
            server.start(queue: .main)
            timeout = Task { [weak self] in
                try? await Task.sleep(for: .seconds(180))
                guard !Task.isCancelled else { return }
                self?.finish(
                    .failure(CalendarFailure(message: "Google sign-in timed out. Try connecting again.")))
            }
        }
        return try await Self.tokenRequest([
            "client_id": client.clientID, "client_secret": client.clientSecret ?? "",
            "code": code, "code_verifier": verifier, "redirect_uri": redirect,
            "grant_type": "authorization_code",
        ])
    }
    func cancel() { finish(.failure(CancellationError())) }
    private func receive(_ connection: NWConnection, buffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 8192) {
            [weak self] data, _, complete, error in
            Task { @MainActor in
                guard let self else {
                    connection.cancel()
                    return
                }
                let bytes = buffer + (data ?? Data())
                guard bytes.count <= 16384, error == nil else {
                    connection.cancel()
                    return
                }
                guard let request = String(data: bytes, encoding: .utf8), request.contains("\r\n\r\n") else {
                    if complete { connection.cancel() } else { self.receive(connection, buffer: bytes) }
                    return
                }
                let parts = request.components(separatedBy: "\r\n")[0].split(separator: " ")
                guard parts.count == 3, parts[0] == "GET",
                    let url = URLComponents(string: "http://localhost\(parts[1])"),
                    url.path == "/oauth2callback",
                    url.queryItems?.first(where: { $0.name == "state" })?.value == self.state,
                    self.continuation != nil
                else {
                    connection.cancel()
                    return
                }
                let code = url.queryItems?.first(where: { $0.name == "code" })?.value
                let body =
                    code == nil
                    ? "Google sign-in was not completed. Return to Toby to try again."
                    : "You can return to Toby. Finishing your Google Calendar connection…"
                let response =
                    "HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nCache-Control: no-store\r\nConnection: close\r\nContent-Length: \(body.utf8.count)\r\n\r\n\(body)"
                connection.send(
                    content: Data(response.utf8), completion: .contentProcessed { _ in connection.cancel() })
                if let code {
                    self.finish(.success(code))
                } else {
                    self.finish(
                        .failure(
                            CalendarFailure(
                                message: "Google sign-in was cancelled or permission was declined.")))
                }
            }
        }
    }
    private func finish(_ result: Result<String, Error>) {
        let pending = continuation
        continuation = nil
        timeout?.cancel()
        timeout = nil
        listener?.cancel()
        listener = nil
        pending?.resume(with: result)
    }
    static func tokenRequest(_ values: [String: String]) async throws -> GoogleTokens {
        var request = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        var form = URLComponents()
        form.queryItems = values.map { URLQueryItem(name: $0.key, value: $0.value) }
        request.httpBody = Data(
            (form.percentEncodedQuery ?? "").replacingOccurrences(of: "+", with: "%2B").utf8)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw CalendarFailure(
                message:
                    "Google could not authorize this connection. Check the Desktop OAuth client, or reconnect if access expired or was revoked."
            )
        }
        var tokens = try JSONDecoder().decode(GoogleTokens.self, from: data)
        tokens.expiresAt = Date().addingTimeInterval(tokens.expiresIn ?? 3600)
        return tokens
    }
    private static func random() throws -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
            throw CalendarFailure(message: "Could not securely start Google sign-in.")
        }
        return base64(Data(bytes))
    }
    private static func base64(_ data: Data) -> String {
        data.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(
            of: "/", with: "_"
        ).replacingOccurrences(of: "=", with: "")
    }
}
