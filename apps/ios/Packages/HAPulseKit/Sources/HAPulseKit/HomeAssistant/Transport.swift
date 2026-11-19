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
