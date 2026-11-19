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
    public static func parse(_ s: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = withFraction.date(from: s) { return d }
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        return plain.date(from: s)
    }
}
