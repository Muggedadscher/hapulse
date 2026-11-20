import Foundation

/// A room's icon, kind and status icon (port of `roomIcons.ts`). The tables come from the web through the generator
/// (`Data/roomIcons.json`), so a new keyword there reaches the app with the next generator run.
public enum RoomLook {
    struct Tables: Decodable {
        struct Keyword: Decodable { let keyword: String; let kind: String }
        let keywords: [Keyword]
        let mdi: [String: String]
        let iconByKind: [String: String]
        let canonical: [String]
    }

    static let tables: Tables = {
        guard let url = Resources.url("roomIcons.json"), let data = try? Data(contentsOf: url),
              let t = try? JSONDecoder().decode(Tables.self, from: data) else {
            return Tables(keywords: [], mdi: [:], iconByKind: [:], canonical: [])
        }
        return t
    }()

    /// Lower case, accents off, every run of other characters one space (`normalizeRoomName`).
    static func normalize(_ name: String) -> String {
        let decomposed = name.lowercased().decomposedStringWithCanonicalMapping
        var out = ""
        var gap = false
        for s in decomposed.unicodeScalars {
            if (0x300...0x36F).contains(s.value) { continue }
            if ("a"..."z").contains(s) || ("0"..."9").contains(s) {
                if gap, !out.isEmpty { out.append(" ") }
                gap = false
                out.unicodeScalars.append(s)
            } else {
                gap = true
            }
        }
        return out
    }

    /// The kind of room a name denotes (`living`, `kitchen`, …, else `other`). First keyword wins.
    public static func kind(_ name: String) -> String {
        let n = normalize(name)
        return tables.keywords.first { n.contains($0.keyword) }?.kind ?? "other"
    }

    /// The lucide icon of a room: its own icon when the app knows it, else from the name.
    public static func iconName(name: String, icon: String?) -> String {
        if let icon, !icon.isEmpty {
            let raw = icon.hasPrefix("mdi:") ? String(icon.dropFirst(4)) : icon
            if tables.canonical.contains(raw) { return raw }
            if let mapped = tables.mdi[raw] { return mapped }
        }
        return tables.iconByKind[kind(name)] ?? "house"
    }

    /// Something open or wet in the room (door, garage, window, water, smoke), else nil (`roomStatusIconName`).
    public static func statusIconName(_ room: Room, entity: (String) -> HAEntity?) -> String? {
        var window = false, moisture = false, smoke = false
        for id in room.entityIds {
            guard let e = entity(id) else { continue }
            if Garage.isGarageDoor(e), Garage.isOpen(e.state) { return "car" }
            guard id.hasPrefix("binary_sensor."), e.state == "on" else { continue }
            switch e.attributes["device_class"]?.string {
            case "door": return "door-open"
            case "garage_door": return "car"
            case "window", "opening": window = true
            case "moisture": moisture = true
            case "smoke": smoke = true
            default: break
            }
        }
        if window { return "grid-2x2" }
        if moisture { return "droplets" }
        if smoke { return "flame" }
        return nil
    }
}

/// Where a room's temperature comes from (port of `roomTemperature.ts`) and the capsules of the room card
/// (`roomGlance.ts`).
public enum RoomClimate {
    public struct Reading: Equatable, Sendable {
        public var entityId: String
        public var value: Double
        /// a sensor's unit; nil for a thermostat's current temperature
        public var unit: String?
    }

    public struct Source: Equatable, Sendable {
        public var entityId: String
        public var isClimate: Bool
        public var value: Double?
        public var unit: String?
    }

    public enum GlanceKind: String, Sendable { case temperature, humidity }

    public struct Glance: Equatable, Sendable {
        public var kind: GlanceKind
        public var reading: Reading
    }

    public enum Tone: String, Sendable { case heat, cool, auto, idle }

    static func unit(_ e: HAEntity) -> String? {
        guard let u = e.attributes["unit_of_measurement"]?.string, !u.isEmpty else { return nil }
        return u
    }

    static func isTemperatureSensor(_ e: HAEntity?) -> Bool { e?.attributes["device_class"]?.string == "temperature" }
    static func sensorValue(_ e: HAEntity) -> Double? { JSCompare.parseFloat(e.state) }
    static func climateValue(_ e: HAEntity) -> Double? {
        guard let v = e.attributes["current_temperature"]?.number, v.isFinite else { return nil }
        return v
    }

    /// What an admin can choose from: every temperature sensor, then every thermostat.
    public static func sources(_ room: Room, entity: (String) -> HAEntity?) -> [Source] {
        var out: [Source] = []
        for id in room.domains["sensor"] ?? [] {
            guard let e = entity(id), isTemperatureSensor(e) else { continue }
            out.append(Source(entityId: id, isClimate: false, value: sensorValue(e), unit: unit(e)))
        }
        for id in room.domains["climate"] ?? [] {
            guard let e = entity(id) else { continue }
            out.append(Source(entityId: id, isClimate: true, value: climateValue(e), unit: nil))
        }
        return out
    }

    /// The first temperature sensor with a number, else the first thermostat (only the first that exists).
    public static func automatic(_ room: Room, entity: (String) -> HAEntity?) -> Reading? {
        for id in room.domains["sensor"] ?? [] {
            guard let e = entity(id), isTemperatureSensor(e) else { continue }
            if let v = sensorValue(e) { return Reading(entityId: id, value: v, unit: unit(e)) }
        }
        for id in room.domains["climate"] ?? [] {
            guard let e = entity(id) else { continue }
            return climateValue(e).map { Reading(entityId: id, value: $0, unit: nil) }
        }
        return nil
    }

    /// Whether `source` (`customization.roomTemperatureSource[areaId]`, any JSON) belongs to this room.
    public static func isSource(_ room: Room, entity: (String) -> HAEntity?, _ source: JSONValue?) -> Bool {
        guard let id = source?.string else { return false }
        if (room.domains["climate"] ?? []).contains(id) { return true }
        guard (room.domains["sensor"] ?? []).contains(id) else { return false }
        guard let e = entity(id) else { return true }
        return isTemperatureSensor(e)
    }

    /// The room's temperature: the chosen source (nothing when it has no number), else the automatic rule.
    public static func temperature(_ room: Room, entity: (String) -> HAEntity?, source: JSONValue?) -> Reading? {
        guard isSource(room, entity: entity, source), let id = source?.string else { return automatic(room, entity: entity) }
        guard let e = entity(id) else { return nil }
        if id.hasPrefix("climate.") { return climateValue(e).map { Reading(entityId: id, value: $0, unit: nil) } }
        return sensorValue(e).map { Reading(entityId: id, value: $0, unit: unit(e)) }
    }

    /// `withRoomTemperature`: the summary's temperature from the chosen source. `source` nil = no choice stored.
    public static func withTemperature(_ s: RoomSummary, _ room: Room, entity: (String) -> HAEntity?, source: JSONValue?) -> RoomSummary {
        guard let source else { return s }
        var out = s
        out.temperature = temperature(room, entity: entity, source: source)?.value
        return out
    }

    /// The capsules: temperature (as above) and the first humidity sensor with a number.
    public static func glances(_ room: Room, entity: (String) -> HAEntity?, source: JSONValue?) -> [Glance] {
        var out: [Glance] = []
        if let t = temperature(room, entity: entity, source: source) { out.append(Glance(kind: .temperature, reading: t)) }
        for id in room.domains["sensor"] ?? [] {
            guard let e = entity(id), let v = sensorValue(e), e.attributes["device_class"]?.string == "humidity" else { continue }
            out.append(Glance(kind: .humidity, reading: Reading(entityId: id, value: v, unit: unit(e))))
            break
        }
        return out
    }

    /// A light's brightness in percent while it is on, else nil.
    public static func lightPercent(_ e: HAEntity) -> Int? {
        guard e.state == "on", let b = e.attributes["brightness"]?.number, b.isFinite else { return nil }
        let r = (b / 255 * 100 + 0.5).rounded(.down) // Math.round
        return Int(max(1, min(100, r)))
    }

    /// What a thermostat shows: what it does now, else auto mode, else idle.
    public static func tone(_ e: HAEntity) -> Tone {
        switch e.attributes["hvac_action"]?.string {
        case "heating": return .heat
        case "cooling": return .cool
        default: return e.state == "auto" || e.state == "heat_cool" ? .auto : .idle
        }
    }
}
