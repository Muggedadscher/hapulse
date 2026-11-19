import Foundation

/// One Home Assistant entity as the app sees it (same fields as `HassEntity` in home-assistant-js-websocket).
public struct HAEntity: Equatable, Sendable {
    public var entityId: String
    public var state: String
    public var attributes: [String: JSONValue]
    /// `id`, `parent_id`, `user_id` as Home Assistant sent them (kept as JSON so a missing key stays missing).
    public var context: [String: JSONValue]
    /// Milliseconds since 1970, cut like JavaScript's `new Date(seconds * 1000)`.
    public var lastChangedMs: Int64
    public var lastUpdatedMs: Int64

    public var domain: String { String(entityId.prefix { $0 != "." }) }
    public var lastChanged: Date { Date(timeIntervalSince1970: Double(lastChangedMs) / 1000) }
    public var lastUpdated: Date { Date(timeIntervalSince1970: Double(lastUpdatedMs) / 1000) }
    public var friendlyName: String? { attributes["friendly_name"]?.string }

    /// The entity as the web code holds it (ISO times with milliseconds, UTC).
    public var json: JSONValue {
        .object([
            "entity_id": .string(entityId),
            "state": .string(state),
            "attributes": .object(attributes),
            "context": .object(context),
            "last_changed": .string(ISOTime.string(ms: lastChangedMs)),
            "last_updated": .string(ISOTime.string(ms: lastUpdatedMs)),
        ])
    }
}

/// Applies the compressed messages of Home Assistant's `subscribe_entities` (added `a`, changed `c` with `+`/`-`,
/// removed `r`). A port of `processEvent` in home-assistant-js-websocket 9.6; the golden cases in `entities.json` come
/// from that function.
public struct EntityStore: Sendable, Equatable {
    public private(set) var entities: [String: HAEntity] = [:]

    public init() {}

    public subscript(id: String) -> HAEntity? { entities[id] }

    /// Applies one event; returns the ids whose state changed (added, changed or removed).
    @discardableResult
    public mutating func apply(_ event: JSONValue) -> Set<String> {
        var touched = Set<String>()
        if let added = event["a"]?.object {
            for (id, raw) in added {
                let lc = Self.ms(raw["lc"]) ?? 0
                entities[id] = HAEntity(
                    entityId: id,
                    state: raw["s"]?.string ?? "",
                    attributes: raw["a"]?.object ?? [:],
                    context: Self.context(raw["c"]),
                    lastChangedMs: lc,
                    lastUpdatedMs: Self.ms(raw["lu"]) ?? lc
                )
                touched.insert(id)
            }
        }
        if let removed = event["r"]?.array {
            for case .string(let id) in removed where entities.removeValue(forKey: id) != nil { touched.insert(id) }
        }
        if let changed = event["c"]?.object {
            for (id, diff) in changed {
                guard var e = entities[id] else {
                    Log("ha").error("state update for unknown entity \(id)")
                    continue
                }
                if let add = diff["+"] {
                    if let s = add["s"]?.string { e.state = s }
                    switch add["c"] {
                    case .string(let cid)?: e.context["id"] = .string(cid)
                    case .object(let o)?: for (k, v) in o { e.context[k] = v }
                    default: break
                    }
                    if let lc = Self.ms(add["lc"]) {
                        e.lastChangedMs = lc
                        e.lastUpdatedMs = lc
                    } else if let lu = Self.ms(add["lu"]) {
                        e.lastUpdatedMs = lu
                    }
                    if let a = add["a"]?.object { for (k, v) in a { e.attributes[k] = v } }
                }
                if let gone = diff["-"]?["a"]?.array {
                    for case .string(let key) in gone { e.attributes.removeValue(forKey: key) }
                }
                entities[id] = e
                touched.insert(id)
            }
        }
        return touched
    }

    /// All entities in the web code's shape (`HassEntities`).
    public var json: JSONValue { .object(entities.mapValues(\.json)) }

    private static func context(_ c: JSONValue?) -> [String: JSONValue] {
        switch c {
        case .string(let id)?: return ["id": .string(id), "parent_id": .null, "user_id": .null]
        case .object(let o)?: return o
        default: return [:]
        }
    }

    /// Seconds (with fraction) → whole milliseconds, truncated like JavaScript's Date. `nil` for a missing or 0 value
    /// (the library treats `lc: 0` and `lu: 0` as absent).
    private static func ms(_ v: JSONValue?) -> Int64? {
        guard let s = v?.number, s != 0, s.isFinite else { return nil }
        return Int64((s * 1000).rounded(.towardZero))
    }
}

/// ISO 8601 with milliseconds in UTC, exactly like JavaScript's `Date.prototype.toISOString` for years 0…9999.
public enum ISOTime {
    public static func string(ms: Int64) -> String {
        let days = ms >= 0 ? ms / 86_400_000 : (ms - 86_399_999) / 86_400_000
        let rest = ms - days * 86_400_000
        let (y, m, d) = civil(fromDays: days)
        let h = rest / 3_600_000, mi = rest / 60_000 % 60, s = rest / 1000 % 60, f = rest % 1000
        func p(_ v: Int64, _ w: Int) -> String {
            let t = String(v)
            return String(repeating: "0", count: max(0, w - t.count)) + t
        }
        return "\(p(y, 4))-\(p(m, 2))-\(p(d, 2))T\(p(h, 2)):\(p(mi, 2)):\(p(s, 2)).\(p(f, 3))Z"
    }

    /// Howard Hinnant's days-from-civil inverse (proleptic Gregorian calendar).
    private static func civil(fromDays z0: Int64) -> (Int64, Int64, Int64) {
        let z = z0 + 719_468
        let era = (z >= 0 ? z : z - 146_096) / 146_097
        let doe = z - era * 146_097
        let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
        let mp = (5 * doy + 2) / 153
        let d = doy - (153 * mp + 2) / 5 + 1
        let m = mp < 10 ? mp + 3 : mp - 9
        return (yoe + era * 400 + (m <= 2 ? 1 : 0), m, d)
    }
}
