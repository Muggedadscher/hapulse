import Foundation
import Testing
@testable import HAPulseKit

struct NumberCase: Decodable {
    struct Opts: Decodable { let maxDecimals: Int?; let minDecimals: Int? }
    let locale: String
    let value: Double
    let opts: Opts
    let out: String
}

struct PluralCase: Decodable { let locale: String; let value: Double; let category: String }

struct TranslateCase: Decodable {
    let locale: String
    let key: String
    let vars: [String: Double]?
    let out: String
}

struct LanguageCase: Decodable { let pref: String; let ha: String?; let nav: [String]; let out: String }

@Suite struct TextTests {
    @Test func numberFormatMatchesWeb() throws {
        let cases: [NumberCase] = try Golden.load("numberFormat")
        #expect(cases.count > 1000)
        var failures: [String] = []
        for c in cases {
            let got = NumberFormat.format(c.value, locale: c.locale, maxDecimals: c.opts.maxDecimals ?? 1, minDecimals: c.opts.minDecimals ?? 0)
            if got != c.out { failures.append("\(c.locale) \(c.value) \(c.opts): \(got.debugDescription) != \(c.out.debugDescription)") }
        }
        #expect(failures.isEmpty, "\(failures.count) differences, e.g. \(failures.prefix(8))")
    }

    @Test func pluralCategoriesMatchWeb() throws {
        let cases: [PluralCase] = try Golden.load("plural")
        for c in cases {
            #expect(PluralCategory.of(c.value, locale: c.locale).rawValue == c.category, "\(c.locale) \(c.value)")
        }
    }

    @Test func translateMatchesWeb() throws {
        let cases: [TranslateCase] = try Golden.load("translate")
        #expect(cases.count > 500)
        var loc: [AppLocale: Localizer] = [:]
        var failures: [String] = []
        for c in cases {
            let l = AppLocale(rawValue: c.locale)!
            let localizer = loc[l] ?? Localizer(locale: l)
            loc[l] = localizer
            let got = localizer.t(c.key, c.vars?.mapValues { I18nArg.number($0) })
            if got != c.out { failures.append("\(c.locale) \(c.key) \(c.vars ?? [:]): \(got) != \(c.out)") }
        }
        #expect(failures.isEmpty, "\(failures.count) differences, e.g. \(failures.prefix(8))")
    }

    @Test func languageChoiceMatchesWeb() throws {
        let cases: [LanguageCase] = try Golden.load("resolveLanguage")
        for c in cases {
            #expect(I18n.resolveLanguage(pref: c.pref, haLanguage: c.ha, deviceLanguages: c.nav).rawValue == c.out,
                    "\(c.pref) \(c.ha ?? "nil") \(c.nav)")
        }
    }

    @Test func unknownPlaceholderStaysVisible() {
        #expect(I18n.translate(["k": "Hallo {name}, {x}"], fallback: [:], locale: "de", key: "k", vars: ["name": "Jan"]) == "Hallo Jan, {x}")
        #expect(I18n.translate([:], fallback: [:], locale: "de", key: "fehlt") == "fehlt")
    }

    @Test func everyLocaleLoads() {
        for l in AppLocale.allCases {
            #expect(Localizer.load(l).count > 1000, "\(l)")
        }
    }
}
