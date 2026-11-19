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

    public init(client: HAClient) { self.client = client }

    /// A session against the built-in demo home.
    public static func demo() throws -> HomeSession {
        let ha = DemoHA(home: try DemoHome.load())
        let client = try HAClient(baseURL: URL(string: "https://demo.invalid")!, transport: ha, token: { DemoHA.token })
        return HomeSession(client: client)
    }

    public var isAdmin: Bool { user?.isAdmin == true }

    /// Starts the connection and the subscriptions; safe to call once per session.
    public func start() async {
        await subscribeAll()
        tasks.append(Task { [weak self] in
            guard let stream = await self?.client.statusUpdates() else { return }
            for await s in stream {
                guard let self else { return }
                self.status = s
                if case .connected = s { await self.afterConnect() }
            }
        })
        await client.start()
    }

    public func stop() async {
        for t in tasks { t.cancel() }
        tasks = []
        await client.stop()
    }

    // MARK: internals

    private func subscribeAll() async {
        do {
            _ = try await client.subscribe(["type": "subscribe_entities"]) { [weak self] ev in
                Task { @MainActor in self?.applyEntities(ev) }
            }
            _ = try await client.subscribe(["type": "frontend/subscribe_system_data", "key": .string(Self.globalKey)]) { [weak self] ev in
                Task { @MainActor in self?.applyGlobal(ev["value"]) }
            }
            _ = try await client.subscribe(["type": "frontend/subscribe_user_data", "key": .string(Self.userKey)]) { [weak self] ev in
                Task { @MainActor in self?.applyUser(ev["value"]) }
            }
            _ = try await client.subscribe(["type": "frontend/subscribe_user_data", "key": .string(Self.snapshotKey)]) { [weak self] ev in
                Task { @MainActor in self?.applySnapshot(ev["value"]) }
            }
        } catch {
            log.error("subscribing failed: \(error)") // not connected yet: registered, sent on connect
        }
    }

    private func afterConnect() async {
        do {
            let u = try await client.command(["type": "auth/current_user"])
            user = HAUser(id: u["id"]?.string ?? "", name: u["name"]?.string ?? "",
                          isAdmin: u["is_admin"]?.bool ?? false, isOwner: u["is_owner"]?.bool ?? false)
            log.info("signed in as \(user?.isAdmin == true ? "admin" : "user")")
            recompute() // admin rights decide which tokens stay
        } catch {
            log.error("auth/current_user failed: \(error)")
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
        if s != settings { settings = s }
    }
}
