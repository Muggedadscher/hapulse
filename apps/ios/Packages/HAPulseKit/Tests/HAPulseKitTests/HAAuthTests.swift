import Foundation
import Testing
@testable import HAPulseKit

actor FakeTokenServer: HAHTTP {
    private(set) var calls: [(URL, [String: String])] = []
    var refreshAnswer = 200
    var issued = 0

    var delay = Duration.milliseconds(10)
    func setRefreshAnswer(_ s: Int) { refreshAnswer = s }
    func setDelay(_ d: Duration) { delay = d }

    func post(_ url: URL, form: [String: String]) async throws -> (status: Int, body: Data) {
        calls.append((url, form))
        if url.path.hasSuffix("/auth/revoke") { return (200, Data()) }
        try await Task.sleep(for: delay)
        switch form["grant_type"] {
        case "authorization_code":
            guard form["code"] == "abc" else { return (400, Data(#"{"error":"invalid_request"}"#.utf8)) }
            issued += 1
            return (200, Data(#"{"access_token":"A\#(issued)","expires_in":1800,"refresh_token":"R","token_type":"Bearer"}"#.utf8))
        case "refresh_token":
            guard refreshAnswer == 200 else { return (refreshAnswer, Data(#"{"error":"invalid_grant"}"#.utf8)) }
            issued += 1
            return (200, Data(#"{"access_token":"A\#(issued)","expires_in":1800,"token_type":"Bearer"}"#.utf8))
        default:
            return (400, Data())
        }
    }
}

final class Clock: @unchecked Sendable {
    private let lock = NSLock()
    private var t = Date(timeIntervalSince1970: 1_781_516_460)
    var now: Date { lock.lock(); defer { lock.unlock() }; return t }
    func advance(_ s: TimeInterval) { lock.lock(); t += s; lock.unlock() }
}

struct HAAuthTests {
    let hass = URL(string: "https://ha.example:8123")!

    @Test func authorizeURLAndCodeExchange() async throws {
        let server = FakeTokenServer()
        let store = MemoryTokenStore()
        let clock = Clock()
        let auth = HAAuth(http: server, store: store, now: { clock.now })
        let url = try #require(await auth.authorizeURL(hassURL: hass, state: "S1"))
        #expect(url.absoluteString == "https://ha.example:8123/auth/authorize?response_type=code&client_id=https://hapulse.schleerag.de/&redirect_uri=hapulse://auth-callback&state=S1")

        await #expect(throws: HAError("auth_state", "Callback does not belong to this sign-in")) {
            try await auth.finish(callback: URL(string: "hapulse://auth-callback?code=abc&state=OTHER")!, hassURL: hass)
        }
        let t = try await auth.finish(callback: URL(string: "hapulse://auth-callback?code=abc&state=S1")!, hassURL: hass)
        #expect(t.accessToken == "A1")
        #expect(t.refreshToken == "R")
        #expect(t.expires == clock.now.addingTimeInterval(1800))
        #expect(try await store.load() == t)
        let form = await server.calls.last?.1
        #expect(form == ["grant_type": "authorization_code", "code": "abc", "client_id": "https://hapulse.schleerag.de/"])
    }

    @Test func refreshOnceForManyCallers() async throws {
        let server = FakeTokenServer()
        let clock = Clock()
        let store = MemoryTokenStore(HATokens(hassURL: hass, clientID: HAAuth.defaultClientID, accessToken: "old",
                                              refreshToken: "R", expires: clock.now.addingTimeInterval(1800)))
        let auth = HAAuth(http: server, store: store, now: { clock.now })
        #expect(try await auth.accessToken() == "old")
        clock.advance(1750) // inside the 60 s margin
        async let a = auth.accessToken()
        async let b = auth.accessToken()
        let (x, y) = try await (a, b)
        #expect(x == "A1" && y == "A1")
        #expect(await server.calls.count == 1)
        #expect(try await store.load()?.refreshToken == "R") // kept: the refresh answer has none
    }

    @Test func revokedRefreshSignsOut() async throws {
        let server = FakeTokenServer()
        await server.setRefreshAnswer(400)
        let clock = Clock()
        let store = MemoryTokenStore(HATokens(hassURL: hass, clientID: HAAuth.defaultClientID, accessToken: "old",
                                              refreshToken: "R", expires: clock.now))
        let auth = HAAuth(http: server, store: store, now: { clock.now })
        await #expect(throws: HAError.authInvalid) { try await auth.accessToken() }
        #expect(try await store.load() == nil)
    }

    @Test func passingRefusalKeepsTheSignIn() async throws {
        // a proxy's 401/403 or a server error is not "signed out": the tokens stay, the connection retries
        for code in [401, 403, 502] {
            let server = FakeTokenServer()
            await server.setRefreshAnswer(code)
            let clock = Clock()
            let tokens = HATokens(hassURL: hass, clientID: HAAuth.defaultClientID, accessToken: "old", refreshToken: "R", expires: clock.now)
            let store = MemoryTokenStore(tokens)
            let auth = HAAuth(http: server, store: store, now: { clock.now })
            await #expect(throws: HAError("http_\(code)", "Token request failed")) { try await auth.accessToken() }
            #expect(try await store.load() == tokens)
        }
    }

    @Test func signOutDuringRefreshStaysSignedOut() async throws {
        let server = FakeTokenServer()
        await server.setDelay(.milliseconds(300))
        let clock = Clock()
        let store = MemoryTokenStore(HATokens(hassURL: hass, clientID: HAAuth.defaultClientID, accessToken: "old",
                                              refreshToken: "R", expires: clock.now))
        let auth = HAAuth(http: server, store: store, now: { clock.now })
        let pending = Task { try await auth.accessToken() }
        try await Task.sleep(for: .milliseconds(50))
        await auth.signOut()
        _ = try? await pending.value
        try await Task.sleep(for: .milliseconds(400))
        #expect(try await store.load() == nil)
        await #expect(throws: HAError.authInvalid) { try await auth.accessToken() }
    }

    @Test func formEncoding() {
        #expect(HAAuth.formBody(["b": "x y", "a": "https://h/?a=1&b"]) == "a=https%3A%2F%2Fh%2F%3Fa%3D1%26b&b=x%20y")
    }
}
