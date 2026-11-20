import Foundation
import Observation

/// What the app shows: start, sign-in, or a connected (or demo) session. The SwiftUI layer only renders this and
/// opens the system sign-in window; every decision is here, so it is tested on Linux.
@MainActor
@Observable
public final class AppController {
    public enum Phase: Equatable, Sendable {
        /// reading the Keychain
        case starting
        case signedOut
        /// a session exists (`session`), connected or still connecting
        case signedIn
    }

    /// Why the sign-in page shows a message. The page turns it into text (`onboarding.*` keys of the web app).
    public enum Problem: Equatable, Sendable {
        case missingURL
        case missingToken
        /// the sign-in page or the code exchange failed
        case signInFailed
        /// Home Assistant refused the long-lived token
        case tokenRejected
        /// Home Assistant could not be reached (message for `onboarding.connectionError`)
        case connection(String)
        /// something on this device failed (Keychain, demo data)
        case generic
    }

    public private(set) var phase: Phase = .starting
    public private(set) var session: HomeSession?
    public private(set) var isDemo = false
    public private(set) var problem: Problem?
    /// a sign-in step is running (the button shows its loading text)
    public private(set) var busy = false

    private let auth: HAAuth
    private let transport: any HATransport
    private let clientOptions: HAClient.Options
    private let makeDemo: @MainActor () throws -> HomeSession
    private var pendingURL: URL?
    private var watcher: Task<Void, Never>?
    private let log = Log("app")

    public init(auth: HAAuth, transport: any HATransport, clientOptions: HAClient.Options = .init(),
                makeDemo: @escaping @MainActor () throws -> HomeSession = { try HomeSession.demo() }) {
        self.auth = auth
        self.transport = transport
        self.clientOptions = clientOptions
        self.makeDemo = makeDemo
    }

    /// On app start: a stored sign-in connects right away, otherwise the sign-in page.
    public func launch() async {
        for attempt in 0..<5 {
            do {
                if let t = try await auth.storedTokens() {
                    await open(t.hassURL)
                } else {
                    phase = .signedOut
                }
                return
            } catch {
                // the Keychain can be unreadable for a moment (before the first unlock); that is not "signed out"
                log.error("reading the stored sign-in failed (\(attempt + 1)/5): \(error)")
                try? await Task.sleep(for: .seconds(1))
            }
        }
        phase = .signedOut
        problem = .signInFailed
    }

    /// Starts the app once, however many windows ask (each iPad window shows the same session): a stored sign-in or
    /// the sign-in page, or with `demo` the demo home (screenshot scenes).
    public func launchIfNeeded(demo: Bool = false) async {
        guard !launched else { return }
        launched = true
        if demo {
            await startDemo()
            if session == nil { phase = .signedOut }
        } else {
            await launch()
        }
    }

    private var launched = false

    // MARK: sign-in

    /// First step of the sign-in with Home Assistant's page: the address the app opens in the system sign-in window,
    /// or nil (with `problem` set) when the typed address is no address. nil without a problem while a sign-in runs.
    public func beginSignIn(address: String) async -> URL? {
        guard !busy else { return nil }
        problem = nil
        guard let hass = HAURL.normalize(address) else {
            problem = .missingURL
            return nil
        }
        busy = true
        guard let page = await auth.authorizeURL(hassURL: hass) else {
            busy = false
            problem = .missingURL
            return nil
        }
        pendingURL = hass
        return page
    }

    /// The sign-in window was closed without a result.
    public func cancelSignIn() {
        pendingURL = nil
        busy = false
    }

    /// The sign-in window failed (no network, certificate, …).
    public func signInWindowFailed(_ message: String) {
        pendingURL = nil
        busy = false
        problem = .connection(message)
    }

    /// Second step: the callback `hapulse://auth-callback?code=…` from the sign-in window. Stays on the sign-in page
    /// until Home Assistant has accepted the connection (or says why not), like the web.
    public func finishSignIn(callback: URL) async {
        defer { busy = false }
        guard let hass = pendingURL else { return }
        pendingURL = nil
        do {
            _ = try await auth.finish(callback: callback, hassURL: hass)
            log.info("signed in with the Home Assistant page")
        } catch let e as HAError {
            log.error("sign-in failed: \(e.code)")
            problem = .signInFailed // refused code, wrong answer, callback of another sign-in
            return
        } catch {
            log.error("sign-in failed: \(error)")
            problem = .connection(error.localizedDescription)
            return
        }
        await open(hass, verify: true)
    }

    /// The advanced way: address plus a long-lived access token. Kept only when Home Assistant accepts it.
    public func signInWithToken(address: String, token: String) async {
        guard !busy else { return }
        problem = nil
        guard let hass = HAURL.normalize(address) else {
            problem = .missingURL
            return
        }
        let t = token.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty else {
            problem = .missingToken
            return
        }
        busy = true
        defer { busy = false }
        do {
            _ = try await auth.useLongLivedToken(t, hassURL: hass)
        } catch {
            log.error("storing the token failed: \(error)")
            problem = .generic
            return
        }
        await open(hass, verify: true)
    }

    /// The demo home, without any Home Assistant.
    public func startDemo() async {
        guard !busy else { return }
        problem = nil
        do {
            let s = try makeDemo()
            await closeSession()
            install(s, demo: true)
            await s.start()
        } catch {
            log.error("demo failed to load: \(error)")
            problem = .generic
        }
    }

    public func signOut() async {
        await closeSession()
        if !isDemo, await !auth.signOut() { problem = .generic }
        isDemo = false
        phase = .signedOut
        log.info("signed out")
    }

    // MARK: foreground / background

    /// App in the background: close the connection (iOS would cut it anyway); subscriptions stay registered.
    public func pause() async { await session?.stop() }

    /// Back in the foreground: reconnect.
    public func resume() async { await session?.start() }

    // MARK: internals

    /// The `state` of the sign-in page that is open (tests only).
    func pendingStateForTests() async -> String? { await auth.pendingState() }

    /// `verify`: a fresh sign-in. The sign-in page stays until the first answer of Home Assistant; a refusal or no
    /// connection forgets the new tokens and says why. Without it (app start with a stored sign-in) the session shows
    /// at once and connects in the background.
    private func open(_ hass: URL, verify: Bool = false) async {
        let client: HAClient
        do {
            let auth = self.auth
            client = try HAClient(baseURL: hass, transport: transport, token: { try await auth.accessToken() }, options: clientOptions)
        } catch {
            log.error("bad Home Assistant address")
            phase = .signedOut
            problem = .missingURL
            return
        }
        let s = HomeSession(client: client)
        await closeSession()
        guard verify else {
            install(s, demo: false)
            await s.start()
            return
        }
        await s.start()
        let first = await Self.firstAnswer(client, timeout: verifyTimeout)
        switch first {
        case .connected:
            install(s, demo: false)
        case .authFailed:
            let longLived = ((try? await auth.storedTokens()) ?? nil).map { $0.refreshToken == nil } ?? false
            await s.close()
            await auth.signOut()
            phase = .signedOut
            problem = longLived ? .tokenRejected : .signInFailed
        case .disconnected(let reason):
            await s.close()
            await auth.signOut()
            phase = .signedOut
            problem = .connection(reason)
        case .idle, .connecting:
            await s.close()
            await auth.signOut()
            phase = .signedOut
            problem = .connection("timeout")
        }
    }

    /// How long a fresh sign-in waits for Home Assistant.
    var verifyTimeout: Duration = .seconds(20)

    /// The first status that answers the question "does this work": connected, refused or failed (or the last one
    /// seen when time runs out).
    private static func firstAnswer(_ client: HAClient, timeout: Duration) async -> HAConnectionStatus {
        await withTaskGroup(of: HAConnectionStatus?.self) { group in
            group.addTask {
                for await status in await client.statusUpdates() {
                    switch status {
                    case .connected, .authFailed, .disconnected: return status
                    case .idle, .connecting: continue
                    }
                }
                return nil
            }
            group.addTask {
                try? await Task.sleep(for: timeout)
                return nil
            }
            let first = await group.next() ?? nil
            group.cancelAll()
            return first ?? .connecting
        }
    }

    private func install(_ s: HomeSession, demo: Bool) {
        session = s
        isDemo = demo
        phase = .signedIn
        let client = s.client
        let auth = self.auth
        watcher = Task { [weak self] in
            var retried = false
            for await status in await client.statusUpdates() {
                switch status {
                case .connected:
                    retried = false
                case .authFailed:
                    // one refused access token is not the end: refresh it once and connect again
                    if !retried, await auth.expireAccessToken() {
                        retried = true
                        self?.log.error("access token refused, refreshing once")
                        await client.start()
                        continue
                    }
                    await self?.refused()
                    return
                default:
                    break
                }
            }
        }
    }

    /// Home Assistant refused the sign-in for good: back to the sign-in page with a message.
    private func refused() async {
        let longLived = ((try? await auth.storedTokens()) ?? nil).map { $0.refreshToken == nil } ?? false
        await closeSession()
        await auth.signOut() // a refused token is useless; a revoked refresh token is already gone
        isDemo = false
        phase = .signedOut
        problem = longLived ? .tokenRejected : .signInFailed
        log.error("Home Assistant refused the sign-in")
    }

    private func closeSession() async {
        watcher?.cancel()
        watcher = nil
        if let s = session {
            session = nil
            await s.close()
        }
    }
}
