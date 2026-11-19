import Foundation

public enum HAConnectionStatus: Equatable, Sendable {
    case idle
    case connecting
    case connected(haVersion: String)
    /// Lost; the client tries again by itself. The app shows "veralteter Stand" in this state.
    case disconnected(reason: String)
    /// Home Assistant refused the token. No retry: the user has to sign in again.
    case authFailed(reason: String)
}

public struct HAError: Error, Equatable, Sendable, CustomStringConvertible {
    public let code: String
    public let message: String

    public init(_ code: String, _ message: String) {
        self.code = code
        self.message = message
    }

    public static let notConnected = HAError("not_connected", "Not connected to Home Assistant")
    public static let timeout = HAError("timeout", "Home Assistant did not answer in time")
    public static let authInvalid = HAError("auth_invalid", "Home Assistant refused the access token")
    public static let protocolError = HAError("protocol", "Unexpected message from Home Assistant")

    public var description: String { "\(code): \(message)" }
}

/// Supplies a valid access token for each (re)connect. The OAuth layer refreshes an expired token in here.
public typealias HATokenProvider = @Sendable () async throws -> String

public struct HASubscription: Hashable, Sendable {
    let key: UUID
}

/// Home Assistant WebSocket client: sign-in with the access token, commands with answers, subscriptions that are
/// renewed after every reconnect, ping to notice a dead connection, retries with growing pauses. The same job as
/// home-assistant-js-websocket in the web app.
public actor HAClient {
    public struct Options: Sendable {
        public var retryDelays: [Duration] = [.seconds(1), .seconds(2), .seconds(5), .seconds(10), .seconds(30)]
        public var commandTimeout: Duration = .seconds(30)
        public var pingInterval: Duration = .seconds(30)
        public init() {}
    }

    private struct Sub {
        let message: [String: JSONValue]
        let handler: @Sendable (JSONValue) -> Void
        var haId: Int?
    }

    private let url: URL
    private let transport: any HATransport
    private let token: HATokenProvider
    private let options: Options
    private let log = Log("ha")

    private var socket: (any HASocket)?
    private var nextId = 1
    private var pending: [Int: CheckedContinuation<JSONValue, Error>] = [:]
    private var subs: [UUID: Sub] = [:]
    private var subByHaId: [Int: UUID] = [:]
    private var loop: Task<Void, Never>?
    private var pinger: Task<Void, Never>?
    private var watchers: [UUID: AsyncStream<HAConnectionStatus>.Continuation] = [:]

    public private(set) var status: HAConnectionStatus = .idle {
        didSet { if status != oldValue { for w in watchers.values { w.yield(status) } } }
    }
    public private(set) var haVersion: String?

    /// `baseURL` is the Home Assistant address as the user typed it (`https://ha.example:8123`).
    public init(baseURL: URL, transport: any HATransport, token: @escaping HATokenProvider, options: Options = Options()) throws {
        guard let ws = HAURL.websocket(baseURL) else { throw HAError("bad_url", "Not an http(s) address") }
        url = ws
        self.transport = transport
        self.token = token
        self.options = options
    }

    /// Current status first, then every change.
    public func statusUpdates() -> AsyncStream<HAConnectionStatus> {
        let (stream, cont) = AsyncStream<HAConnectionStatus>.makeStream()
        let key = UUID()
        watchers[key] = cont
        cont.yield(status)
        cont.onTermination = { [weak self] _ in Task { await self?.dropWatcher(key) } }
        return stream
    }

    private func dropWatcher(_ key: UUID) { watchers[key] = nil }

    /// Connects and keeps the connection up until `stop()`. Calling it again while running does nothing.
    public func start() {
        guard loop == nil else { return }
        loop = Task { await self.run() }
    }

    /// Closes the connection and stops retrying (app in the background, sign-out). Subscriptions are kept and renewed
    /// by the next `start()`.
    public func stop() async {
        loop?.cancel()
        loop = nil
        await dropSocket(reason: "stopped")
        status = .idle
    }

    // MARK: commands

    /// Sends a command (`type` plus fields, without `id`) and returns its `result`.
    public func command(_ message: [String: JSONValue]) async throws -> JSONValue {
        guard let socket, case .connected = status else { throw HAError.notConnected }
        return try await send(message, on: socket)
    }

    public func callService(
        _ domain: String, _ service: String, data: [String: JSONValue]? = nil,
        target: [String: JSONValue]? = nil, returnResponse: Bool = false
    ) async throws -> JSONValue {
        var m: [String: JSONValue] = ["type": "call_service", "domain": .string(domain), "service": .string(service)]
        if let data { m["service_data"] = .object(data) }
        if let target { m["target"] = .object(target) }
        if returnResponse { m["return_response"] = true }
        return try await command(m)
    }

    /// Subscribes (`subscribe_entities`, `subscribe_events`, `frontend/subscribe_user_data` …); the handler gets each
    /// `event`. The subscription survives reconnects. When not connected it is registered and sent on connect.
    @discardableResult
    public func subscribe(_ message: [String: JSONValue], _ handler: @escaping @Sendable (JSONValue) -> Void) async throws -> HASubscription {
        let key = UUID()
        subs[key] = Sub(message: message, handler: handler, haId: nil)
        if let socket, case .connected = status {
            do { try await sendSubscription(key, on: socket) } catch {
                subs[key] = nil
                throw error
            }
        }
        return HASubscription(key: key)
    }

    public func unsubscribe(_ sub: HASubscription) async {
        guard let s = subs.removeValue(forKey: sub.key) else { return }
        guard let haId = s.haId else { return }
        subByHaId[haId] = nil
        if let socket, case .connected = status {
            _ = try? await send(["type": "unsubscribe_events", "subscription": .number(Double(haId))], on: socket)
        }
    }

    // MARK: connection loop

    private func run() async {
        var attempt = 0
        while !Task.isCancelled {
            status = .connecting
            do {
                let s = try await transport.open(url)
                socket = s
                let version = try await handshake(s)
                haVersion = version
                status = .connected(haVersion: version)
                log.info("connected to Home Assistant \(version)")
                attempt = 0
                startPinger(s)
                Task { await self.renewSubscriptions(on: s) }
                try await readLoop(s)
            } catch let e as HAError where e == .authInvalid {
                await dropSocket(reason: e.message)
                status = .authFailed(reason: e.message)
                log.error("sign-in refused by Home Assistant")
                loop = nil
                return
            } catch {
                if Task.isCancelled { break }
                await dropSocket(reason: "\(error)")
                status = .disconnected(reason: "\(error)")
                log.error("connection lost: \(error)")
            }
            if Task.isCancelled { break }
            let delays = options.retryDelays
            let delay = delays.isEmpty ? Duration.seconds(5) : delays[min(attempt, delays.count - 1)]
            attempt += 1
            try? await Task.sleep(for: delay)
        }
    }

    private func handshake(_ s: any HASocket) async throws -> String {
        let first = try Self.decode(try await s.receive())
        guard first["type"]?.string == "auth_required" else { throw HAError.protocolError }
        let access = try await token()
        try await s.send(Self.encode(["type": "auth", "access_token": .string(access)]))
        let answer = try Self.decode(try await s.receive())
        switch answer["type"]?.string {
        case "auth_ok": return answer["ha_version"]?.string ?? ""
        case "auth_invalid": throw HAError.authInvalid
        default: throw HAError.protocolError
        }
    }

    private func readLoop(_ s: any HASocket) async throws {
        while !Task.isCancelled {
            let text = try await s.receive()
            let value = try Self.decode(text)
            if case .array(let many) = value { for m in many { handle(m) } } else { handle(value) }
        }
    }

    private func handle(_ m: JSONValue) {
        guard let idNum = m["id"]?.number else { return }
        let id = Int(idNum)
        switch m["type"]?.string {
        case "event":
            if let key = subByHaId[id], let sub = subs[key] { sub.handler(m["event"] ?? .null) }
        case "result":
            guard let cont = pending.removeValue(forKey: id) else { return }
            if m["success"]?.bool == true {
                cont.resume(returning: m["result"] ?? .null)
            } else {
                let err = m["error"]
                cont.resume(throwing: HAError(err?["code"]?.string ?? "unknown", err?["message"]?.string ?? ""))
            }
        case "pong":
            pending.removeValue(forKey: id)?.resume(returning: .null)
        default:
            break
        }
    }

    private func send(_ message: [String: JSONValue], on s: any HASocket) async throws -> JSONValue {
        let id = nextId
        nextId += 1
        var m = message
        m["id"] = .number(Double(id))
        let text = try Self.encode(m)
        let timeout = options.commandTimeout
        return try await withCheckedThrowingContinuation { (cont: CheckedContinuation<JSONValue, Error>) in
            pending[id] = cont
            Task {
                do { try await s.send(text) } catch { self.fail(id, error) }
            }
            Task {
                try? await Task.sleep(for: timeout)
                self.fail(id, HAError.timeout)
            }
        }
    }

    private func fail(_ id: Int, _ error: Error) {
        pending.removeValue(forKey: id)?.resume(throwing: error)
    }

    private func sendSubscription(_ key: UUID, on s: any HASocket) async throws {
        guard let sub = subs[key] else { return }
        // registered before the answer: Home Assistant may send the first event right behind the result
        let id = nextId
        subs[key]?.haId = id
        subByHaId[id] = key
        do { _ = try await send(sub.message, on: s) } catch {
            subByHaId[id] = nil
            subs[key]?.haId = nil
            throw error
        }
    }

    private func renewSubscriptions(on s: any HASocket) async {
        for key in subs.keys where subs[key]?.haId == nil {
            do { try await sendSubscription(key, on: s) } catch {
                log.error("subscription \(subs[key]?.message["type"]?.string ?? "?") failed: \(error)")
            }
        }
    }

    private func startPinger(_ s: any HASocket) {
        pinger?.cancel()
        let every = options.pingInterval
        pinger = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: every)
                if Task.isCancelled { return }
                do { _ = try await self.send(["type": "ping"], on: s) } catch {
                    self.log.error("no pong: \(error)")
                    await s.close()
                    return
                }
            }
        }
    }

    private func dropSocket(reason: String) async {
        pinger?.cancel()
        pinger = nil
        let s = socket
        socket = nil
        for (_, c) in pending { c.resume(throwing: HAError.notConnected) }
        pending = [:]
        subByHaId = [:]
        for k in subs.keys { subs[k]?.haId = nil }
        await s?.close()
    }

    static func encode(_ m: [String: JSONValue]) throws -> String {
        let enc = JSONEncoder()
        enc.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return String(decoding: try enc.encode(JSONValue.object(m)), as: UTF8.self)
    }

    static func decode(_ text: String) throws -> JSONValue {
        try JSONDecoder().decode(JSONValue.self, from: Data(text.utf8))
    }
}

extension JSONValue: ExpressibleByStringLiteral, ExpressibleByBooleanLiteral, ExpressibleByFloatLiteral, ExpressibleByIntegerLiteral,
    ExpressibleByArrayLiteral, ExpressibleByDictionaryLiteral {
    public init(arrayLiteral elements: JSONValue...) { self = .array(elements) }
    public init(dictionaryLiteral elements: (String, JSONValue)...) { self = .object(Dictionary(elements) { _, b in b }) }
    public init(stringLiteral value: String) { self = .string(value) }
    public init(booleanLiteral value: Bool) { self = .bool(value) }
    public init(floatLiteral value: Double) { self = .number(value) }
    public init(integerLiteral value: Int) { self = .number(Double(value)) }
}
