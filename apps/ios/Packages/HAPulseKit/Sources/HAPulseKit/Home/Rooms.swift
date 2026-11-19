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

    /// `locale`: the language the names are sorted in (the web: the browser's language).
    public static func build(_ registries: Registries, locale: Locale = .current, hasState: (String) -> Bool) -> [Room] {
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
                let c = JSCompare.locale(l.1.name, r.1.name, locale)
                return c == .orderedSame ? l.0 < r.0 : c == .orderedAscending
            }
            .map(\.1)
    }

    public static func build(_ registries: Registries, entities: EntityStore, locale: Locale = .current) -> [Room] {
        build(registries, locale: locale) { entities[$0] != nil }
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
    /// `a.localeCompare(b)`: the browser compares with ICU in its own language (`navigator.language`), the app with
    /// ICU in the device language. Same result as Node for every pair of `localeCompare.json` in English and Swedish
    /// (punctuation, Ł/Ø/Æ, ß, emoji; Swedish puts Ä after Z). Known difference: an ignorable character at the end
    /// ("a" + U+200B) and half-width kana compare differently; neither matters for room names.
    public static func locale(_ a: String, _ b: String, _ locale: Locale = .current) -> ComparisonResult {
        a.compare(b, options: [], range: nil, locale: locale)
    }

    /// `parseFloat(s)`: the longest number at the start after white space; nil where JavaScript gives NaN. Works on
    /// UTF-16 units like JavaScript (a digit followed by a combining mark still counts).
    public static func parseFloat(_ s: String) -> Double? {
        let all = Array(s.utf16)
        var start = 0
        while start < all.count, JSText.isSpace(all[start]) { start += 1 }
        let t = all[start...]
        func has(_ prefix: String, at i: Int) -> Bool { t[i...].starts(with: prefix.utf16) }
        if has("Infinity", at: start) || has("+Infinity", at: start) { return .infinity }
        if has("-Infinity", at: start) { return -.infinity }
        func digit(_ i: Int) -> Bool { i < all.count && all[i] >= 0x30 && all[i] <= 0x39 }
        var i = start, end = start, sawDigit = false, sawDot = false, sawExp = false
        if i < all.count, all[i] == 0x2B || all[i] == 0x2D { i += 1 }
        while i < all.count {
            let c = all[i]
            if digit(i) { sawDigit = true; i += 1; end = i; continue }
            if c == 0x2E, !sawDot, !sawExp { sawDot = true; i += 1; if sawDigit { end = i }; continue }
            if c == 0x65 || c == 0x45, sawDigit, !sawExp {
                var j = i + 1
                if j < all.count, all[j] == 0x2B || all[j] == 0x2D { j += 1 }
                guard digit(j) else { break }
                sawExp = true; i = j; continue
            }
            break
        }
        guard sawDigit else { return nil }
        return Double(String(decoding: all[start..<end], as: UTF16.self))
    }
}
