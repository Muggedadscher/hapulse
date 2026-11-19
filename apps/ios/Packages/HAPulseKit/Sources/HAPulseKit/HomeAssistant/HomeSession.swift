import Foundation
import Observation

/// The signed-in Home Assistant user (`auth/current_user`).
public struct HAUser: Equatable, Sendable {
    public var id: String
    public var name: String
    public var isAdmin: Bool
    public var isOwner: Bool
}

/// One connection to Home Assistant as the app uses it: status, entities, user and settings, kept current by
/// subscriptions. SwiftUI observes it. Live and demo use the same code; demo only swaps the transport
/// (`DemoHA`).
@MainActor
@Observable
public final class HomeSession {
    public static let globalKey = "hapulse:global"
    public static let userKey = "hapulse:user-settings"
    public static let snapshotKey = "hapulse:settings"

    public private(set) var status: HAConnectionStatus = .idle
    public private(set) var entities = EntityStore()
    public private(set) var user: HAUser?
    public private(set) var settings = SettingsState()
    /// true once `hapulse:global` exists: an admin manages the settings for everybody.
    public private(set) var managed = false
    /// false until the first full entity list has arrived (the UI shows its loading state until then).
    public private(set) var loaded = false

    public let client: HAClient
    private let log = Log("session")
    private var tasks: [Task<Void, Never>] = []
    private var userTask: Task<Void, Never>?
    private var wired = false

    /// Everything the subscriptions deliver goes through ONE stream, drained by one task on the main actor: events
    /// arrive in the order Home Assistant sent them (separate tasks per event could swap two entity updates).
    private enum Incoming: Sendable {
        case entities(JSONValue)
        case global(JSONValue?)
        case user(JSONValue?)
        case snapshot(JSONValue?)
    }
    private let inbox: AsyncStream<Incoming>
    private let inboxIn: AsyncStream<Incoming>.Continuation
    private var userDoc: JSONObject?
    private var globalDoc: JSONObject?

    /// Tokens kept on this device (Keychain), with the origin of the server they belong to.
    public struct DeviceSecrets: Equatable, Sendable {
        public var sentinelOrigin: String?
        public var sentinelToken: String
        public var musicOrigin: String?
        public var musicToken: String?
        public init(sentinelOrigin: String? = nil, sentinelToken: String = "", musicOrigin: String? = nil, musicToken: String? = nil) {
            self.sentinelOrigin = sentinelOrigin
            self.sentinelToken = sentinelToken
            self.musicOrigin = musicOrigin
            self.musicToken = musicToken
        }
    }

    public var deviceSecrets = DeviceSecrets() { didSet { recompute() } }

    public init(client: HAClient) {
        self.client = client
        (inbox, inboxIn) = AsyncStream<Incoming>.makeStream()
    }

    /// A session against the built-in demo home.
    public static func demo() throws -> HomeSession {
        let ha = DemoHA(home: try DemoHome.load())
        let client = try HAClient(baseURL: URL(string: "https://demo.invalid")!, transport: ha, token: { DemoHA.token })
        return HomeSession(client: client)
    }

    public var isAdmin: Bool { user?.isAdmin == true }

    /// Starts the connection. The subscriptions and the readers are set up on the first call only; after `stop()`
    /// (app in the background) the next `start()` reconnects and the client renews the same subscriptions.
    public func start() async {
        if !wired {
            wired = true
            let stream = inbox
            tasks.append(Task { [weak self] in
                for await item in stream {
                    guard let self else { return }
                    self.receive(item)
                }
            })
            tasks.append(Task { [weak self] in
                guard let stream = await self?.client.statusUpdates() else { return }
                for await s in stream {
                    guard let self else { return }
                    self.status = s
                    if case .connected = s { self.loadUser() } else { self.userTask?.cancel() }
                }
            })
            await subscribeAll()
        }
        await client.start()
    }

    public func stop() async {
        userTask?.cancel()
        userTask = nil
        await client.stop()
    }

    /// Ends the session for good (sign-out): the readers stop too.
    public func close() async {
        await stop()
        for t in tasks { t.cancel() }
        tasks = []
        inboxIn.finish()
    }

    // MARK: internals

    private func subscribeAll() async {
        let inbox = inboxIn
        let subscriptions: [([String: JSONValue], @Sendable (JSONValue) -> Void)] = [
            (["type": "subscribe_entities"], { ev in inbox.yield(.entities(ev)) }),
            (["type": "frontend/subscribe_system_data", "key": .string(Self.globalKey)], { ev in inbox.yield(.global(ev["value"])) }),
            (["type": "frontend/subscribe_user_data", "key": .string(Self.userKey)], { ev in inbox.yield(.user(ev["value"])) }),
            (["type": "frontend/subscribe_user_data", "key": .string(Self.snapshotKey)], { ev in inbox.yield(.snapshot(ev["value"])) }),
        ]
        // each on its own: one refused subscription must not keep the others from being registered
        for (message, handler) in subscriptions {
            do { _ = try await client.subscribe(message, handler) } catch {
                log.error("\(message["type"]?.string ?? "?") refused: \(error)")
            }
        }
    }

    private func receive(_ item: Incoming) {
        switch item {
        case .entities(let ev): applyEntities(ev)
        case .global(let v): applyGlobal(v)
        case .user(let v): applyUser(v)
        case .snapshot(let v): applySnapshot(v)
        }
    }

    /// `auth/current_user` after every connect, retried while connected: without it an admin would lose the tokens
    /// that only admins keep. Runs on its own so the status reader is never blocked.
    private func loadUser() {
        userTask?.cancel()
        userTask = Task { [weak self] in
            var pause = 1
            while !Task.isCancelled {
                guard let client = self?.client else { return }
                do {
                    let u = try await client.command(["type": "auth/current_user"])
                    guard !Task.isCancelled, let self else { return }
                    self.user = HAUser(id: u["id"]?.string ?? "", name: u["name"]?.string ?? "",
                                       isAdmin: u["is_admin"]?.bool ?? false, isOwner: u["is_owner"]?.bool ?? false)
                    self.log.info("signed in as \(self.user?.isAdmin == true ? "admin" : "user")")
                    self.recompute() // admin rights decide which tokens stay
                    return
                } catch {
                    self?.log.error("auth/current_user failed: \(error)")
                }
                try? await Task.sleep(for: .seconds(pause))
                pause = min(pause * 2, 30)
            }
        }
    }

    private func applyEntities(_ ev: JSONValue) {
        entities.apply(ev)
        if !loaded, ev["a"] != nil {
            loaded = true
            log.info("entities loaded: \(entities.entities.count)")
        }
    }

    private var snapshot: JSONObject?

    private func applyGlobal(_ value: JSONValue?) {
        if case .object(let o)? = value, SettingsRules.isValidGlobalDoc(value) {
            globalDoc = o
        } else if value == nil || value == .null {
            globalDoc = nil
        } else {
            log.error("ignoring malformed hapulse:global document")
            return
        }
        recompute()
    }

    private func applyUser(_ value: JSONValue?) {
        guard case .object(let o)? = value, SettingsRules.isValidUserPayload(value) else { return }
        userDoc = o
        recompute()
    }

    private func applySnapshot(_ value: JSONValue?) {
        guard case .object(let o)? = value else { return }
        snapshot = o
        recompute()
    }

    static func bindDeviceToken(_ c: inout JSONObject, url: String, token: String, own: String, origin: String?, empty: JSONValue) {
        guard !own.isEmpty, c[token]?.string == own else { return } // not this device's token (shared or none)
        let target = SettingsSecrets.originOf(c[url]?.string)
        if target == nil || target != SettingsSecrets.originOf(origin) { c[token] = empty }
    }

    /// Settings from scratch out of the documents we have: the same result whatever order they arrive in.
    private func recompute() {
        var s = SettingsState()
        // start from what this device holds: its own tokens and the servers they belong to
        var c = s.customization
        c["scryptedUrl"] = .string(deviceSecrets.sentinelOrigin ?? "")
        c["scryptedToken"] = .string(deviceSecrets.sentinelToken)
        c["maServerUrl"] = deviceSecrets.musicOrigin.map(JSONValue.string) ?? .null
        c["maToken"] = deviceSecrets.musicToken.map(JSONValue.string) ?? .null
        s.raw["customization"] = .object(c)
        managed = globalDoc != nil
        if let globalDoc {
            s.applyGlobalDoc(globalDoc, isAdmin: isAdmin)
            if let userDoc {
                s.applyUserDoc(userDoc)
            } else if let d = globalDoc["userDefaults"]?.object {
                // no own document yet: the admin's defaults (the web seeds the document on its first start)
                s.applyUserDoc(["v": 1, "favorites": d["favorites"] ?? .array([]), "language": d["language"] ?? "auto"])
            }
        } else if let snapshot {
            s.applySnapshot(snapshot)
        }
        // A token this device keeps belongs to the server it was entered for. When the address from the documents
        // points elsewhere, the token is not sent there (the web keeps no origin and would send it anyway).
        var cc = s.customization
        Self.bindDeviceToken(&cc, url: "scryptedUrl", token: "scryptedToken", own: deviceSecrets.sentinelToken,
                             origin: deviceSecrets.sentinelOrigin, empty: .string(""))
        Self.bindDeviceToken(&cc, url: "maServerUrl", token: "maToken", own: deviceSecrets.musicToken ?? "",
                             origin: deviceSecrets.musicOrigin, empty: .null)
        s.raw["customization"] = .object(cc)
        if s != settings { settings = s }
    }
}
