import Foundation

/// The sections of the overview (port of `SECTION_IDS` and the visibility rule of `Home.tsx`, outside edit mode).
public enum HomeSections {
    /// Default order: the hints first (only what deviates from normal).
    public static let ids = ["hints", "scenes", "hero", "energy", "devices", "climate", "blinds", "security", "waste", "nvr",
                             "activity", "rooms"]

    /// The sections to show, in the user's order (`homeSectionOrder`). Hidden ones (`hiddenSections`) are left out, on
    /// the phone (`compact`, the web's < 900 px) also `mobileHiddenSections`; the rooms without a room with devices, the
    /// waste card without bins, the NVR card without a Sentinel connection, the hints card while nothing deviates.
    public static func visible(order: [String], hidden: [String], mobileHidden: [String], compact: Bool,
                               hasRooms: Bool, hasWaste: Bool, hasNvr: Bool, hasHints: Bool) -> [String] {
        let hiddenSet = Set(hidden), mobileSet = Set(mobileHidden)
        return RoomSections.applyStoredOrder(ids, order).filter { id in
            if hiddenSet.contains(id) || (compact && mobileSet.contains(id)) { return false }
            switch id {
            case "rooms": return hasRooms
            case "waste": return hasWaste
            case "nvr": return hasNvr
            case "hints": return hasHints
            default: return true
            }
        }
    }
}

/// A room tile of the overview in Glas (port of `GlasRoomTile.tsx` and `roomTone.ts`): its two lines, its tone and
/// what it says to VoiceOver. The rooms list uses the same status words and tone.
public enum RoomTile {
    public enum Tone: String, Sendable { case on, warn, alarm }

    /// How loud a status symbol is (`STATUS_TONE`); an unknown status warns.
    static let statusTone: [String: Tone] = ["grid-2x2": .warn, "door-open": .warn, "car": .alarm, "droplets": .alarm, "flame": .alarm]

    /// `roomTone`: the status first, then yellow while a light is on.
    public static func tone(iconName: String, isStatus: Bool, lightsOn: Int) -> Tone? {
        isStatus ? (statusTone[iconName] ?? .warn) : lightsOn > 0 ? .on : nil
    }

    /// `roomStatusText`: the status in words ("Window open"), nil without one.
    public static func statusText(_ l: Localizer, iconName: String, isStatus: Bool) -> String? {
        guard isStatus else { return nil }
        switch iconName {
        case "grid-2x2": return l.t("hints.windowOpen", ["count": 1])
        case "door-open": return l.t("hints.doorOpen", ["count": 1])
        case "car": return l.t("hints.garageOpen", ["count": 1])
        case "droplets": return l.t("hints.leak")
        case "flame": return l.t("hints.smoke")
        default: return nil
        }
    }

    public struct Lines: Equatable, Sendable {
        public var line1: String
        public var line2: String?
        /// line 2 is a status (shown in `label`, 600)
        public var isStatus: Bool
        public var accessibilityLabel: String
    }

    /// Line 1: temperature and humidity ("21.5° · 45%"), else how many devices. Line 2: the status, else the lights
    /// ("2 lights on", "Lights off"), else the devices when line 1 shows the climate.
    public static func lines(_ l: Localizer, name: String, iconName: String, isStatus: Bool, temperature: Double?,
                             humidity: Double?, lights: Int, lightsOn: Int, devices: Int) -> Lines {
        let locale = l.locale.rawValue
        var climate: [String] = []
        if let temperature { climate.append(NumberFormat.format(temperature, locale: locale, maxDecimals: 1, minDecimals: 1) + "°") }
        if let humidity { climate.append(percent(humidity, locale: locale)) }
        let climateLine = climate.joined(separator: " · ")
        let deviceLine = l.t("home.hero.deviceCount", ["count": .number(Double(devices))])
        let status = statusText(l, iconName: iconName, isStatus: isStatus)
        let lightLine = lights > 0
            ? (lightsOn > 0 ? l.t("glas.hero.lightsOn", ["count": .number(Double(lightsOn))]) : l.t("glas.hero.lightsOff"))
            : nil
        let line1 = climateLine.isEmpty ? deviceLine : climateLine
        let line2 = status ?? lightLine ?? (climateLine.isEmpty ? nil : deviceLine)
        let label = [l.t("home.roomsQuickAccess.roomAria", ["name": .text(name)]), line1, line2].compactMap { $0 }
            .filter { !$0.isEmpty }.joined(separator: ", ")
        return Lines(line1: line1, line2: line2, isStatus: status != nil, accessibilityLabel: label)
    }

    /// `Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 })` of a value in percent.
    /// Rounded first, half away from zero like `Intl` (`FormatStyle` alone rounds half to even, and 44.5 / 100
    /// is not exact as a binary number).
    public static func percent(_ value: Double, locale: String) -> String {
        (value.rounded(.toNearestOrAwayFromZero) / 100)
            .formatted(.percent.precision(.fractionLength(0)).rounded(rule: .toNearestOrAwayFromZero)
                .locale(Locale(identifier: locale)))
    }
}
