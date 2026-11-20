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
