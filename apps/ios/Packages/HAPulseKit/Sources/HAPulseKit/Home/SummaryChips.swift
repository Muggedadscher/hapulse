import Foundation

/// The summary chips of the home page (port of `SummaryChipsBar.tsx`/`SummaryChips.tsx`): which chips show and in
/// which order. The counts are `ChipCounts`, over the entities without the hidden ones.
public enum SummaryChips {
    public enum Chip: String, CaseIterable, Sendable {
        case people, lights, doors, alarm, media, pool, garage, locks
    }

    /// Where the chips' order is stored (`customization.entityOrder[...]`).
    public static let orderKey = "__home:chips"

    /// The pool's entities (`POOL_ENTITIES` of `poolConfig.ts`): the pump, and what must exist for the pool chip.
    public static let poolPump = "switch.esppoolpumpe_poolpumpe"
    public static let poolRequired = ["input_select.modus_poolpumpe", "switch.esppoolpumpe_poolpumpe"]

    /// The chips to show, in order. `homeChips` empty or all of them = all; a chip without its devices (alarm panel,
    /// pool, garage doors, locks) is left out. The stored order wins; until the user moved them, the pool chip sits
    /// before the media chip, the garage chip after the doors chip and the locks chip after the garage (else doors).
    public static func visible(_ c: ChipCounts, homeChips: [String], order: [String]?) -> [Chip] {
        let all = Chip.allCases
        let enabled = homeChips.isEmpty || homeChips.count == all.count ? all.map(\.rawValue) : homeChips
        let defs = all.filter { chip in
            guard enabled.contains(chip.rawValue) else { return false }
            switch chip {
            case .alarm: return c.alarm != nil
            case .pool: return c.poolPresent
            case .garage: return c.garages.total > 0
            case .locks: return c.locks.total > 0
            default: return true
            }
        }
        var ids = RoomSections.applyStoredOrder(defs.map(\.rawValue), order)
        func place(_ id: String, _ anchor: String, after: Bool) {
            guard ids.contains(id), ids.contains(anchor), !(order ?? []).contains(id) else { return }
            ids.removeAll { $0 == id }
            let at = ids.firstIndex(of: anchor)!
            ids.insert(id, at: after ? at + 1 : at)
        }
        place("pool", "media", after: false)
        place("garage", "doors", after: true)
        place("locks", ids.contains("garage") ? "garage" : "doors", after: true)
        return ids.compactMap(Chip.init(rawValue:))
    }

    /// How the alarm chip looks in Glas: armed (green), triggered (red), anything else not disarmed (warning).
    public enum AlarmTone: Sendable, Equatable { case none, armed, triggered, other }

    public static func alarmTone(_ state: String?) -> AlarmTone {
        guard let state, state != "disarmed" else { return .none }
        if state == "triggered" { return .triggered }
        return state.hasPrefix("armed") ? .armed : .other
    }
}
