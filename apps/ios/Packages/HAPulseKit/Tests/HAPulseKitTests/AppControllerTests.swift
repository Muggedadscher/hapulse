import Foundation
import Testing
@testable import HAPulseKit

@MainActor
@Suite(.serialized)
struct AppControllerTests {
    let hass = URL(string: "https://ha.example:8123")!

    func make(_ ha: FakeHA, store: MemoryTokenStore = MemoryTokenStore(), server: FakeTokenServer = FakeTokenServer()) -> AppController {
        var o = HAClient.Options()
        o.retryDelays = [.milliseconds(10)]
        o.pingInterval = .seconds(3600)
        return AppController(auth: HAAuth(http: server, store: store), transport: ha, clientOptions: o)
    }

    func connected(_ app: AppController) async -> Bool {
        guard let c = app.session?.client else { return false }
        if case .connected = await c.status { return true }
        return false
    }

    @Test func addressesLikeTheUserTypesThem() {
        #expect(HAURL.normalize("  https://ha.example:8123/  ")?.absoluteString == "https://ha.example:8123")
        #expect(HAURL.normalize("homeassistant.local:8123")?.absoluteString == "http://homeassistant.local:8123")
        #expect(HAURL.normalize("192.168.2.10:8123")?.absoluteString == "http://192.168.2.10:8123")
        #expect(HAURL.normalize("abc.ui.nabu.casa")?.absoluteString == "https://abc.ui.nabu.casa")
        #expect(HAURL.normalize("ha.example.de/ha")?.absoluteString == "https://ha.example.de/ha")
        #expect(HAURL.normalize("") == nil)
        #expect(HAURL.normalize("ftp://x.de") == nil)
        #expect(HAURL.normalize("https://") == nil)
    }

    @Test func signInWithTheHomeAssistantPage() async throws {
        let ha = FakeHA()
        await ha.setToken("A1")
        let store = MemoryTokenStore()
        let app = make(ha, store: store)
        await app.launch()
        #expect(app.phase == .signedOut)
        #expect(await app.beginSignIn(address: " ") == nil)
        #expect(app.problem == .missingURL)
        let page = try #require(await app.beginSignIn(address: "https://ha.example:8123/"))
        #expect(app.busy)
        let state = try #require(URLComponents(url: page, resolvingAgainstBaseURL: false)?.queryItems?.first { $0.name == "state" }?.value)
        // a callback of another sign-in is refused
        await app.finishSignIn(callback: URL(string: "hapulse://auth-callback?code=abc&state=nope")!)
        #expect(app.problem == .signInFailed)
        #expect(app.phase == .signedOut)
        _ = try #require(await app.beginSignIn(address: "https://ha.example:8123/"))
        let state2 = try #require(await app.pendingStateForTests())
        #expect(state2 != state)
        await app.finishSignIn(callback: URL(string: "hapulse://auth-callback?code=abc&state=\(state2)")!)
        #expect(app.phase == .signedIn)
        #expect(!app.busy)
        #expect(app.problem == nil)
        try await eventuallyMainAsync("connected") { await connected(app) }
        #expect(try await store.load()?.hassURL == hass)

        // the next app start connects without a sign-in
        let again = make(ha, store: store)
        await again.launch()
        #expect(again.phase == .signedIn)
        try await eventuallyMainAsync("connected again") { await connected(again) }

        await app.signOut()
        #expect(app.phase == .signedOut)
        #expect(try await store.load() == nil)
        await again.signOut()
    }

    @Test func refusedTokenStaysOnSignIn() async throws {
        let ha = FakeHA()
        let store = MemoryTokenStore()
        let app = make(ha, store: store)
        await app.launch()
        await app.signInWithToken(address: "ha.example:8123", token: "  ")
        #expect(app.problem == .missingToken)
        await app.signInWithToken(address: "ha.example:8123", token: "wrong")
        #expect(app.phase == .signedOut)
        #expect(app.problem == .tokenRejected)
        #expect(app.session == nil)
        #expect(!app.busy)
        #expect(try await store.load() == nil)
        await app.signInWithToken(address: "ha.example:8123", token: "good")
        #expect(app.phase == .signedIn)
        #expect(app.problem == nil)
        #expect(await connected(app))
        #expect(try await store.load()?.hassURL.absoluteString == "http://ha.example:8123")
        await app.signOut()
    }

    @Test func unreachableAddressStaysOnSignIn() async throws {
        let ha = FakeHA()
        await ha.setUnreachable(true)
        let store = MemoryTokenStore()
        let app = make(ha, store: store)
        await app.launch()
        await app.signInWithToken(address: "ha.typo.example", token: "good")
        #expect(app.phase == .signedOut)
        guard case .connection(let message)? = app.problem else {
            Issue.record("expected a connection problem, got \(String(describing: app.problem))")
            return
        }
        #expect(message.contains("Could not connect"))
        #expect(try await store.load() == nil)
    }

    @Test func secondSignInWhileOneRunsIsIgnored() async throws {
        let app = make(FakeHA())
        await app.launch()
        let first = await app.beginSignIn(address: "ha.example:8123")
        #expect(first != nil && app.busy)
        #expect(await app.beginSignIn(address: "other.example") == nil)
        #expect(app.problem == nil)
        await app.startDemo()
        #expect(app.phase == .signedOut) // the demo waits too
        app.cancelSignIn()
        #expect(!app.busy)
        await app.finishSignIn(callback: URL(string: "hapulse://auth-callback?code=abc&state=x")!)
        #expect(!app.busy)
    }

    @Test func oneRefusedAccessTokenIsRefreshedOnce() async throws {
        let ha = FakeHA()
        await ha.setToken("A1") // the server only takes the refreshed token
        let store = MemoryTokenStore(HATokens(hassURL: hass, clientID: HAAuth.defaultClientID, accessToken: "old",
                                              refreshToken: "R", expires: Date().addingTimeInterval(1800)))
        let app = make(ha, store: store)
        await app.launch()
        try await eventuallyMainAsync("connected after refresh") { await connected(app) }
        #expect(app.phase == .signedIn)
        #expect(try await store.load()?.accessToken == "A1")
        await app.signOut()
    }

    @Test func demoNeedsNoSignIn() async throws {
        let store = MemoryTokenStore()
        let app = make(FakeHA(), store: store)
        await app.launch()
        await app.startDemo()
        #expect(app.isDemo)
        #expect(app.phase == .signedIn)
        try await eventuallyMain("demo loaded") { app.session?.loaded == true }
        await app.signOut()
        #expect(app.phase == .signedOut)
        #expect(!app.isDemo)
        #expect(app.session == nil)
    }

    @Test func launchOnceForAllWindows() async throws {
        let app = make(FakeHA())
        await app.launchIfNeeded(demo: true)
        let first = try #require(app.session)
        #expect(app.isDemo)
        // a second window asks again: same session, no second connection
        await app.launchIfNeeded(demo: true)
        await app.launchIfNeeded()
        #expect(app.session === first)
        #expect(app.phase == .signedIn)
        await app.signOut()
    }

    @Test func brokenDemoShowsTheSignInPage() async {
        struct Broken: Error {}
        var o = HAClient.Options()
        o.pingInterval = .seconds(3600)
        let app = AppController(auth: HAAuth(http: FakeTokenServer(), store: MemoryTokenStore()), transport: FakeHA(), clientOptions: o,
                                makeDemo: { throw Broken() })
        await app.launchIfNeeded(demo: true)
        #expect(app.phase == .signedOut)
        #expect(app.problem == .generic)
    }
}
