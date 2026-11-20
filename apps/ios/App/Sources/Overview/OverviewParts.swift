import SwiftUI
import HAPulseKit
import HAPulseUI

extension HomeSession {
    /// The entities without the ones the user hid (`customization.hiddenEntities`), as the chips and hints count them.
    var visibleEntities: [String: HAEntity] {
        let hidden = Set(settings.hiddenEntities)
        return hidden.isEmpty ? entities.entities : entities.entities.filter { !hidden.contains($0.key) }
    }
}

/// The summary chips of the overview (web `SummaryChips` in Glas): the user's chips in the user's order, each with
/// its count and state; the colour tells the kind (lights yellow, media blue, pool teal, armed alarm green), a warning
/// or danger also the weight. Their windows (people, lights, doors …) come with a later stage; until then a chip
/// does nothing on a tap.
struct SummaryChipsRow: View {
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session

    var body: some View {
        let l = model.localizer
        let c = ChipCounts.count(session.visibleEntities, poolPump: SummaryChips.poolPump, poolRequired: SummaryChips.poolRequired)
        let order = session.settings.customization["entityOrder"]?[SummaryChips.orderKey]?.array?.compactMap(\.string)
        let chips = SummaryChips.visible(c, homeChips: session.settings.strings("homeChips"), order: order)
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(chips, id: \.self) { chip in
                    let look = Self.look(chip, c, l, session.stateTranslations)
                    HPStatusChip(icon: look.icon, text: look.text, state: look.state)
                }
            }
        }
        .scrollClipDisabled()
    }

    /// Icon, words (`chipLabels`) and state of one chip.
    static func look(_ chip: SummaryChips.Chip, _ c: ChipCounts, _ l: Localizer,
                     _ res: EntityDisplay.StateTranslations) -> (icon: String, text: String, state: HPChipState) {
        func count(_ key: String, _ n: Int) -> String { l.t(key, ["count": .number(Double(n))]) }
        switch chip {
        case .people:
            let n = c.peopleHome.count
            return ("lucide.users", n > 0 ? count("home.summaryChips.peopleCount", n) : l.t("home.summaryChips.nobodyHome"),
                    n > 0 ? .active(.accent) : .normal)
        case .lights:
            return ("lucide.lightbulb", c.lightsOn > 0 ? count("home.summaryChips.lightsCount", c.lightsOn) : l.t("home.summaryChips.allOff"),
                    c.lightsOn > 0 ? .active(.yellow) : .normal)
        case .doors:
            return ("lucide.door-open", c.openDoorWindow > 0 ? count("home.summaryChips.openCount", c.openDoorWindow) : l.t("home.summaryChips.allClosed"),
                    c.openDoorWindow > 0 ? .alert : .normal)
        case .alarm:
            let state = c.alarm?.state ?? ""
            let text = state.isEmpty ? l.t("home.summaryChips.unknown") : EntityDisplay.label(l, res, domain: "alarm_control_panel", state: state)
            let look: HPChipState = switch SummaryChips.alarmTone(c.alarm?.state) {
            case .none: .normal
            case .armed: .active(.green)
            case .triggered: .danger
            case .other: .alert
            }
            return ("lucide.shield-alert", text, look)
        case .media:
            return ("lucide.music-2", c.mediaPlaying > 0 ? count("home.summaryChips.mediaCount", c.mediaPlaying) : l.t("home.summaryChips.nothingPlaying"),
                    c.mediaPlaying > 0 ? .active(.blue) : .normal)
        case .pool:
            return ("lucide.waves", l.t(c.poolRunning ? "home.summaryChips.poolRunning" : "home.summaryChips.poolIdle"),
                    c.poolRunning ? .active(.teal) : .normal)
        case .garage:
            let g = c.garages
            if g.open > 0 { return ("mdi.mdiGarageOpen", count("garage.openCount", g.open), .danger) }
            if g.unavailable > 0 { return ("mdi.mdiGarageAlert", count("garage.unavailableCount", g.unavailable), .alert) }
            return ("mdi.mdiGarage", l.t("home.summaryChips.allClosed"), .normal)
        case .locks:
            let s = c.locks
            if s.open > 0 { return ("lucide.lock-open", count("home.security.unlockedCount", s.open), .danger) }
            if s.problem > 0 { return ("lucide.lock", count("locks.problemCount", s.problem), .alert) }
            return ("lucide.lock", l.t("home.summaryChips.locksAllLocked"), .normal)
        }
    }
}

/// The overview's "Notices" (web `HintsCard` with `useHints`): only what deviates from normal, critical first. Shown
/// only while there is a hint. Recomputed every minute too, so a door counts once it is open long enough and a bin's
/// "today"/"tomorrow" moves at midnight without an entity update.
struct HintsSection: View {
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session

    var body: some View {
        TimelineView(.everyMinute) { context in
            let now = max(context.date, Date.now)
            let l = model.localizer
            let locale = Locale(identifier: l.locale.rawValue)
            let visible = session.visibleEntities
            let list = visible.keys.sorted().compactMap { visible[$0] }
            let waste = Waste.bins(list, now: now, locale: locale)
            // cameras (Sentinel) and missing heating plans (admins) come with their stages
            let hints = Hints.collect(list, now: now, waste: waste, locale: locale).hints
            if !hints.isEmpty {
                HintsCard(hints: hints)
            }
        }
    }
}

struct HintsCard: View {
    let hints: [Hints.Hint]
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session
    @Environment(WindowNav.self) private var nav
    @Environment(\.horizontalSizeClass) private var sizeClass

    var body: some View {
        let l = model.localizer
        VStack(alignment: .leading, spacing: 6) {
            HPCardHead(l.t("hints.title"), icon: "lucide.bell")
            HPListGroup(separatorInset: 60) {
                ForEach(hints) { h in
                    let words = self.text(h, l)
                    Button {
                        act(h)
                    } label: {
                        HPListRow(words.title, subtitle: words.sub.isEmpty ? nil : words.sub, icon: Self.icon(h.kind),
                                  tone: Self.tone(h.severity), minHeight: 60) {
                            HPIcon("lucide.chevron-right", size: 16, strokeWidth: 2).foregroundStyle(.glas(.label3))
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("hp.hint.\(h.kind.rawValue)")
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("hp.hints")
    }

    static func icon(_ kind: Hints.Kind) -> String {
        switch kind {
        case .alarmTriggered, .alarmPending: "lucide.shield-alert"
        case .leak: "lucide.droplets"
        case .smoke: "lucide.flame"
        case .garageOpen: "mdi.mdiGarageOpen"
        case .garageFault: "mdi.mdiGarageAlert"
        case .lockOpen: "lucide.lock-open"
        case .lockFault: "lucide.lock"
        case .windowOpen: "lucide.grid-2x2"
        case .doorOpen: "lucide.door-open"
        case .cameraNotRecording: "lucide.cctv"
        case .heatingMissing: "lucide.calendar-clock"
        case .wasteSoon: "lucide.trash-2"
        }
    }

    static func tone(_ severity: Hints.Severity) -> HPTone {
        switch severity {
        case .critical: .red
        case .warning: .orange
        case .info: .blue
        }
    }

    /// At most three names, then "+N" (`nameList`).
    static func nameList(_ names: [String], _ l: Localizer) -> String {
        var seen = Set<String>()
        let unique = names.filter { !$0.isEmpty && seen.insert($0).inserted }
        if unique.count <= 3 { return unique.joined(separator: ", ") }
        return unique.prefix(3).joined(separator: ", ") + " " + l.t("hints.more", ["n": .number(Double(unique.count - 3))])
    }

    /// The bin's date, "Fri, 21 Nov" (`formatWasteDate`: weekday, day, month; the year only when it is not this year).
    static func wasteDate(_ iso: String, locale: Locale, now: Date = .now) -> String {
        let parts = iso.prefix(10).split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3,
              let date = Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2])) else { return iso }
        var style = Date.FormatStyle(locale: locale).weekday(.abbreviated).day().month(.abbreviated)
        if parts[0] != Calendar.current.component(.year, from: now) { style = style.year() }
        return date.formatted(style)
    }

    private func text(_ h: Hints.Hint, _ l: Localizer) -> (title: String, sub: String) {
        var roomOf: [String: String] = [:]
        for room in session.rooms {
            for id in room.entityIds { roomOf[id] = room.name }
        }
        func name(_ id: String) -> String { session.entities[id]?.friendlyName ?? String(id.split(separator: ".").last ?? Substring(id)) }
        let places = Self.nameList(h.entityIds.map { roomOf[$0] ?? name($0) }, l)
        let names = Self.nameList(h.entityIds.map(name), l)
        func count(_ key: String) -> String { l.t(key, ["count": .number(Double(h.count))]) }
        switch h.kind {
        case .alarmTriggered, .alarmPending:
            let id = h.entityIds.first ?? ""
            let state = EntityDisplay.label(l, session.stateTranslations, domain: "alarm_control_panel", state: session.entities[id]?.state ?? "")
            return (l.t("hints.alarm", ["state": .text(state)]), name(id))
        case .leak: return (l.t("hints.leak"), places)
        case .smoke: return (l.t("hints.smoke"), places)
        // "Tap to close/lock" comes with the garage and locks windows; until then a tap opens the detail
        case .garageOpen: return (count("hints.garageOpen"), names)
        case .garageFault: return (count("hints.garageFault"), names)
        case .lockOpen: return (count("hints.lockOpen"), names)
        case .lockFault: return (count("hints.lockFault"), names)
        case .windowOpen: return (count("hints.windowOpen"), places)
        case .doorOpen: return (count("hints.doorOpen"), places)
        case .cameraNotRecording: return (count("hints.cameraNotRecording"), "")
        case .heatingMissing: return (l.t("hints.heatingMissing"), h.room?.name ?? places)
        case .wasteSoon:
            let bin = h.bin
            let title = l.t(bin?.daysTo == 0 ? "hints.wasteToday" : "hints.wasteTomorrow", ["name": .text(bin?.name ?? "")])
            return (title, bin?.nextDate.map { Self.wasteDate($0, locale: Locale(identifier: l.locale.rawValue)) } ?? "")
        }
    }

    /// What a hint opens. The chip windows (garage, locks, doors, alarm) and the bin window come with their stage;
    /// until then the first entity's detail stands in.
    private func act(_ h: Hints.Hint) {
        switch h.kind {
        case .cameraNotRecording:
            nav.open(.nvr, compact: sizeClass == .compact)
        case .heatingMissing:
            guard let room = h.room else { return }
            nav.open(.rooms, compact: sizeClass == .compact)
            nav.roomsPath = [room.areaId]
        default:
            if let id = h.entityIds.first { nav.detailID = id }
        }
    }
}
