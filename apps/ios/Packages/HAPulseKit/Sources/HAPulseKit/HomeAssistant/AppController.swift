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

    // MARK: sign-in

    /// First step of the sign-in with Home Assistant's page: the address the app opens in the system sign-in window,
    /// or nil (with `problem` set) when the typed address is no address.
    public func beginSignIn(address: String) async -> URL? {
        problem = nil
        guard let hass = HAURL.normalize(address) else {
            problem = .missingURL
            return nil
        }
        pendingURL = hass
        busy = true
        return await auth.authorizeURL(hassURL: hass)
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

    /// Second step: the callback `hapulse://auth-callback?code=…` from the sign-in window.
    public func finishSignIn(callback: URL) async {
        guard let hass = pendingURL else { return }
        pendingURL = nil
        defer { busy = false }
        do {
            _ = try await auth.finish(callback: callback, hassURL: hass)
            log.info("signed in with the Home Assistant page")
            await open(hass)
        } catch let e as HAError {
            log.error("sign-in failed: \(e.code)")
            problem = .signInFailed // refused code, wrong answer, callback of another sign-in
        } catch {
            log.error("sign-in failed: \(error)")
            problem = .connection(error.localizedDescription)
        }
    }

    /// The advanced way: address plus a long-lived access token.
    public func signInWithToken(address: String, token: String) async {
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
            await open(hass)
        } catch {
            log.error("storing the token failed: \(error)")
            problem = .connection("\(error)")
        }
    }

    /// The demo home, without any Home Assistant.
    public func startDemo() async {
        problem = nil
        do {
            let s = try makeDemo()
            await adopt(s, demo: true)
        } catch {
            log.error("demo failed to load: \(error)")
            problem = .connection("\(error)")
        }
    }

    public func signOut() async {
        await closeSession()
        if !isDemo { await auth.signOut() }
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

    private func open(_ hass: URL) async {
        do {
            let auth = self.auth
            let client = try HAClient(baseURL: hass, transport: transport, token: { try await auth.accessToken() }, options: clientOptions)
            await adopt(HomeSession(client: client), demo: false)
        } catch {
            log.error("bad Home Assistant address")
            phase = .signedOut
            problem = .missingURL
        }
    }

    private func adopt(_ s: HomeSession, demo: Bool) async {
        await closeSession()
        session = s
        isDemo = demo
        phase = .signedIn
        let client = s.client
        watcher = Task { [weak self] in
            for await status in await client.statusUpdates() {
                if case .authFailed = status {
                    await self?.refused()
                    return
                }
            }
        }
        await s.start()
    }

    /// Home Assistant refused the token for good: back to the sign-in page with a message.
    private func refused() async {
        let stored = (try? await auth.storedTokens()) ?? nil
        let longLived = stored.map { $0.refreshToken == nil } ?? false
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
