import Foundation

/// What the windows behind the summary chips list (port of `chipmodals/LightsModal.tsx` and `DoorsModal.tsx`).
/// `entities` are all entities; hidden ones are left out here. Where the web walks `Object.values(entities)` (the order
/// Home Assistant sent them), the app sorts by entity id: it does not keep that order.
public enum ChipWindows {
    /// A room's lights, or the lights in no room (`room == nil`, "Other").
    public struct LightGroup: Equatable, Sendable {
        public var room: Room?
        public var ids: [String]
        /// A stable key for lists: the room's id, or "other".
        public var key: String { room?.id ?? "other" }
    }

    /// The lights grouped by room in the user's room order, then the lights in no room. Rooms without lights are left out.
    public static func lightGroups(_ entities: [String: HAEntity], rooms: [Room], roomOrder: [String]?,
                                   hidden: [String]) -> [LightGroup] {
        let hiddenSet = Set(hidden)
        let lights = entities.keys.filter { $0.hasPrefix("light.") && !hiddenSet.contains($0) }.sorted()
        var groups: [LightGroup] = []
        var assigned = Set<String>()
        let ordered = RoomSections.applyStoredOrder(rooms.map(\.id), roomOrder).compactMap { id in rooms.first { $0.id == id } }
        for room in ordered {
            let ids = (room.domains["light"] ?? []).filter { !hiddenSet.contains($0) && entities[$0] != nil }
            guard !ids.isEmpty else { continue }
            groups.append(LightGroup(room: room, ids: ids))
            assigned.formUnion(ids)
        }
        let other = lights.filter { !assigned.contains($0) }
        if !other.isEmpty { groups.append(LightGroup(room: nil, ids: other)) }
        return groups
    }

    /// Any light that is on (the "turn all off" button), without hidden ones.
    public static func lightsOn(_ entities: [String: HAEntity], hidden: [String]) -> [String] {
        let hiddenSet = Set(hidden)
        return entities.values.filter { $0.domain == "light" && $0.state == "on" && !hiddenSet.contains($0.entityId) }
            .map(\.entityId).sorted()
    }

    /// The brightness in percent (`Math.round(brightness / 255 * 100)`), nil without a brightness.
    public static func brightnessPercent(_ e: HAEntity) -> Int? {
        guard case .number(let b)? = e.attributes["brightness"] else { return nil }
        return Int((b / 255 * 100).rounded(.toNearestOrAwayFromZero))
    }

    /// A row's name: the friendly name, else the part after the domain.
    public static func name(_ e: HAEntity) -> String {
        if let n = e.friendlyName { return n }
        let parts = e.entityId.split(separator: ".", omittingEmptySubsequences: false)
        return parts.count > 1 ? String(parts[1]) : e.entityId
    }

    /// The door and window sensors: doors (door, garage door, opening) and windows, each with the open ones first.
    public struct Openings: Equatable, Sendable {
        public var doors: [String] = []
        public var windows: [String] = []
        public var isEmpty: Bool { doors.isEmpty && windows.isEmpty }
    }

    public static func openings(_ entities: [String: HAEntity], hidden: [String]) -> Openings {
        let hiddenSet = Set(hidden)
        let sensors = entities.values.filter { e in
            guard e.entityId.hasPrefix("binary_sensor."), !hiddenSet.contains(e.entityId) else { return false }
            return ["door", "window", "opening", "garage_door"].contains(e.attributes["device_class"]?.string ?? "")
        }.sorted { $0.entityId < $1.entityId }
        func openFirst(_ list: [HAEntity]) -> [String] {
            (list.filter { $0.state == "on" } + list.filter { $0.state != "on" }).map(\.entityId)
        }
        let doors = sensors.filter { ["door", "garage_door", "opening"].contains($0.attributes["device_class"]?.string ?? "") }
        let windows = sensors.filter { $0.attributes["device_class"]?.string == "window" }
        return Openings(doors: openFirst(doors), windows: openFirst(windows))
    }
}

/// Lock controls (port of `lockLogic.ts`): unlocking always asks, locking only when a code is needed; no action while
/// a lock moves, is jammed or cannot be reached.
extension Locks {
    public enum Service: String, Sendable { case lock, unlock }

    static let busyStates: Set<String> = ["locking", "unlocking", "opening", "jammed", "unavailable", "unknown"]

    public static func busy(_ state: String) -> Bool { busyStates.contains(state) }

    /// The lock expects a code (Home Assistant's `code_format` regex).
    public static func needsCode(_ e: HAEntity) -> Bool {
        if case .string(let f)? = e.attributes["code_format"] { return !f.isEmpty }
        return false
    }

    /// Digits only (`/^\^?\\d[+*{]/` on the regex): the code field gets the number pad.
    public static func codeIsNumeric(_ e: HAEntity) -> Bool {
        guard case .string(var f)? = e.attributes["code_format"] else { return false }
        if f.hasPrefix("^") { f.removeFirst() }
        guard f.hasPrefix("\\d"), let next = f.dropFirst(2).first else { return false }
        return "+*{".contains(next)
    }

    public static func needsDialog(_ service: Service, _ entities: [HAEntity]) -> Bool {
        service == .unlock || entities.contains(where: needsCode)
    }
}

extension ChipWindows {
    /// The locks window (`LocksModal.tsx`): every visible lock, the ones not locked first, then by name in the UI
    /// language (the web: `localeCompare` in the browser language).
    public static func locks(_ entities: [String: HAEntity], hidden: [String], locale: Locale) -> [String] {
        let hiddenSet = Set(hidden)
        let list = entities.values.filter { $0.entityId.hasPrefix("lock.") && !hiddenSet.contains($0.entityId) }
            .sorted { $0.entityId < $1.entityId }
        func name(_ e: HAEntity) -> String { e.friendlyName ?? e.entityId }
        return list.enumerated().sorted { a, b in
            let oa = a.element.state != "locked", ob = b.element.state != "locked"
            if oa != ob { return oa }
            switch JSCompare.locale(name(a.element), name(b.element), locale) {
            case .orderedAscending: return true
            case .orderedDescending: return false
            case .orderedSame: return a.offset < b.offset
            }
        }.map(\.element.entityId)
    }

    /// The room an entity belongs to (`getRoomName`).
    public static func roomName(_ id: String, rooms: [Room]) -> String? {
        rooms.first { $0.entityIds.contains(id) }?.name
    }
}

extension ChipWindows {
    /// The garage window (`GarageModal.tsx`): every visible garage door and gate, open (or moving) ones first, then by
    /// name in the UI language (the web: `localeCompare` in the browser language).
    public static func garages(_ entities: [String: HAEntity], hidden: [String], locale: Locale) -> [String] {
        let hiddenSet = Set(hidden)
        let list = entities.values.filter { Garage.isGarageDoor($0) && !hiddenSet.contains($0.entityId) }
            .sorted { $0.entityId < $1.entityId }
        func name(_ e: HAEntity) -> String { e.friendlyName ?? e.entityId }
        return list.enumerated().sorted { a, b in
            let oa = Garage.isOpen(a.element.state), ob = Garage.isOpen(b.element.state)
            if oa != ob { return oa }
            switch JSCompare.locale(name(a.element), name(b.element), locale) {
            case .orderedAscending: return true
            case .orderedDescending: return false
            case .orderedSame: return a.offset < b.offset
            }
        }.map(\.element.entityId)
    }

    /// An MDI name as the web writes it ("mdi:gate-open") as the app's icon name ("mdi.mdiGateOpen").
    public static func appIcon(mdi name: String) -> String {
        let parts = name.replacingOccurrences(of: "mdi:", with: "").split(separator: "-")
        return "mdi.mdi" + parts.map { $0.prefix(1).uppercased() + $0.dropFirst() }.joined()
    }
}
