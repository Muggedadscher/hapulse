import Foundation
import Testing
@testable import HAPulseKit

/// State texts, icons and favourite rules against the web (`Fixtures/entityDisplay.json`, made in UTC).
@Suite struct EntityDisplayTests {
    let g: JSONValue
    let entities: [HAEntity]
    let res: EntityDisplay.StateTranslations

    init() throws {
        g = try Golden.load("entityDisplay", as: JSONValue.self)
        entities = (g["entities"]?.array ?? []).map { v in
            HAEntity(entityId: v["entity_id"]?.string ?? "", state: v["state"]?.string ?? "",
                     attributes: v["attributes"]?.object ?? [:], context: [:], lastChangedMs: 0, lastUpdatedMs: 0)
        }
        res = (g["res"]?.object ?? [:]).compactMapValues(\.string)
    }

    @Test func stateTextsInAllLanguages() throws {
        #expect(entities.count > 1000)
        let utc = try #require(TimeZone(identifier: "UTC"))
        for locale in AppLocale.allCases {
            let l = Localizer(locale: locale)
            let label: EntityDisplay.Label = { d, s, dc in EntityDisplay.label(l, res, domain: d, state: s, deviceClass: dc) }
            let want = try #require(g["formatted"]?[locale.rawValue]?.array)
            var bad = 0
            for (e, w) in zip(entities, want) {
                // V8's legacy date parser reads nearly anything ("-3.5" is 5 March 2001); Home Assistant sends ISO
                // times for timestamp sensors, and the app reads only those
                if e.attributes["device_class"]?.string == "timestamp", !Self.looksISO(e.state),
                   !["unavailable", "unknown"].contains(e.state) { continue }
                let withLabel = EntityDisplay.formatState(e, locale: locale.rawValue, label: label, timeZone: utc)
                let raw = EntityDisplay.formatState(e, locale: locale.rawValue, timeZone: utc)
                if withLabel != w.array?[0].string || raw != w.array?[1].string {
                    bad += 1
                    if bad <= 5 {
                        Issue.record("\(locale) \(e.entityId) \(e.state) \(e.attributes): \(withLabel) | \(raw) ≠ \(w)")
                    }
                }
            }
            #expect(bad == 0, "\(locale): \(bad) differences")
        }
    }

    static func looksISO(_ s: String) -> Bool { s.range(of: #"^\d{4}-\d{2}-\d{2}"#, options: .regularExpression) != nil }

    @Test func iconsAndFavourites() {
        for (e, m) in zip(entities, g["meta"]?.array ?? []) {
            #expect(EntityDisplay.icon(e) == m["icon"]?.string, "\(e.entityId)")
            #expect(EntityDisplay.isFavoriteRelevant(e) == m["favorite"]?.bool, "\(e.entityId) \(e.state)")
        }
    }

    @Test func humanizeAndAttributeWords() {
        for c in g["humanize"]?.array ?? [] {
            #expect(EntityDisplay.humanize(c.array?[0].string ?? "") == c.array?[1].string)
        }
        for c in g["attr"]?.array ?? [] {
            let a = c.array ?? []
            #expect(EntityDisplay.lookup(res, domain: a[0].string ?? "", state: a[1].string ?? "", attribute: a[2].string)
                    == a[3].string)
        }
    }
}
