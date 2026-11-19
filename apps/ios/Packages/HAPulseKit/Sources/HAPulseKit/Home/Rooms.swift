import Foundation

/// A room = a Home Assistant area with its entities (port of `Room` in `@hapulse/core`).
public struct Room: Equatable, Sendable, Identifiable {
    public var id: String
    public var name: String
    public var icon: String?
    public var picture: String?
    /// all entities of the room, diagnostic/config ones included
    public var entityIds: [String]
    /// domain → entity ids, without diagnostic/config entities, heating plan entries and entities without a state
    public var domains: [String: [String]]
    /// the keys of `domains` in the order they were added (the web iterates them in that order)
    public var domainOrder: [String]
}

/// Quick figures for a room card (port of `RoomSummary`).
public struct RoomSummary: Equatable, Sendable {
    public var temperature: Double?
    public var humidity: Double?
    public var lightsOn = 0
    public var lightsTotal = 0
    public var mediaPlaying = false
    public var anyMotion = false
    public var climateState: String?
}

/// Port of `rooms.ts` (`buildRooms`, `roomSummary`, `resolveEntityAreaId`) and `heatingPlanLabel.ts`.
public enum Rooms {
    public static let heatingPlanLabel = "heizplan"
    private static let planDomains: Set<String> = ["automation", "schedule", "input_number"]

    public static func domainOf(_ entityId: String) -> String { String(entityId.prefix { $0 != "." }) }

    /// A room's heating plan entry (label `heizplan` on an automation, schedule or temperature helper).
    public static func isHeatingPlanEntry(_ e: EntityEntry) -> Bool {
        e.labels.contains(heatingPlanLabel) && planDomains.contains(domainOf(e.entityId))
    }

    /// The entity's own area first, else its device's area (Home Assistant's own order).
    public static func areaId(of e: EntityEntry, deviceAreas: [String: String?]) -> String? {
        if let a = e.areaId { return a }
        guard let d = e.deviceId, let a = deviceAreas[d] else { return nil }
        return a
    }

    public static func build(_ registries: Registries, hasState: (String) -> Bool) -> [Room] {
        var deviceAreas: [String: String?] = [:]
        for d in registries.devices { deviceAreas[d.id] = d.areaId }
        var rooms: [String: Room] = [:]
        var order: [String] = []
        for a in registries.areas where rooms[a.areaId] == nil {
            rooms[a.areaId] = Room(id: a.areaId, name: a.name, icon: a.icon, picture: a.picture, entityIds: [], domains: [:], domainOrder: [])
            order.append(a.areaId)
        }
        for e in registries.entities {
            if e.disabledBy != nil || e.hiddenBy != nil { continue }
            guard let area = areaId(of: e, deviceAreas: deviceAreas), rooms[area] != nil else { continue }
            rooms[area]!.entityIds.append(e.entityId)
            if e.entityCategory != nil || isHeatingPlanEntry(e) || !hasState(e.entityId) { continue }
            let domain = domainOf(e.entityId)
            if rooms[area]!.domains[domain] == nil { rooms[area]!.domainOrder.append(domain) }
            rooms[area]!.domains[domain, default: []].append(e.entityId)
        }
        // JavaScript's sort is stable: equal names keep the registry order
        return order.enumerated().map { ($0.offset, rooms[$0.element]!) }
            .sorted { l, r in
                let c = JSCompare.locale(l.1.name, r.1.name)
                return c == .orderedSame ? l.0 < r.0 : c == .orderedAscending
            }
            .map(\.1)
    }

    public static func build(_ registries: Registries, entities: EntityStore) -> [Room] {
        build(registries) { entities[$0] != nil }
    }

    /// The sections of the room's page (`roomSections`).
    public static func sections(_ room: Room, entities: EntityStore, settings: SettingsState, editMode: Bool = false,
                                sentinel: Bool = false, cameraIds: [String] = [], heatingPlan: Bool = false)
        -> (sections: [RoomSection], snapshot: [RoomSectionKey: [String]]) {
        let c = settings.customization
        let entityOrder = c["entityOrder"]?[room.id]?.array?.compactMap(\.string)
        let sectionOrder = c["roomSectionOrder"]?[room.id]?.array?.compactMap(\.string)
        return RoomSections.build(.init(
            domains: room.domains, domainOrder: room.domainOrder, entity: { entities[$0] },
            hiddenEntities: settings.hiddenEntities, editMode: editMode, sentinel: sentinel, cameraIds: cameraIds,
            storedEntityOrder: entityOrder, storedSectionOrder: sectionOrder, heatingPlan: heatingPlan))
    }

    public static func summary(_ room: Room, entity: (String) -> HAEntity?) -> RoomSummary {
        var s = RoomSummary()
        for id in room.domains["sensor"] ?? [] {
            guard let e = entity(id) else { continue }
            let dc = e.attributes["device_class"]?.string
            if dc == "temperature", s.temperature == nil, let v = JSCompare.parseFloat(e.state) { s.temperature = v }
            if dc == "humidity", s.humidity == nil, let v = JSCompare.parseFloat(e.state) { s.humidity = v }
        }
        let lights = room.domains["light"] ?? []
        s.lightsTotal = lights.count
        s.lightsOn = lights.filter { entity($0)?.state == "on" }.count
        // the first thermostat that exists (one without a state is skipped, like the web)
        if let e = (room.domains["climate"] ?? []).lazy.compactMap(entity).first {
            if s.temperature == nil, let cur = e.attributes["current_temperature"]?.number { s.temperature = cur }
            if let action = e.attributes["hvac_action"]?.string { s.climateState = action }
            else if e.state != "unavailable" { s.climateState = e.state }
        }
        s.mediaPlaying = (room.domains["media_player"] ?? []).contains { entity($0)?.state == "playing" }
        s.anyMotion = (room.domains["binary_sensor"] ?? []).contains {
            guard let e = entity($0) else { return false }
            return e.attributes["device_class"]?.string == "motion" && e.state == "on"
        }
        return s
    }
}

/// JavaScript behaviour the ported rules depend on.
public enum JSCompare {
    /// `a.localeCompare(b)` with the default (root) collation: letters before case before accents decide in this
    /// order — base letters (ä = a, A = a), then accents (a < ä), then case (lower before upper). Digits are
    /// compared character by character ("Zimmer 10" < "Zimmer 9"), like ICU without numeric collation.
    public static func locale(_ a: String, _ b: String) -> ComparisonResult {
        let primary = compare(fold(a, [.caseInsensitive, .diacriticInsensitive]), fold(b, [.caseInsensitive, .diacriticInsensitive]))
        if primary != .orderedSame { return primary }
        let secondary = compare(fold(a, [.caseInsensitive]), fold(b, [.caseInsensitive]))
        if secondary != .orderedSame { return secondary }
        // tertiary: lower case first
        let ta = a.map { $0.isUppercase ? 1 : 0 }, tb = b.map { $0.isUppercase ? 1 : 0 }
        for (x, y) in zip(ta, tb) where x != y { return x < y ? .orderedAscending : .orderedDescending }
        return ta.count == tb.count ? .orderedSame : (ta.count < tb.count ? .orderedAscending : .orderedDescending)
    }

    private static func fold(_ s: String, _ o: String.CompareOptions) -> [Unicode.Scalar] {
        Array(s.folding(options: o, locale: nil).decomposedStringWithCanonicalMapping.unicodeScalars)
    }

    private static func compare(_ a: [Unicode.Scalar], _ b: [Unicode.Scalar]) -> ComparisonResult {
        for (x, y) in zip(a, b) where x != y { return x.value < y.value ? .orderedAscending : .orderedDescending }
        return a.count == b.count ? .orderedSame : (a.count < b.count ? .orderedAscending : .orderedDescending)
    }

    /// `parseFloat(s)`: the longest number at the start after white space; nil where JavaScript gives NaN.
    public static func parseFloat(_ s: String) -> Double? {
        let t = s.drop { $0.isWhitespace }
        if t.hasPrefix("Infinity") || t.hasPrefix("+Infinity") { return .infinity }
        if t.hasPrefix("-Infinity") { return -.infinity }
        var end = t.startIndex, i = t.startIndex, sawDigit = false, sawDot = false, sawExp = false
        if i < t.endIndex, t[i] == "+" || t[i] == "-" { i = t.index(after: i) }
        while i < t.endIndex {
            let c = t[i]
            if c.isASCII, c.isNumber { sawDigit = true; i = t.index(after: i); end = i; continue }
            if c == ".", !sawDot, !sawExp { sawDot = true; i = t.index(after: i); if sawDigit { end = i }; continue }
            if (c == "e" || c == "E"), sawDigit, !sawExp {
                var j = t.index(after: i)
                if j < t.endIndex, t[j] == "+" || t[j] == "-" { j = t.index(after: j) }
                guard j < t.endIndex, t[j].isASCII, t[j].isNumber else { break }
                sawExp = true; i = j; continue
            }
            break
        }
        guard sawDigit else { return nil }
        return Double(String(t[t.startIndex..<end]))
    }
}
