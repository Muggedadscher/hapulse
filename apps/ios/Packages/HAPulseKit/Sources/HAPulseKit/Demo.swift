import Foundation

/// The demo home of the web (`packages/core/src/demo.ts`), exported at a fixed clock. Used for the demo mode, the
/// screenshots in CI and tests, so app and web show the same home.
public struct DemoHome: Sendable {
    /// The instant the demo data were computed for (ISO 8601).
    public let now: Date
    public let registries: JSONValue
    public let entities: [String: JSONValue]
    public let notifications: [JSONValue]

    public static func load() throws -> DemoHome {
        guard let url = Resources.url("demo.json") else { throw CocoaErrorShim.missing("demo.json") }
        let raw = try JSONDecoder().decode(JSONValue.self, from: Data(contentsOf: url))
        guard let nowText = raw["now"]?.string, let now = ISO8601.parse(nowText) else { throw CocoaErrorShim.missing("now") }
        return DemoHome(now: now, registries: raw["registries"] ?? .null, entities: raw["entities"]?.object ?? [:],
                        notifications: raw["notifications"]?.array ?? [])
    }
}

enum CocoaErrorShim: Error { case missing(String) }

/// ISO 8601 with and without fractional seconds (Home Assistant sends both).
public enum ISO8601 {
    // ISO8601DateFormatter is thread safe; made once (a formatter per call cost ~0.1 ms)
    nonisolated(unsafe) private static let withFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    nonisolated(unsafe) private static let plain: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    public static func parse(_ s: String) -> Date? {
        withFraction.date(from: s) ?? plain.date(from: s)
    }
}
