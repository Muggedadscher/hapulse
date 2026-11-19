import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Tokens of one Home Assistant sign-in (OAuth "authorization code" flow, like the web app).
public struct HATokens: Codable, Equatable, Sendable {
    public var hassURL: URL
    public var clientID: String
    public var accessToken: String
    public var refreshToken: String?
    /// When the access token runs out (Home Assistant: about 30 minutes).
    public var expires: Date

    public func expired(at now: Date, margin: TimeInterval = 60) -> Bool { now.addingTimeInterval(margin) >= expires }
}

/// Where tokens live: the Keychain in the app, memory in tests. Tokens never go into settings or logs.
/// `load` returns nil only when nothing is stored; a store that cannot be read right now (Keychain locked) throws,
/// which the connection treats as "try again", not as "signed out".
public protocol HATokenStore: Sendable {
    func load() async throws -> HATokens?
    func save(_ tokens: HATokens?) async throws
}

public actor MemoryTokenStore: HATokenStore {
    private var tokens: HATokens?
    public init(_ tokens: HATokens? = nil) { self.tokens = tokens }
    public func load() throws -> HATokens? { tokens }
    public func save(_ t: HATokens?) { tokens = t }
}

/// Minimal HTTP for the token calls, so tests can answer without a server.
public protocol HAHTTP: Sendable {
    func post(_ url: URL, form: [String: String]) async throws -> (status: Int, body: Data)
}

public struct URLSessionHTTP: HAHTTP {
    public init() {}
    public func post(_ url: URL, form: [String: String]) async throws -> (status: Int, body: Data) {
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        req.httpBody = Data(HAAuth.formBody(form).utf8)
        let (data, resp) = try await URLSession.shared.data(for: req)
        return ((resp as? HTTPURLResponse)?.statusCode ?? 0, data)
    }
}

/// Sign-in with Home Assistant's OAuth: `client_id` is the HAPulse address, the answer comes back to
/// `hapulse://auth-callback` (announced by `<link rel="redirect_uri">` in HAPulse's index.html). The app opens the
/// authorize page in the system sign-in window (ASWebAuthenticationSession) and hands the callback URL to
/// `finish`.
public actor HAAuth {
    public static let defaultClientID = "https://hapulse.schleerag.de/"
    public static let redirectURI = "hapulse://auth-callback"

    private let http: any HAHTTP
    private let store: any HATokenStore
    private let now: @Sendable () -> Date
    private var refreshing: Task<HATokens, Error>?
    private var expectedState: String?
    /// Bumped by `signOut()`: a refresh that was already under way must not store its tokens afterwards.
    private var epoch = 0
    private let log = Log("auth")

    public init(http: any HAHTTP = URLSessionHTTP(), store: any HATokenStore, now: @escaping @Sendable () -> Date = { Date() }) {
        self.http = http
        self.store = store
        self.now = now
    }

    /// The page to open. `state` protects against a callback that this app did not start.
    public func authorizeURL(hassURL: URL, clientID: String = HAAuth.defaultClientID, state: String = UUID().uuidString) -> URL? {
        expectedState = state
        var c = URLComponents(url: hassURL.appendingPathComponent("auth/authorize"), resolvingAgainstBaseURL: false)
        c?.queryItems = [
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "redirect_uri", value: Self.redirectURI),
            URLQueryItem(name: "state", value: state),
        ]
        return c?.url
    }

    /// Takes the callback URL (`hapulse://auth-callback?code=…&state=…`), trades the code for tokens and stores them.
    public func finish(callback: URL, hassURL: URL, clientID: String = HAAuth.defaultClientID) async throws -> HATokens {
        let items = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems ?? []
        func item(_ n: String) -> String? { items.first { $0.name == n }?.value }
        if let err = item("error") { throw HAError("auth_denied", err) }
        guard let code = item("code") else { throw HAError("auth_no_code", "No code in the callback") }
        guard let expectedState, item("state") == expectedState else { throw HAError("auth_state", "Callback does not belong to this sign-in") }
        self.expectedState = nil
        let tokens = try await tokenCall(hassURL: hassURL, clientID: clientID, form: [
            "grant_type": "authorization_code", "code": code, "client_id": clientID,
        ], keepRefresh: nil)
        try await store.save(tokens)
        log.info("signed in")
        return tokens
    }

    /// A valid access token; refreshes it shortly before it runs out. Several callers share one refresh.
    public func accessToken() async throws -> String {
        guard let t = try await store.load() else { throw HAError.authInvalid }
        if !t.expired(at: now()) { return t.accessToken }
        return try await refresh(t).accessToken
    }

    private func refresh(_ t: HATokens) async throws -> HATokens {
        if let refreshing { return try await refreshing.value }
        guard let rt = t.refreshToken else { throw HAError.authInvalid }
        let started = epoch
        let task = Task { () throws -> HATokens in
            try await tokenCall(hassURL: t.hassURL, clientID: t.clientID, form: [
                "grant_type": "refresh_token", "refresh_token": rt, "client_id": t.clientID,
            ], keepRefresh: rt)
        }
        refreshing = task
        defer { if epoch == started { refreshing = nil } }
        do {
            let fresh = try await task.value
            guard epoch == started else { throw HAError.authInvalid } // signed out meanwhile
            try await store.save(fresh)
            log.info("access token refreshed")
            return fresh
        } catch let e as HAError where e == .authInvalid {
            if epoch == started {
                try? await store.save(nil) // refresh token revoked: the user signs in again
                log.error("refresh token refused, signed out")
            }
            throw e
        }
    }

    /// Signs out: revokes the refresh token at Home Assistant (best effort) and forgets the tokens.
    public func signOut() async {
        epoch += 1
        refreshing?.cancel()
        refreshing = nil
        if let t = try? await store.load(), let rt = t.refreshToken {
            _ = try? await http.post(t.hassURL.appendingPathComponent("auth/revoke"), form: ["token": rt])
        }
        do { try await store.save(nil) } catch { log.error("could not forget the tokens: \(error)") }
    }

    private func tokenCall(hassURL: URL, clientID: String, form: [String: String], keepRefresh: String?) async throws -> HATokens {
        let start = now()
        let (status, body) = try await http.post(hassURL.appendingPathComponent("auth/token"), form: form)
        // Home Assistant answers 400 invalid_grant for a used/unknown code or a revoked refresh token. Only that ends
        // the sign-in: any other refusal (a proxy's 401/403, 5xx, captive portal) is passing and retried.
        if status == 400, (try? JSONDecoder().decode(JSONValue.self, from: body))?["error"]?.string == "invalid_grant" {
            throw HAError.authInvalid
        }
        guard status == 200 else { throw HAError("http_\(status)", "Token request failed") }
        let j = try JSONDecoder().decode(JSONValue.self, from: body)
        guard let access = j["access_token"]?.string, let expiresIn = j["expires_in"]?.number, expiresIn.isFinite, expiresIn > 0
        else { throw HAError.protocolError }
        return HATokens(
            hassURL: hassURL, clientID: clientID, accessToken: access,
            refreshToken: j["refresh_token"]?.string ?? keepRefresh,
            expires: start.addingTimeInterval(expiresIn)
        )
    }

    static func formBody(_ form: [String: String]) -> String {
        var allowed = CharacterSet.alphanumerics
        allowed.insert(charactersIn: "-._~")
        return form.keys.sorted().map { k in
            "\(k.addingPercentEncoding(withAllowedCharacters: allowed)!)=\(form[k]!.addingPercentEncoding(withAllowedCharacters: allowed)!)"
        }.joined(separator: "&")
    }
}
