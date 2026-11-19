import Foundation

/// The settings the app shows, in the web store's shape (`theme`, `mode`, `accentHue`?, `appName`?, `appIcon`?,
/// `appIconHidden`, `language`, `userName`?, `customization`). Filled from Home Assistant:
///  - managed ("Einstellungen für alle"): the admin's `hapulse:global` (system data) plus the user's own
///    `hapulse:user-settings` (user data);
///  - not managed: the user's full snapshot `hapulse:settings` (what the web's settings sync writes).
/// Stage 1 only reads; writing comes with the stages that let the user change something.
public struct SettingsState: Equatable, Sendable {
    public var raw: JSONObject

    public init(raw: JSONObject? = nil) {
        self.raw = raw ?? [
            "theme": "aurora", "mode": "light", "appIconHidden": false, "language": "auto",
            "customization": .object(SettingsRules.hydrate(nil)),
        ]
    }

    public var customization: JSONObject { raw["customization"]?.object ?? [:] }

    // MARK: typed reading (more fields arrive with the pages that need them)

    public var mode: String { raw["mode"]?.string ?? "light" }
    public var accentHue: Double? { raw["accentHue"]?.number }
    public var appName: String? { raw["appName"]?.string }
    public var language: String { raw["language"]?.string ?? "auto" }
    public var userName: String? { raw["userName"]?.string }
    public func strings(_ key: String) -> [String] { customization[key]?.array?.compactMap(\.string) ?? [] }
    public var favorites: [String] { strings("favorites") }
    public var hiddenEntities: [String] { strings("hiddenEntities") }
    public var glassStrength: String { customization["glassStrength"]?.string ?? "clear" }
    public var reduceTransparency: Bool { customization["reduceTransparency"]?.bool ?? false }
    public var sentinelURL: String { customization["scryptedUrl"]?.string ?? "" }
    public var sentinelToken: String { customization["scryptedToken"]?.string ?? "" }

    // MARK: applying documents

    /// The admin's global document (already checked with `isValidGlobalDoc`). `isAdmin` keeps this device's own
    /// tokens when the admin does not share them (only admins may keep their own, like the web).
    public mutating func applyGlobalDoc(_ doc: JSONObject, isAdmin: Bool) {
        let patch = SettingsRules.applyGlobal(current: raw, payload: doc["settings"]?.object ?? [:])
        for k in SettingsRules.globalTopKeys { raw[k] = nil }
        for (k, v) in patch { raw[k] = v }
        let shared = doc["shareSecrets"]?.bool == true ? doc["secrets"] : nil
        let secrets = SettingsRules.sharedSecrets(current: customization, secrets: shared ?? nil, keepOwn: isAdmin)
        var c = customization
        for (k, v) in secrets { c[k] = v }
        raw["customization"] = .object(c)
    }

    /// The user's own document (`hapulse:user-settings`, checked with `isValidUserPayload`).
    public mutating func applyUserDoc(_ doc: JSONObject) {
        let patch = SettingsRules.applyUser(current: raw, payload: doc)
        raw["userName"] = nil
        for (k, v) in patch { raw[k] = v }
    }

    /// A full snapshot (`hapulse:settings`, not managed): port of the web store's `importSettings`.
    public mutating func applySnapshot(_ data: JSONObject) {
        let migrated = SettingsRules.migrateTheme(data["theme"]) ?? (theme: "aurora", mode: "light")
        raw["theme"] = .string(migrated.theme)
        raw["mode"] = SettingsRules.isThemeMode(data["mode"]) ? data["mode"] : .string(migrated.mode)
        raw["accentHue"] = data["accentHue"]
        raw["customization"] = .object(SettingsRules.imported(current: customization, raw: data["customization"]))
        raw["userName"] = data["userName"]
        raw["appName"] = data["appName"]
        raw["appIcon"] = data["appIcon"]
        raw["appIconHidden"] = data["appIconHidden"]?.bool.map(JSONValue.bool) ?? false
        raw["language"] = SettingsRules.parseLanguagePref(data["language"], fallback: "auto")
    }
}
