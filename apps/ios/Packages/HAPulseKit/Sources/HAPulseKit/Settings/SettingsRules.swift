import Foundation

public typealias JSONObject = [String: JSONValue]

/// The HAPulse settings rules, ported 1:1 from `packages/core/src/settingsModel.ts`, `settingsScope.ts` and
/// `settingsSecrets.ts`. They work on the JSON documents as they are (unknown keys pass, like in the web), so a
/// document the web wrote means the same here and nothing gets lost when the app writes it back. Defaults and scope
/// tables come from `Data/settings.json` (generator); the golden cases in `Fixtures/settings.json` come from the
/// TypeScript functions.
public enum SettingsRules {
    struct Tables: Decodable {
        let customization: JSONObject
        let themes: [String]
        let locales: [String]
        let navOrderV2Head: [String]
        let userKeys: [String]
        let secretKeys: [String]
        let globalTop: [String]
        let userTop: [String]
        let deviceTop: [String]
    }

    static let tables: Tables = {
        guard let url = Resources.url("settings.json"), let data = try? Data(contentsOf: url),
              let t = try? JSONDecoder().decode(Tables.self, from: data) else {
            fatalError("Data/settings.json missing: run the generator (apps/ios/README.md)")
        }
        return t
    }()

    public static var defaultCustomization: JSONObject { tables.customization }
    public static var userCustomizationKeys: [String] { tables.userKeys }
    public static var secretCustomizationKeys: [String] { tables.secretKeys }
    public static var globalTopKeys: [String] { tables.globalTop }
    public static var userTopKeys: [String] { tables.userTop }
    public static var deviceTopKeys: [String] { tables.deviceTop }

    public static func isGlobalCustomizationKey(_ key: String) -> Bool {
        !tables.userKeys.contains(key) && !tables.secretKeys.contains(key)
    }

    // MARK: theme, mode, language

    /// Pre-v0.5 theme names (dusk/dawn/midnight/sage) → theme + mode; current names pass with mode light.
    public static func migrateTheme(_ v: JSONValue?) -> (theme: String, mode: String)? {
        guard let s = v?.string else { return nil }
        if tables.themes.contains(s) { return (s, "light") }
        switch s {
        case "dusk": return ("sunset", "dark")
        case "dawn": return ("sunset", "light")
        case "midnight": return ("ocean", "dark")
        case "sage": return ("forest", "light")
        default: return nil
        }
    }

    public static func isThemeMode(_ v: JSONValue?) -> Bool {
        guard let s = v?.string else { return false }
        return s == "light" || s == "dark" || s == "auto"
    }

    public static func parseLanguagePref(_ v: JSONValue?, fallback: JSONValue) -> JSONValue {
        guard let s = v?.string, s == "auto" || tables.locales.contains(s) else { return fallback }
        return .string(s)
    }

    // MARK: type check

    /// Values whose JSON type does not match the default's are dropped; keys the defaults don't know pass.
    public static func sanitize(_ incoming: JSONValue?, defaults: JSONObject? = nil) -> JSONObject {
        let defaults = defaults ?? tables.customization
        guard case .object(let o)? = incoming else { return [:] }
        var out: JSONObject = [:]
        for (k, v) in o {
            guard let d = defaults[k] else { out[k] = v; continue }
            switch (d, v) {
            case (.null, .null), (.null, .string), (.null, .number), (.null, .bool): out[k] = v
            case (.array, .array), (.object, .object), (.string, .string), (.number, .number), (.bool, .bool): out[k] = v
            default: break
            }
        }
        return out
    }

    // MARK: one-time migrations

    private static func marker(_ c: JSONObject, _ key: String) -> Bool { c[key]?.bool == true }

    private static func addChip(_ c: JSONObject, _ chip: String, marker key: String) -> JSONObject {
        if marker(c, key) { return c }
        var out = c
        // an empty list means "all chips": appending would leave only this one
        if case .array(let chips)? = c["homeChips"], !chips.isEmpty, !chips.contains(.string(chip)) {
            out["homeChips"] = .array(chips + [.string(chip)])
        }
        out[key] = true
        return out
    }

    private static func insertSection(_ c: JSONObject, _ id: String, after anchors: [String], marker key: String) -> JSONObject {
        if marker(c, key) { return c }
        var out = c
        if case .array(var order)? = c["homeSectionOrder"], !order.isEmpty, !order.contains(.string(id)) {
            let anchor = anchors.map { a in order.firstIndex(of: .string(a)) ?? -1 }.max() ?? -1
            let at = anchor >= 0 ? anchor + 1 : order.count
            order.insert(.string(id), at: at)
            out["homeSectionOrder"] = .array(order)
        }
        out[key] = true
        return out
    }

    static func migrateHintsSection(_ c: JSONObject) -> JSONObject {
        if marker(c, "hintsSectionMigrated") { return c }
        var out = c
        if case .array(let order)? = c["homeSectionOrder"], !order.isEmpty, !order.contains("hints") {
            out["homeSectionOrder"] = .array(["hints"] + order)
        }
        out["hintsSectionMigrated"] = true
        return out
    }

    static func migrateNavOrderV2(_ c: JSONObject) -> JSONObject {
        if marker(c, "navOrderV2Migrated") { return c }
        var out = c
        if case .array(let nav)? = c["navOrder"], !nav.isEmpty {
            let head = tables.navOrderV2Head.map(JSONValue.string)
            out["navOrder"] = .array(head + nav.filter { !head.contains($0) })
        }
        out["navOrderV2Migrated"] = true
        return out
    }

    /// All one-time migrations in their fixed order (`migrateCustomization`).
    public static func migrate(_ c: JSONObject, urlToken: Bool) -> JSONObject {
        var x = addChip(c, "pool", marker: "poolChipMigrated")
        x = addChip(x, "garage", marker: "garageChipMigrated")
        x = addChip(x, "locks", marker: "locksChipMigrated")
        x = insertSection(x, "waste", after: ["security"], marker: "wasteSectionMigrated")
        x = insertSection(x, "nvr", after: ["waste", "security"], marker: "nvrSectionMigrated")
        x = migrateHintsSection(x)
        if urlToken { x = SettingsSecrets.migrateUrlToken(x) }
        return migrateNavOrderV2(x)
    }

    // MARK: apply steps

    private static func merged(_ a: JSONObject, _ b: JSONObject) -> JSONObject { a.merging(b) { _, new in new } }

    /// Customization after loading a persisted state.
    public static func hydrate(_ persisted: JSONValue?) -> JSONObject {
        migrate(merged(tables.customization, persisted?.object ?? [:]), urlToken: true)
    }

    /// Customization after importing a snapshot (manual import or the Home Assistant settings sync).
    public static func imported(current cur: JSONObject, raw: JSONValue?) -> JSONObject {
        let incoming = sanitize(raw)
        var entityOrder: JSONObject = [:]
        if case .object(let eo)? = incoming["entityOrder"] {
            for (k, v) in eo {
                if case .array(let a) = v, a.allSatisfy({ $0.string != nil }) { entityOrder[k] = v }
            }
        }
        var favorites: JSONValue = .array([])
        if case .array(let f)? = incoming["favorites"], f.allSatisfy({ $0.string != nil }) { favorites = .array(f) }
        let secrets = SettingsSecrets.keepDeviceSecrets(current: cur, incoming: incoming)
        var c = merged(tables.customization, incoming)
        c["scryptedToken"] = .string(secrets.scryptedToken)
        c["maToken"] = secrets.maToken.map(JSONValue.string) ?? .null
        c["entityOrder"] = .object(entityOrder)
        c["favorites"] = favorites
        return migrate(c, urlToken: true)
    }

    /// State after applying the admin's global document (`hapulse:global` → `settings`). Returns the changed fields
    /// (`theme`, `mode`, `accentHue`?, `appName`?, `appIcon`?, `appIconHidden`, `customization`); a missing optional
    /// key means "unset".
    public static func applyGlobal(current cur: JSONObject, payload: JSONObject) -> JSONObject {
        var picked: JSONObject = [:]
        for (k, v) in payload["customization"]?.object ?? [:] where isGlobalCustomizationKey(k) { picked[k] = v }
        var incoming = sanitize(.object(picked))
        func fill(_ k: String, _ v: JSONValue) { if incoming[k] == nil || incoming[k] == .null { incoming[k] = v } }
        if incoming["homeChips"] != nil {
            fill("poolChipMigrated", false)
            fill("garageChipMigrated", false)
            fill("locksChipMigrated", false)
        }
        if incoming["homeSectionOrder"] != nil { fill("hintsSectionMigrated", false) }
        for k in ["uiStyle", "glassStrength", "reduceTransparency"] { fill(k, tables.customization[k] ?? .null) }
        var out: JSONObject = [:]
        out["theme"] = migrateTheme(payload["theme"]).map { .string($0.theme) } ?? cur["theme"]
        out["mode"] = isThemeMode(payload["mode"]) ? payload["mode"] : cur["mode"]
        if case .number? = payload["accentHue"] { out["accentHue"] = payload["accentHue"] }
        if case .string? = payload["appName"] { out["appName"] = payload["appName"] }
        if case .string? = payload["appIcon"] { out["appIcon"] = payload["appIcon"] }
        out["appIconHidden"] = payload["appIconHidden"]?.bool.map(JSONValue.bool) ?? false
        out["customization"] = .object(migrate(merged(cur["customization"]?.object ?? [:], incoming), urlToken: false))
        return out
    }

    /// State after applying the user's own document (`hapulse:user-settings`): `language`, `userName`?,
    /// `customization`.
    public static func applyUser(current cur: JSONObject, payload: JSONObject) -> JSONObject {
        var picked: JSONObject = [:]
        for k in tables.userKeys { if let v = payload[k] { picked[k] = v } }
        var incoming = sanitize(.object(picked))
        let curC = cur["customization"]?.object ?? [:]
        let validFavorites = incoming["favorites"]?.array?.allSatisfy { $0.string != nil } ?? false
        if !validFavorites { incoming["favorites"] = curC["favorites"] ?? .array([]) }
        var out: JSONObject = ["language": parseLanguagePref(payload["language"], fallback: cur["language"] ?? "auto")]
        switch payload["userName"] {
        case .string?: out["userName"] = payload["userName"]
        case .null?: break
        default: if let n = cur["userName"] { out["userName"] = n }
        }
        out["customization"] = .object(merged(curC, incoming))
        return out
    }

    /// Tokens after the global document was read: shared ones when the admin shares them, else this device's own
    /// (`keepOwn`) or none.
    public static func sharedSecrets(current cur: JSONObject, secrets: JSONValue?, keepOwn: Bool) -> JSONObject {
        if case .object(let s)? = secrets {
            return ["scryptedToken": .string(s["scryptedToken"]?.string ?? ""), "maToken": s["maToken"]?.string.map(JSONValue.string) ?? .null]
        }
        return keepOwn
            ? ["scryptedToken": cur["scryptedToken"] ?? "", "maToken": cur["maToken"] ?? .null]
            : ["scryptedToken": "", "maToken": .null]
    }

    // MARK: scope

    public static func extractGlobal(_ s: JSONObject) -> JSONObject {
        let c = (s["customization"]?.object ?? [:]).filter { isGlobalCustomizationKey($0.key) }
        return [
            "theme": s["theme"] ?? .null, "mode": s["mode"] ?? .null,
            "accentHue": s["accentHue"] ?? .null, "appName": s["appName"] ?? .null, "appIcon": s["appIcon"] ?? .null,
            "appIconHidden": s["appIconHidden"] ?? .null, "customization": .object(c),
        ]
    }

    public static func extractUser(_ s: JSONObject) -> JSONObject {
        let c = s["customization"]?.object ?? [:]
        return [
            "v": 1, "language": s["language"] ?? .null, "userName": s["userName"] ?? .null,
            "favorites": c["favorites"] ?? .null, "libraryPlayerId": c["libraryPlayerId"] ?? .null,
            "detailHistoryRange": c["detailHistoryRange"] ?? .null, "editingEnabled": c["editingEnabled"] ?? .null,
        ]
    }

    public static func extractSecrets(_ s: JSONObject) -> JSONObject {
        let c = s["customization"]?.object ?? [:]
        return ["scryptedToken": c["scryptedToken"] ?? .null, "maToken": c["maToken"] ?? .null]
    }

    /// What changed from `base` to `cur` (top keys and customization keys). Empty = nothing.
    public static func diffGlobal(_ base: JSONObject, _ cur: JSONObject) -> JSONObject {
        var out: JSONObject = [:]
        for k in tables.globalTop where base[k] != cur[k] { out[k] = cur[k] ?? .null }
        let b = base["customization"]?.object ?? [:], c = cur["customization"]?.object ?? [:]
        var changed: JSONObject = [:]
        var anyChange = false
        for k in Set(b.keys).union(c.keys) where b[k] != c[k] {
            anyChange = true
            if let v = c[k] { changed[k] = v } // a removed key counts as a change but has no value (JSON has no undefined)
        }
        if anyChange { out["customization"] = .object(changed) }
        return out
    }

    public static func mergeGlobal(_ onto: JSONObject, _ changes: JSONObject) -> JSONObject {
        var out = merged(onto, changes.filter { $0.key != "customization" })
        out["customization"] = .object(merged(onto["customization"]?.object ?? [:], changes["customization"]?.object ?? [:]))
        return out
    }

    public static func isValidGlobalDoc(_ v: JSONValue?) -> Bool {
        guard case .object(let o)? = v, o["v"] == 1 else { return false }
        func isRef(_ r: JSONValue?) -> Bool { r?["id"]?.string != nil && r?["name"]?.string != nil && r?.object != nil }
        guard o["rev"]?.number != nil, isRef(o["activatedBy"]), isRef(o["updatedBy"]) else { return false }
        guard o["activatedAt"]?.string != nil, o["updatedAt"]?.string != nil else { return false }
        guard let s = o["settings"]?.object, s["theme"]?.string != nil, s["mode"]?.string != nil, s["customization"]?.object != nil else { return false }
        guard let d = o["userDefaults"]?.object, d["favorites"]?.array != nil, d["language"]?.string != nil else { return false }
        guard o["shareSecrets"]?.bool != nil else { return false }
        if let sec = o["secrets"], sec.object == nil { return false }
        return true
    }

    public static func isValidUserPayload(_ v: JSONValue?) -> Bool {
        guard case .object(let o)? = v else { return false }
        return o["v"] == 1 && o["favorites"]?.array != nil && o["language"]?.string != nil
    }
}

/// Device-local connection secrets (Sentinel, Music Assistant): port of `settingsSecrets.ts`.
public enum SettingsSecrets {
    /// Origin of a user-entered server address (scheme optional); nil if unusable.
    public static func originOf(_ input: String?) -> String? {
        let raw = (input ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if raw.isEmpty { return nil }
        let full = raw.range(of: "^https?://", options: [.regularExpression, .caseInsensitive]) != nil ? raw : "https://\(raw)"
        guard let c = URLComponents(string: full), let scheme = c.scheme?.lowercased(), let host = c.host, !host.isEmpty else { return nil }
        let defaultPort = scheme == "https" ? 443 : scheme == "http" ? 80 : nil
        let port = c.port.flatMap { $0 == defaultPort ? nil : $0 }
        return "\(scheme)://\(host.lowercased())\(port.map { ":\($0)" } ?? "")"
    }

    /// The address without a `token` query parameter, plus that token (if any).
    public static func splitUrlToken(_ input: String) -> (url: String, token: String?) {
        guard let r = input.range(of: "[?&]token=([^&#]*)", options: .regularExpression) else { return (input, nil) }
        let rawValue = String(input[r].drop { $0 != "=" }.dropFirst())
        let decoded = (rawValue.removingPercentEncoding ?? rawValue).trimmingCharacters(in: .whitespacesAndNewlines)
        let token = decoded.isEmpty ? nil : decoded
        var url = input
        if let m = try? NSRegularExpression(pattern: "([?&])token=[^&#]*&?"),
           let hit = m.firstMatch(in: url, range: NSRange(url.startIndex..., in: url)),
           let whole = Range(hit.range, in: url), let sep = Range(hit.range(at: 1), in: url) {
            url.replaceSubrange(whole, with: String(url[sep]))
        }
        if let m = try? NSRegularExpression(pattern: "[?&](#|$)"),
           let hit = m.firstMatch(in: url, range: NSRange(url.startIndex..., in: url)),
           let whole = Range(hit.range, in: url), let keep = Range(hit.range(at: 1), in: url) {
            url.replaceSubrange(whole, with: String(url[keep]))
        }
        return (url, token)
    }

    /// Moves a token found in the Sentinel URL into the token field (unless one is set) and cleans the URL.
    public static func migrateUrlToken(_ c: JSONObject) -> JSONObject {
        guard let u = c["scryptedUrl"]?.string else { return c }
        let (url, token) = splitUrlToken(u)
        guard let token else { return c }
        var out = c
        out["scryptedUrl"] = .string(url)
        if (c["scryptedToken"]?.string ?? "").isEmpty { out["scryptedToken"] = .string(token) }
        return out
    }

    /// Tokens after applying an incoming snapshot: an explicit token wins; otherwise this device's token stays only
    /// while the server's origin is the same.
    public static func keepDeviceSecrets(current cur: JSONObject, incoming: JSONObject) -> (scryptedToken: String, maToken: String?) {
        let inUrl: (url: String, token: String?) = incoming["scryptedUrl"]?.string.map(splitUrlToken) ?? ("", nil)
        let explicitNvr = incoming["scryptedToken"]?.string.flatMap { $0.isEmpty ? nil : $0 } ?? inUrl.token
        let nvrOrigin = originOf(inUrl.url)
        let scryptedToken = explicitNvr
            ?? (nvrOrigin != nil && nvrOrigin == originOf(cur["scryptedUrl"]?.string) ? cur["scryptedToken"]?.string ?? "" : "")
        let explicitMa = incoming["maToken"]?.string.flatMap { $0.isEmpty ? nil : $0 }
        let maOrigin = originOf(incoming["maServerUrl"]?.string)
        let maToken = explicitMa
            ?? (maOrigin != nil && maOrigin == originOf(cur["maServerUrl"]?.string) ? cur["maToken"]?.string : nil)
        return (scryptedToken, maToken)
    }
}
