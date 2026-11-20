import Foundation

/// One open WebSocket to Home Assistant. `receive` throws once the socket is closed.
public protocol HASocket: Sendable {
    func send(_ text: String) async throws
    func receive() async throws -> String
    func close() async
}

/// Opens WebSockets. The app uses `URLSessionHATransport`; tests use a fake Home Assistant (Linux has no
/// URLSessionWebSocketTask worth relying on, and the tests need to drop connections on purpose).
public protocol HATransport: Sendable {
    func open(_ url: URL) async throws -> any HASocket
}

public enum HAURL {
    /// The address as the user typed it → the base URL of Home Assistant, or nil when it is none. Spaces and trailing
    /// slashes go (like the web's sign-in page). Without a scheme: `http://` for a local name (`.local`, an IP
    /// address, port 8123), `https://` for everything else (Nabu Casa, own domain behind a proxy).
    public static func normalize(_ input: String) -> URL? {
        var raw = input.trimmingCharacters(in: .whitespacesAndNewlines)
        while raw.hasSuffix("/") && !raw.hasSuffix("://") { raw.removeLast() }
        guard !raw.isEmpty else { return nil }
        if raw.range(of: "^[a-zA-Z][a-zA-Z0-9+.-]*://", options: .regularExpression) == nil {
            let host = String(raw.prefix { $0 != "/" && $0 != ":" }).lowercased()
            let port = raw.dropFirst(host.count).hasPrefix(":8123")
            let ip = host.range(of: #"^\d{1,3}(\.\d{1,3}){3}$"#, options: .regularExpression) != nil
            raw = (ip || port || host.hasSuffix(".local") || host == "localhost" ? "http://" : "https://") + raw
        }
        guard let c = URLComponents(string: raw), let scheme = c.scheme?.lowercased(), scheme == "http" || scheme == "https",
              let host = c.host, !host.isEmpty, c.query == nil, c.fragment == nil else { return nil }
        return c.url
    }

    /// `https://ha.example:8123/` → `wss://ha.example:8123/api/websocket` (http → ws).
    public static func websocket(_ base: URL) -> URL? {
        guard var c = URLComponents(url: base, resolvingAgainstBaseURL: false) else { return nil }
        switch c.scheme?.lowercased() {
        case "https": c.scheme = "wss"
        case "http": c.scheme = "ws"
        case "wss", "ws": break
        default: return nil
        }
        var path = c.path
        while path.hasSuffix("/") { path.removeLast() }
        c.path = path + "/api/websocket"
        c.query = nil
        c.fragment = nil
        return c.url
    }
}

#if canImport(Darwin)
public struct URLSessionHATransport: HATransport {
    public init() {}

    public func open(_ url: URL) async throws -> any HASocket {
        let task = URLSession.shared.webSocketTask(with: url)
        task.maximumMessageSize = 64 << 20 // the first subscribe_entities answer of a big home is several MB
        task.resume()
        return URLSessionHASocket(task: task)
    }
}

final class URLSessionHASocket: HASocket, @unchecked Sendable {
    private let task: URLSessionWebSocketTask

    init(task: URLSessionWebSocketTask) { self.task = task }

    func send(_ text: String) async throws { try await task.send(.string(text)) }

    func receive() async throws -> String {
        switch try await task.receive() {
        case .string(let s): return s
        case .data(let d): return String(decoding: d, as: UTF8.self)
        @unknown default: return ""
        }
    }

    func close() async { task.cancel(with: .goingAway, reason: nil) }
}
#endif
