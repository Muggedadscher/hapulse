import Foundation

/// The seven UI languages, as `LOCALES` in `packages/core/src/i18n.ts`.
public enum AppLocale: String, CaseIterable, Sendable, Codable {
    case en, de, es, fr, it, pt, sv

    /// Language names for the language selector, each in its own language.
    public var label: String {
        switch self {
        case .en: "English"
        case .de: "Deutsch"
        case .es: "Español"
        case .fr: "Français"
        case .it: "Italiano"
        case .pt: "Português"
        case .sv: "Svenska"
        }
    }
}

/// A value for a `{name}` placeholder.
public enum I18nArg: Sendable, Equatable, ExpressibleByStringLiteral, ExpressibleByIntegerLiteral, ExpressibleByFloatLiteral {
    case text(String)
    case number(Double)

    public init(stringLiteral value: String) { self = .text(value) }
    public init(integerLiteral value: Int) { self = .number(Double(value)) }
    public init(floatLiteral value: Double) { self = .number(value) }
}

public typealias Dict = [String: String]

/// CLDR cardinal plural category, as `Intl.PluralRules(locale).select(n)` returns it for our seven languages
/// (checked by `Fixtures/plural.json`).
public enum PluralCategory: String, Sendable {
    case zero, one, two, few, many, other

    public static func of(_ n: Double, locale: String) -> PluralCategory {
        // Intl.PluralRules looks at the number rounded to 3 fraction digits (1.0000001 → "1" → one)
        let a = (abs(n) * 1000).rounded(.toNearestOrAwayFromZero) / 1000
        let isInt = a == a.rounded(.down)
        let i = a.rounded(.down)
        let lang = String(locale.lowercased().prefix(while: { $0 != "-" && $0 != "_" }))
        // es/fr/it/pt: "many" for whole millions (e = 0 and i != 0 and i % 1000000 = 0 and v = 0)
        let million = isInt && i != 0 && i.truncatingRemainder(dividingBy: 1_000_000) == 0
        switch lang {
        case "fr":
            if i == 0 || i == 1 { return .one }
            return million ? .many : .other
        case "pt":
            if i == 0 || i == 1 { return .one }
            return million ? .many : .other
        case "es":
            if a == 1 { return .one }
            return million ? .many : .other
        case "it":
            if i == 1 && isInt { return .one }
            return million ? .many : .other
        default: // en, de, sv
            return i == 1 && isInt ? .one : .other
        }
    }
}

/// Pure translation logic, port of `translate`, `resolveLanguage` and `withCase` from `@hapulse/core`.
public enum I18n {
    /// Resolve `key` against `dict`, then `fallback`, then the key itself. A numeric `count` selects the plural form
    /// first (`key.one`, then `key.other`, then `key`). An unknown `{name}` stays visible on purpose.
    public static func translate(_ dict: Dict, fallback: Dict, locale: String, key: String, vars: [String: I18nArg]? = nil) -> String {
        var candidates: [String] = []
        if case .number(let count)? = vars?["count"] {
            candidates.append("\(key).\(PluralCategory.of(count, locale: locale).rawValue)")
            candidates.append("\(key).other")
        }
        candidates.append(key)
        for c in candidates {
            if let hit = dict[c] ?? fallback[c] { return interpolate(hit, vars, locale) }
        }
        return key
    }

    static func interpolate(_ template: String, _ vars: [String: I18nArg]?, _ locale: String) -> String {
        guard let vars, template.contains("{") else { return template }
        var out = ""
        var rest = Substring(template)
        while let open = rest.firstIndex(of: "{") {
            out += rest[rest.startIndex..<open]
            let after = rest[rest.index(after: open)...]
            if let close = after.firstIndex(of: "}") {
                let name = after[after.startIndex..<close]
                let isWord = !name.isEmpty && name.unicodeScalars.allSatisfy { $0.isASCII && (CharacterSet.alphanumerics.contains($0) || $0 == "_") }
                if isWord, let v = vars[String(name)] {
                    out += text(v, locale)
                    rest = after[after.index(after: close)...]
                    continue
                }
            }
            out += "{"
            rest = after
        }
        return out + rest
    }

    /// A fractional number gets the language's decimal separator; whole numbers stay as they are (no grouping).
    static func text(_ v: I18nArg, _ locale: String) -> String {
        switch v {
        case .text(let s): return s
        case .number(let n):
            if n == 0 { return "0" }
            if n.isFinite && n == n.rounded() && abs(n) < 1e21 { return String(format: "%.0f", n) }
            return NumberFormat.format(n, locale: locale, maxDecimals: 2)
        }
    }

    /// Language to show: explicit preference, then Home Assistant's language, then the device languages, then English.
    public static func resolveLanguage(pref: String, haLanguage: String?, deviceLanguages: [String],
                                       available: [AppLocale] = AppLocale.allCases) -> AppLocale {
        func supported(_ tag: String?) -> AppLocale? {
            guard let tag, !tag.isEmpty else { return nil }
            let base = String(tag.split(separator: "-", omittingEmptySubsequences: false).first ?? "").lowercased()
            return available.first { $0.rawValue == base }
        }
        if pref != "auto", let explicit = supported(pref) { return explicit }
        if let fromHA = supported(haLanguage) { return fromHA }
        for tag in deviceLanguages { if let l = supported(tag) { return l } }
        return .en
    }

    /// `dict` with the case corrections of `fix` laid over it; keys `dict` lacks are left out.
    public static func withCase(_ dict: Dict, _ fix: Dict) -> Dict {
        var out = dict
        for (k, v) in fix where dict[k] != nil { out[k] = v }
        return out
    }
}

/// The texts of one language, loaded from the copied locale files (with the case corrections), English as fallback.
public struct Localizer: Sendable {
    public let locale: AppLocale
    let dict: Dict
    let fallback: Dict

    public init(locale: AppLocale) {
        self.locale = locale
        let en = Self.load(.en)
        self.fallback = en
        self.dict = locale == .en ? en : Self.load(locale)
    }

    public func t(_ key: String, _ vars: [String: I18nArg]? = nil) -> String {
        I18n.translate(dict, fallback: fallback, locale: locale.rawValue, key: key, vars: vars)
    }

    public func number(_ value: Double, maxDecimals: Int = 1, minDecimals: Int = 0) -> String {
        NumberFormat.format(value, locale: locale.rawValue, maxDecimals: maxDecimals, minDecimals: minDecimals)
    }

    public static func load(_ locale: AppLocale) -> Dict {
        let base = readDict(Resources.url("locales/\(locale.rawValue).json"))
        let fix = readDict(Resources.url("locales/case/\(locale.rawValue).json"))
        return I18n.withCase(base, fix)
    }

    static func readDict(_ url: URL?) -> Dict {
        guard let url, let data = try? Data(contentsOf: url) else { return [:] }
        return (try? JSONDecoder().decode(Dict.self, from: data)) ?? [:]
    }
}

/// Files copied into the package by the generator (`Sources/HAPulseKit/Data`).
public enum Resources {
    /// `path` relative to `Data/`, e.g. `locales/de.json`.
    public static func url(_ path: String) -> URL? {
        let full = "Data/" + path
        let dir = (full as NSString).deletingLastPathComponent
        let file = (full as NSString).lastPathComponent
        let ext = (file as NSString).pathExtension
        let name = (file as NSString).deletingPathExtension
        return Bundle.module.url(forResource: name, withExtension: ext, subdirectory: dir)
    }
}
