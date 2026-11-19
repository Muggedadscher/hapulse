import Foundation

/// What the summary chips of the home page count (port of `chipCounts.ts`): one rule for the chips and the subtitles
/// of their windows. The caller leaves out hidden entities first.
public struct ChipCounts: Equatable, Sendable {
    /// `person.*` at home. The web keeps Home Assistant's order of the entity map; the app has none and sorts by
    /// entity id.
    public var peopleHome: [HAEntity] = []
    public var lightsOn = 0
    /// open door, window, opening and garage door sensors (`binary_sensor.*`)
    public var openDoorWindow = 0
    /// the most severe alarm panel
    public var alarm: HAEntity?
    public var mediaPlaying = 0
    public var poolPresent = false
    public var poolRunning = false
    public var garages = Garage.Summary()
    public var locks = Locks.Summary()

    static let openingClasses: Set<String> = ["door", "window", "opening", "garage_door"]

    /// `poolPump`: running = `on`; `poolRequired`: the pool chip shows only when all of them exist.
    public static func count(_ entities: [String: HAEntity], poolPump: String, poolRequired: [String]) -> ChipCounts {
        let all = entities.values.sorted { $0.entityId < $1.entityId }
        var c = ChipCounts()
        c.peopleHome = all.filter { $0.entityId.hasPrefix("person.") && $0.state == "home" }
        c.lightsOn = all.filter { $0.entityId.hasPrefix("light.") && $0.state == "on" }.count
        c.openDoorWindow = all.filter {
            $0.entityId.hasPrefix("binary_sensor.") && $0.state == "on"
                && openingClasses.contains($0.attributes["device_class"]?.string ?? "")
        }.count
        c.alarm = Alarm.pickPanel(all)
        c.mediaPlaying = all.filter { $0.entityId.hasPrefix("media_player.") && $0.state == "playing" }.count
        c.poolPresent = poolRequired.allSatisfy { entities[$0] != nil }
        c.poolRunning = entities[poolPump]?.state == "on"
        c.garages = Garage.summary(all.filter(Garage.isGarageDoor))
        c.locks = Locks.summary(all.filter { $0.entityId.hasPrefix("lock.") })
        return c
    }
}

/// Home hints ("Hinweise", port of `hints.ts`): only what deviates from normal, with the counting rules of the chips
/// and the security cards.
public enum Hints {
    public enum Kind: String, Sendable, CaseIterable {
        // the order inside one severity
        case alarmTriggered = "alarm-triggered", leak, smoke, garageOpen = "garage-open", lockOpen = "lock-open"
        case garageFault = "garage-fault", lockFault = "lock-fault", windowOpen = "window-open", doorOpen = "door-open"
        case alarmPending = "alarm-pending", cameraNotRecording = "camera-not-recording"
        case heatingMissing = "heating-missing", wasteSoon = "waste-soon"

        public var severity: Severity {
            switch self {
            case .alarmTriggered, .leak, .smoke, .garageOpen, .lockOpen: .critical
            case .garageFault, .lockFault, .windowOpen, .doorOpen, .alarmPending, .cameraNotRecording: .warning
            case .heatingMissing, .wasteSoon: .info
            }
        }
        var order: Int { Self.allCases.firstIndex(of: self)! }
    }

    public enum Severity: Int, Sendable, Comparable {
        case critical, warning, info
        public static func < (a: Self, b: Self) -> Bool { a.rawValue < b.rawValue }
    }

    /// A room with a thermostat but no heating plan.
    public struct MissingPlan: Equatable, Sendable {
        public var areaId: String
        public var name: String
        public var thermostats: [String]
        public init(areaId: String, name: String, thermostats: [String]) {
            self.areaId = areaId; self.name = name; self.thermostats = thermostats
        }
    }

    public struct Hint: Equatable, Sendable, Identifiable {
        /// stable: the kind, for waste and heating plus the bin or the room
        public var id: String
        public var kind: Kind
        public var severity: Severity { kind.severity }
        public var count: Int
        /// the entities behind the hint, sorted; empty for cameras
        public var entityIds: [String]
        public var bin: Waste.Bin?
        public var room: (areaId: String, name: String)? {
            get { roomId.map { ($0, roomName ?? "") } }
            set { roomId = newValue?.areaId; roomName = newValue?.name }
        }
        var roomId: String? = nil
        var roomName: String? = nil
    }

    public static let doorOpenMinutes = 10
    static let windowClasses: Set<String> = ["window"]
    static let doorClasses: Set<String> = ["door", "opening", "garage_door"]
    static let leakClasses: Set<String> = ["moisture"]
    static let smokeClasses: Set<String> = ["smoke", "gas", "carbon_monoxide"]

    static func binarySensorOn(_ e: HAEntity, _ classes: Set<String>) -> Bool {
        guard e.entityId.hasPrefix("binary_sensor."), e.state == "on", let dc = e.attributes["device_class"]?.string else { return false }
        return classes.contains(dc)
    }

    /// The hints, critical → warning → info, inside one severity in a fixed order. `recheckAt`: when the list changes
    /// without an entity update (a door reaching its minutes).
    public static func collect(_ entities: [HAEntity], now: Date, hidden: Set<String> = [], doorOpenMinutes: Int? = nil,
                               waste: [Waste.Bin] = [], camerasNotRecording: Int = 0, heatingMissing: [MissingPlan] = [],
                               locale: Locale = .current) -> (hints: [Hint], recheckAt: Date?) {
        let visible = entities.filter { !hidden.contains($0.entityId) }
        let nowMs = Int64((now.timeIntervalSince1970 * 1000).rounded(.down))
        let doorMs = Int64(max(0, doorOpenMinutes ?? Self.doorOpenMinutes)) * 60_000
        var found: [Kind: [String]] = [:]
        var recheck: Int64?
        for e in visible {
            let id = e.entityId
            if binarySensorOn(e, leakClasses) { found[.leak, default: []].append(id) }
            else if binarySensorOn(e, smokeClasses) { found[.smoke, default: []].append(id) }
            else if binarySensorOn(e, windowClasses) { found[.windowOpen, default: []].append(id) }
            else if binarySensorOn(e, doorClasses) {
                let due = e.lastChangedMs + doorMs
                if due <= nowMs { found[.doorOpen, default: []].append(id) }
                else if recheck == nil || due < recheck! { recheck = due }
            } else if Garage.isGarageDoor(e) {
                switch Garage.status(e.state) {
                case .open, .moving: found[.garageOpen, default: []].append(id)
                case .unavailable: found[.garageFault, default: []].append(id)
                case .closed: break
                }
            } else if id.hasPrefix("lock.") {
                if Locks.isOpen(e.state) { found[.lockOpen, default: []].append(id) }
                else if Locks.hasProblem(e.state) { found[.lockFault, default: []].append(id) }
            }
        }
        if let alarm = Alarm.pickPanel(visible) {
            if alarm.state == "triggered" { found[.alarmTriggered, default: []].append(alarm.entityId) }
            else if alarm.state == "arming" || alarm.state == "pending" { found[.alarmPending, default: []].append(alarm.entityId) }
        }

        var hints: [Hint] = found.map { kind, ids in
            Hint(id: kind.rawValue, kind: kind, count: ids.count, entityIds: JSString.sortUTF16(ids))
        }
        if camerasNotRecording > 0 {
            hints.append(Hint(id: Kind.cameraNotRecording.rawValue, kind: .cameraNotRecording, count: camerasNotRecording, entityIds: []))
        }
        for room in heatingMissing {
            let ids = JSString.sortUTF16(room.thermostats.filter { !hidden.contains($0) })
            if ids.isEmpty { continue }
            var h = Hint(id: "heating-missing:\(room.areaId)", kind: .heatingMissing, count: 1, entityIds: ids)
            h.room = (room.areaId, room.name)
            hints.append(h)
        }
        for bin in waste {
            guard !hidden.contains(bin.entityId), let d = bin.daysTo, d >= 0, d <= 1 else { continue }
            hints.append(Hint(id: "waste-soon:\(bin.entityId)", kind: .wasteSoon, count: 1, entityIds: [bin.entityId], bin: bin))
        }
        hints.sort { a, b in
            if a.severity != b.severity { return a.severity < b.severity }
            if a.kind != b.kind { return a.kind.order < b.kind.order }
            let da = a.bin?.daysTo ?? 0, db = b.bin?.daysTo ?? 0
            if da != db { return da < db }
            let r = JSCompare.locale(a.roomName ?? "", b.roomName ?? "", locale)
            if r != .orderedSame { return r == .orderedAscending }
            return JSCompare.locale(a.id, b.id, locale) == .orderedAscending
        }
        return (hints, recheck.map { Date(timeIntervalSince1970: Double($0) / 1000) })
    }
}

/// "Active" scenes (port of `activeScene.ts`), a heuristic: activated at most 12 h ago, no later scene with a shared
/// member, and no member changed since (15 s grace, 2 min for covers) or unavailable. Scenes without a member list
/// are never active.
public enum ActiveScenes {
    public static let graceMs: Int64 = 15_000
    public static let coverGraceMs: Int64 = 120_000
    public static let maxAgeMs: Int64 = 12 * 3_600_000

    /// The member entity ids a scene lists.
    public static func members(_ scene: HAEntity) -> [String] {
        (scene.attributes["entity_id"]?.array ?? []).compactMap { v in v.string.flatMap { $0.isEmpty ? nil : $0 } }
    }

    public static func ids(_ scenes: [HAEntity], states: (String) -> HAEntity?, now: Date,
                           grace: Int64 = graceMs, coverGrace: Int64 = coverGraceMs, maxAge: Int64 = maxAgeMs) -> Set<String> {
        let coverGrace = max(grace, coverGrace)
        let nowMs = Int64((now.timeIntervalSince1970 * 1000).rounded(.down))
        let all = scenes.filter { $0.entityId.hasPrefix("scene.") }.map { s in
            (id: s.entityId, at: JSDate.parse(s.state).map { Int64(($0.timeIntervalSince1970 * 1000).rounded(.down)) }, members: members(s))
        }
        var active = Set<String>()
        for s in all {
            guard let at = s.at, !s.members.isEmpty, nowMs - at <= maxAge else { continue }
            let overruled = all.contains { o in
                o.id != s.id && (o.at ?? .min) > at && o.members.contains { s.members.contains($0) }
            }
            if overruled { continue }
            var untouched = true, seen = 0
            for m in s.members {
                guard let e = states(m) else { continue }
                seen += 1
                if e.state == "unavailable" { untouched = false; break }
                let allowed = m.hasPrefix("cover.") ? coverGrace : grace
                if e.lastUpdatedMs > at + allowed { untouched = false; break }
            }
            if untouched, seen > 0 { active.insert(s.id) }
        }
        return active
    }
}
