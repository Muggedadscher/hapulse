import Foundation

/// Garage doors and gates: `cover.*` with device class `garage` or `gate` (port of `garage.ts`). Handled like locks
/// (security relevant) instead of like blinds: one status for every view, opening asks first, bulk actions only reach
/// doors that can act right now.
public enum Garage {
    public static let deviceClasses: Set<String> = ["garage", "gate"]

    /// closed, open (also `stopped` half way and any unknown state), moving (opening/closing, counts as open) or
    /// unavailable (unavailable/unknown: neither open nor closed, never "all closed").
    public enum Status: String, Sendable { case closed, open, moving, unavailable }

    public enum Service: String, Sendable { case open, close }

    public struct Summary: Equatable, Sendable {
        public var total = 0
        public var closed = 0
        /// open + moving
        public var open = 0
        public var unavailable = 0
        /// every door is closed: false as soon as one is open or unreachable
        public var allClosed = false
    }

    public static func isGarageDoor(_ e: HAEntity?) -> Bool {
        guard let e, e.entityId.hasPrefix("cover."), let dc = e.attributes["device_class"]?.string else { return false }
        return deviceClasses.contains(dc)
    }

    public static func isGate(_ e: HAEntity) -> Bool { e.attributes["device_class"]?.string == "gate" }

    public static func status(_ state: String) -> Status {
        switch state {
        case "closed": .closed
        case "opening", "closing": .moving
        case "unavailable", "unknown": .unavailable
        default: .open
        }
    }

    /// Not shut: open, half open or moving.
    public static func isOpen(_ state: String) -> Bool {
        let s = status(state)
        return s == .open || s == .moving
    }

    /// Feature bits of Home Assistant's CoverEntityFeature. A door without `supported_features` (template covers)
    /// opens and closes but cannot stop.
    public static func supports(_ e: HAEntity, _ service: Service?) -> Bool {
        guard case .number(let f)? = e.attributes["supported_features"] else { return service != nil }
        let bit = service == .open ? 1 : service == .close ? 2 : 8
        // JavaScript's `&` works on 32-bit integers (ToInt32: truncate, modulo 2^32; never traps on huge values)
        let v = f.isFinite ? Int32(truncatingIfNeeded: Int64(f.rounded(.towardZero).truncatingRemainder(dividingBy: 4_294_967_296))) : 0
        return v & Int32(bit) != 0
    }

    /// Stop only while the door moves and when it supports it.
    public static func canStop(_ e: HAEntity) -> Bool { status(e.state) == .moving && supports(e, nil) }

    /// Can the door run `service` right now (not while moving or unreachable, not when already there)?
    public static func canAct(_ e: HAEntity, _ service: Service) -> Bool {
        guard supports(e, service) else { return false }
        let s = status(e.state)
        return service == .open ? s == .closed : s == .open
    }

    public static func targets(_ doors: [HAEntity], _ service: Service) -> [HAEntity] { doors.filter { canAct($0, service) } }

    /// Opening always asks first (like unlocking); closing runs at once.
    public static func needsDialog(_ service: Service) -> Bool { service == .open }

    public static func summary(_ doors: [HAEntity]) -> Summary {
        var s = Summary(total: doors.count)
        for d in doors {
            switch status(d.state) {
            case .closed: s.closed += 1
            case .unavailable: s.unavailable += 1
            case .open, .moving: s.open += 1
            }
        }
        s.allClosed = !doors.isEmpty && s.closed == doors.count
        return s
    }

    /// MDI icon for the door's status.
    public static func mdiIcon(_ e: HAEntity) -> String {
        let base = isGate(e) ? "mdi:gate" : "mdi:garage"
        switch status(e.state) {
        case .unavailable: return "\(base)-alert"
        case .closed: return base
        case .open, .moving: return "\(base)-open"
        }
    }
}

/// Locks (port of `locks.ts`): one rule for the chip, the security cards and the hints.
public enum Locks {
    static let problemStates: Set<String> = ["jammed", "unavailable", "unknown"]

    public struct Summary: Equatable, Sendable {
        public var total = 0
        public var locked = 0
        /// not locked and not a problem: unlocked, open and the moving states
        public var open = 0
        /// jammed, unavailable or unknown
        public var problem = 0
    }

    /// One open lock → open (red); otherwise one stuck or unreachable lock → problem (amber); all locked → calm.
    public enum Tone: String, Sendable { case locked, open, problem }

    public static func summary(_ locks: [HAEntity]) -> Summary {
        var s = Summary(total: locks.count)
        for l in locks {
            if l.state == "locked" { s.locked += 1 } else if problemStates.contains(l.state) { s.problem += 1 } else { s.open += 1 }
        }
        return s
    }

    public static func tone(_ s: Summary) -> Tone { s.open > 0 ? .open : s.problem > 0 ? .problem : .locked }
    public static func isOpen(_ state: String) -> Bool { state != "locked" && !problemStates.contains(state) }
    public static func hasProblem(_ state: String) -> Bool { problemStates.contains(state) }
}

/// Alarm panels (port of `alarm.ts`): every summary shows the most severe panel, ties by entity id.
public enum Alarm {
    static let severity: [String: Int] = [
        "triggered": 7, "pending": 6, "arming": 5,
        "armed_away": 4, "armed_vacation": 4, "armed_night": 4, "armed_home": 4, "armed_custom_bypass": 4,
        "disarmed": 2, "unavailable": 1, "unknown": 1,
    ]

    public static func sortPanels(_ entities: [HAEntity]) -> [HAEntity] {
        entities.filter { $0.entityId.hasPrefix("alarm_control_panel.") }.sorted { a, b in
            let sa = severity[a.state] ?? 0, sb = severity[b.state] ?? 0
            if sa != sb { return sa > sb }
            return JSCompare.locale(a.entityId, b.entityId) == .orderedAscending
        }
    }

    public static func pickPanel(_ entities: [HAEntity]) -> HAEntity? { sortPanels(entities).first }
}
