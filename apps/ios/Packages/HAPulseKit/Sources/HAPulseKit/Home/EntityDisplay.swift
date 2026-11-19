import Foundation

/// How an entity is shown: its state text, its icon, whether it belongs in the favourites strip (port of `domain.ts`
/// and `entityStates.ts` in `@hapulse/core`).
public enum EntityDisplay {
    /// Home Assistant's own state translations (`frontend/get_translations`, category `entity_component`).
    public typealias StateTranslations = [String: String]

    public static func domainOf(_ entityId: String) -> String { String(entityId.prefix { $0 != "." }) }

    public static func isToggleable(_ domain: String) -> Bool {
        ["light", "switch", "fan", "input_boolean", "media_player"].contains(domain)
    }

    /// Whether a favourite is worth showing now (something on, open, playing, or a value).
    public static func isFavoriteRelevant(_ e: HAEntity) -> Bool {
        let s = e.state
        if s == "unavailable" || s == "unknown" { return false }
        switch e.domain {
        case "light", "switch", "fan", "input_boolean", "siren", "humidifier", "binary_sensor": return s == "on"
        case "cover": return s == "open"
        case "lock": return s == "unlocked"
        case "media_player": return s == "playing" || s == "paused"
        case "climate": return s != "off"
        case "alarm_control_panel": return s != "disarmed"
        case "vacuum": return s == "cleaning" || s == "returning"
        case "sensor", "number", "weather", "sun", "person": return true
        default: return !["off", "idle", "standby", "closed", "locked", "disarmed"].contains(s)
        }
    }

    /// `lookupEntityState`: Home Assistant's wording for a state (or an attribute's value), device class first.
    public static func lookup(_ res: StateTranslations, domain: String, state: String, deviceClass: String? = nil,
                              attribute: String? = nil) -> String? {
        guard !domain.isEmpty, !state.isEmpty else { return nil }
        for bucket in (deviceClass.map { [$0, "_"] } ?? ["_"]) {
            let base = "component.\(domain).entity_component.\(bucket)"
            let key = attribute.map { "\(base).state_attributes.\($0).state.\(state)" } ?? "\(base).state.\(state)"
            if let hit = res[key] { return hit }
        }
        return nil
    }

    /// `humanizeState`: `fan_only` → `Fan only` (dashes/underscores to spaces, first letter upper case).
    public static func humanize(_ state: String) -> String {
        var out = ""
        var run = false
        for ch in state {
            if ch == "-" || ch == "_" {
                if !run { out.append(" ") }
                run = true
            } else {
                out.append(ch)
                run = false
            }
        }
        let trimmed = JSString.trim(out)
        guard let first = trimmed.utf16.first else { return trimmed }
        if UTF16.isLeadSurrogate(first) || UTF16.isTrailSurrogate(first) { return trimmed } // JS leaves a lone half as is
        let head = String(decoding: [first], as: UTF16.self)
        return JSString.upper(head) + String(decoding: trimmed.utf16.dropFirst(), as: UTF16.self)
    }

    /// The app's label for a state: Home Assistant's wording, else the app's own (`entityState.*`), else humanized
    /// (`useStateLabel` of the web).
    public static func label(_ l: Localizer, _ res: StateTranslations, domain: String, state: String,
                             deviceClass: String? = nil, attribute: String? = nil) -> String {
        if state.isEmpty { return "" }
        if let ha = lookup(res, domain: domain, state: state, deviceClass: deviceClass, attribute: attribute) { return ha }
        if let own = l.dict["entityState.\(state)"] ?? l.fallback["entityState.\(state)"] { return own }
        return humanize(state)
    }

    public typealias Label = (_ domain: String, _ state: String, _ deviceClass: String?) -> String

    private static let numericDomains: Set<String> = ["sensor", "number", "input_number", "counter"]

    /// `formatEntityState`. `label` nil = the raw state (what a non-UI caller wants). `timeZone` for timestamps.
    public static func formatState(_ e: HAEntity, locale: String? = nil, label: Label? = nil,
                                   timeZone: TimeZone = .current) -> String {
        let state = e.state
        if state == "unavailable" || state == "unknown" { return label?(e.domain, "unavailable", nil) ?? "unavailable" }
        if e.attributes["device_class"]?.string == "timestamp", !state.isEmpty, let date = JSDate.parse(state) {
            return JSDate.localeString(date, locale: locale ?? "en", timeZone: timeZone)
        }
        // a unit that is present (any JSON but null) makes a number a value with unit
        if let unit = e.attributes["unit_of_measurement"], unit != .null, let n = JSCompare.parseFloat(state) {
            // a narrow no-break space (U+202F) between number and unit, as the web writes it
            return "\(NumberFormat.format(n, locale: locale ?? "en"))\u{202F}\(JSString.of(unit))"
        }
        if numericDomains.contains(e.domain), isPlainNumber(state), let n = JSCompare.parseFloat(state) {
            return NumberFormat.format(n, locale: locale ?? "en", maxDecimals: 2)
        }
        guard let label else { return state }
        return label(e.domain, state, e.attributes["device_class"]?.string)
    }

    /// `/^\s*-?\d+(\.\d+)?\s*$/`
    static func isPlainNumber(_ s: String) -> Bool {
        let u = Array(s.utf16)
        var i = 0, j = u.count
        while i < j, JSText.isSpace(u[i]) { i += 1 }
        while j > i, JSText.isSpace(u[j - 1]) { j -= 1 }
        if i < j, u[i] == 0x2D { i += 1 }
        func digits() -> Int { var n = 0; while i < j, (0x30...0x39).contains(u[i]) { i += 1; n += 1 }; return n }
        guard digits() > 0 else { return false }
        if i < j, u[i] == 0x2E {
            i += 1
            guard digits() > 0 else { return false }
        }
        return i == j
    }

    /// `domainIcon`: the lucide icon of an entity by domain and device class.
    public static func icon(_ e: HAEntity) -> String {
        let dc = e.attributes["device_class"]?.string
        switch e.domain {
        case "light": return "lightbulb"
        case "switch": return "plug"
        case "fan": return "fan"
        case "climate": return "thermometer"
        case "humidifier": return "droplets"
        case "cover":
            switch dc {
            case "blind", "curtain": return "blinds"
            case "garage": return "warehouse"
            case "gate": return "fence"
            default: return "panel-top"
            }
        case "media_player": return "speaker"
        case "camera": return "camera"
        case "lock": return "lock"
        case "alarm_control_panel": return "shield"
        case "weather": return "cloud-sun"
        case "person": return "user"
        case "sun": return "sun"
        case "input_boolean": return "toggle-left"
        case "script": return "play"
        case "automation": return "zap"
        case "scene": return "sparkles"
        case "binary_sensor":
            switch dc {
            case "door", "opening": return "door-open"
            case "window": return "app-window"
            case "motion": return "activity"
            case "smoke": return "flame"
            case "moisture": return "droplets"
            case "lock": return "lock"
            case "presence": return "user-check"
            case "garage_door": return "warehouse"
            default: return "circle-dot"
            }
        case "sensor":
            switch dc {
            case "temperature": return "thermometer"
            case "humidity": return "droplets"
            case "power", "energy", "current": return "zap"
            case "illuminance": return "sun"
            case "battery": return "battery"
            case "pressure": return "gauge"
            case "timestamp": return "clock"
            case "voltage": return "bolt"
            case "co2", "carbon_dioxide": return "wind"
            case "gas": return "flame"
            default: return "activity"
            }
        default: return "activity"
        }
    }
}

/// JavaScript string conversions the ported rules depend on.
enum JSString {
    static func trim(_ s: String) -> String {
        let u = Array(s.utf16)
        var i = 0, j = u.count
        while i < j, JSText.isSpace(u[i]) { i += 1 }
        while j > i, JSText.isSpace(u[j - 1]) { j -= 1 }
        return String(decoding: u[i..<j], as: UTF16.self)
    }

    static func upper(_ s: String) -> String { s.uppercased() }

    /// `${value}` of a JSON value (template literal).
    static func of(_ v: JSONValue) -> String {
        switch v {
        case .string(let s): return s
        case .bool(let b): return b ? "true" : "false"
        case .number(let n): return jsNumber(n)
        case .null: return "null"
        case .array(let a): return a.map { $0 == .null ? "" : of($0) }.joined(separator: ",")
        case .object: return "[object Object]"
        }
    }

    /// `String(n)` for a finite double (integers without ".0", shortest round-trip otherwise).
    static func jsNumber(_ n: Double) -> String {
        if n == n.rounded(), abs(n) < 1e21 { return String(format: "%.0f", n) == "-0" ? "0" : String(format: "%.0f", n) }
        return "\(n)"
    }
}

/// `new Date(string)` and `Date.prototype.toLocaleString(locale)` for the ISO times Home Assistant sends.
enum JSDate {
    static func parse(_ s: String) -> Date? {
        if let d = ISO8601.parse(s) { return d }
        // date only (`2026-06-15`) is UTC midnight in JavaScript
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: s)
    }

    /// Numeric date and time with seconds, like V8 (ICU skeleton `yMdjms`).
    static func localeString(_ d: Date, locale: String, timeZone: TimeZone) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: locale)
        f.timeZone = timeZone
        f.setLocalizedDateFormatFromTemplate("yMdjms")
        // V8 writes a plain space where ICU puts a narrow no-break space (before AM/PM)
        return f.string(from: d).replacingOccurrences(of: "\u{202F}", with: " ")
    }
}
