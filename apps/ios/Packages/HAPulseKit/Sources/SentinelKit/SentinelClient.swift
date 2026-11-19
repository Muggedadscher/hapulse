import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
import HAPulseKit

// MARK: models (docs/API.md of the plugin; optional fields are absent on older plugins)

public struct SentinelCamera: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var name: String
    public var recording: Bool
    public var online: Bool
    public var stalled: Bool?
    public var stalledSince: Double?
    public var lastSegmentAt: Double?
    public var eventsToday: Int
    public var lastEventTs: Double?
    public var latestThumbId: String?
    public var latestTs: Double?
    public var codecs: String?
    /// Kept as JSON until the camera pages need it (stage 11a).
    public var detection: JSONValue?

    public enum RecordingState: String, Sendable { case off, stalled, offline, ok }

    /// `off` = recording switched off, `stalled` outranks `offline`, else `ok`/`offline`.
    public var recordingState: RecordingState {
        if !recording { return .off }
        if stalled == true { return .stalled }
        return online ? .ok : .offline
    }
}

public struct SentinelStats: Codable, Equatable, Sendable {
    public var cameras: Int
    public var recording: Int
    public var eventsToday: Int
    public var segments: Int
    public var bytes: Double
    public var earliest: Double?
    public var retentionDays: Double
    public var diskFree: Double
    public var diskTotal: Double
    public var minFreeBytes: Double
    public var storageOk: Bool?
    public var storageProblem: String?
    public var features: [String]?

    public func has(_ feature: String) -> Bool { features?.contains(feature) ?? false }
}

public struct SentinelRecentEvent: Codable, Equatable, Sendable {
    public var camera: String
    public var cameraName: String
    public var ts: Double
    public var startTs: Double?
    public var endTs: Double?
    public var open: Bool?
    public var classes: [String]
    public var score: Double
}

public struct SentinelHTTPError: Error, Equatable, Sendable {
    /// 0 = unreachable / timeout
    public let status: Int
    public let path: String
    /// the server's `error` from a JSON error body
    public let code: String?
}

/// GET/POST for the client, so tests can answer without a plugin.
public protocol SentinelHTTP: Sendable {
    func send(_ request: URLRequest) async throws -> (status: Int, contentType: String?, body: Data)
}

public struct URLSessionSentinelHTTP: SentinelHTTP {
    private let session: URLSession
    public init(session: URLSession = .shared) { self.session = session }

    public func send(_ request: URLRequest) async throws -> (status: Int, contentType: String?, body: Data) {
        let (data, resp) = try await session.data(for: request)
        let h = resp as? HTTPURLResponse
        return (h?.statusCode ?? 0, h?.value(forHTTPHeaderField: "Content-Type"), data)
    }
}

/// Client for the plugin's token-guarded `/public/` endpoint (port of `SentinelClient` in `@sentinel-nvr/web/api`,
/// without the player parts; those come with the camera stages).
public struct SentinelClient: Sendable {
    public let origin: String
    public let token: String
    public let base: String
    public let entryURL: String
    private let http: any SentinelHTTP

    public init(origin: String, token: String, prefix: String = "", base: String? = nil, http: any SentinelHTTP = URLSessionSentinelHTTP()) {
        self.origin = origin
        self.token = token
        if let base {
            var b = base
            while b.hasSuffix("/") { b.removeLast() }
            self.base = b + "/"
        } else {
            self.base = SentinelURL.publicBase(origin: origin, prefix: prefix)
        }
        entryURL = SentinelURL.entryURL(origin: origin, prefix: prefix)
        self.http = http
    }

    public func url(_ path: String) -> String { SentinelURL.url(base: base, token: token, path: path) }

    public func snapshotURL(camera: String, bust: Double? = nil, width: Double? = nil) -> String {
        url("api/snapshot?camera=\(SentinelURL.encodeComponent(camera))")
            + (width.map { $0 == 0 ? "" : "&w=\(Int64($0.rounded(.toNearestOrAwayFromZero)))" } ?? "")
            + (bust.map { "&_=\(Self.js($0))" } ?? "")
    }

    public func eventThumbURL(camera: String, ts: Double) -> String {
        url("api/evthumb?camera=\(SentinelURL.encodeComponent(camera))&ts=\(Int64(ts.rounded(.toNearestOrAwayFromZero)))")
    }

    public func eventFrameURL(camera: String, ts: Double) -> String {
        url("api/evframe?camera=\(SentinelURL.encodeComponent(camera))&ts=\(Int64(ts.rounded(.toNearestOrAwayFromZero)))")
    }

    public func segmentThumbURL(_ id: String) -> String { url("api/thumb?id=\(SentinelURL.encodeComponent(id))") }

    /// WebSocket signaling URL (plain WebSocket with JSON).
    public func signalingURL(camera: String, params: [(String, String)] = []) -> String? {
        guard var c = URLComponents(string: url("")) else { return nil }
        c.scheme = c.scheme == "https" ? "wss" : "ws"
        c.fragment = nil
        var items = c.queryItems ?? []
        func set(_ k: String, _ v: String) {
            if let i = items.firstIndex(where: { $0.name == k }) { items[i].value = v } else { items.append(URLQueryItem(name: k, value: v)) }
        }
        set("camera", camera)
        set("signaling", "1")
        for (k, v) in params { set(k, v) }
        c.percentEncodedQuery = items.map { "\(Self.form($0.name))=\(Self.form($0.value ?? ""))" }.joined(separator: "&")
        return c.string
    }

    // MARK: requests

    public func getJSON<T: Decodable>(_ path: String, as: T.Type = T.self, timeout: TimeInterval = 10) async throws -> T {
        let data = try await request(path, method: "GET", timeout: timeout)
        return try JSONDecoder().decode(T.self, from: data)
    }

    public func cameras(tz: String? = TimeZone.current.identifier) async throws -> [SentinelCamera] {
        try await getJSON("api/cameras" + (tz.map { "?tz=\(SentinelURL.encodeComponent($0))" } ?? ""))
    }

    public func stats(tz: String? = TimeZone.current.identifier) async throws -> SentinelStats {
        try await getJSON("api/stats" + (tz.map { "?tz=\(SentinelURL.encodeComponent($0))" } ?? ""))
    }

    public func recentEvents(limit: Int = 2000) async throws -> [SentinelRecentEvent] {
        try await getJSON("api/recent-events?limit=\(limit)")
    }

    /// Fire a control GET: true = 2xx, false = any failure (never throws).
    public func control(_ path: String, timeout: TimeInterval = 8) async -> Bool {
        (try? await request(path, method: "GET", timeout: timeout)) != nil
    }

    private func request(_ path: String, method: String, timeout: TimeInterval, body: Data? = nil, contentType: String? = nil, absolute: String? = nil) async throws -> Data {
        guard let u = URL(string: absolute ?? url(path)) else { throw SentinelHTTPError(status: 0, path: path, code: nil) }
        var req = URLRequest(url: u, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: timeout)
        req.httpMethod = method
        req.httpBody = body
        if let contentType { req.setValue(contentType, forHTTPHeaderField: "Content-Type") }
        let r: (status: Int, contentType: String?, body: Data)
        do { r = try await http.send(req) } catch { throw SentinelHTTPError(status: 0, path: path, code: nil) }
        guard (200..<300).contains(r.status) else {
            var code: String?
            if r.contentType?.contains("json") == true, let j = try? JSONDecoder().decode(JSONValue.self, from: r.body) { code = j["error"]?.string }
            throw SentinelHTTPError(status: r.status, path: path, code: code)
        }
        return r.body
    }

    /// Trades Scrypted admin credentials for the plugin's access token (`POST …/public/api/token-exchange`).
    /// 401 wrong credentials, 403 token access off or not an admin, 404 plugin too old, 429 too many attempts.
    public static func exchangeToken(origin: String, username: String, password: String, prefix: String = "",
                                     http: any SentinelHTTP = URLSessionSentinelHTTP()) async throws -> String {
        let client = SentinelClient(origin: origin, token: "", prefix: prefix, http: http)
        let body = try JSONEncoder().encode(["username": username, "password": password])
        let data = try await client.request("api/token-exchange", method: "POST", timeout: 10, body: body, contentType: "application/json")
        guard let t = (try? JSONDecoder().decode(JSONValue.self, from: data))?["token"]?.string, !t.isEmpty else {
            throw SentinelHTTPError(status: 502, path: "api/token-exchange", code: nil)
        }
        return t
    }

    /// Number like JavaScript prints it in a template string (integers without `.0`).
    static func js(_ d: Double) -> String {
        if d == d.rounded(), abs(d) < 1e21 { return String(Int64(d)) }
        return String(d)
    }

    /// `application/x-www-form-urlencoded` like URLSearchParams.toString.
    static func form(_ s: String) -> String {
        var allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
        allowed.insert(charactersIn: "*-._ ")
        return (s.addingPercentEncoding(withAllowedCharacters: allowed) ?? s).replacingOccurrences(of: " ", with: "+")
    }
}
