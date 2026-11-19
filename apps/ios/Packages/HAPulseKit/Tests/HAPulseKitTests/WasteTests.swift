import Foundation
import Testing
@testable import HAPulseKit

/// Waste bins against the web (`Fixtures/waste.json`, made in UTC).
@Suite struct WasteTests {
    let g: JSONValue

    init() throws { g = try Golden.load("waste", as: JSONValue.self) }

    @Test func helpersLikeJavaScript() throws {
        for p in g["typeNames"]?.array ?? [] {
            let v = p.array ?? []
            #expect(Waste.typeName(v[0].string ?? "") == v[1].string, "\(v[0])")
        }
        for p in g["dates"]?.array ?? [] {
            let v = p.array ?? []
            #expect(Waste.parseDate(v[0]) == v[1].string, "\(v[0])")
        }
        for p in g["numbers"]?.array ?? [] {
            let v = p.array ?? []
            let got = JSNumber.parse(v[0].string ?? "")
            switch v[1] {
            case .number(let n): #expect(got == n, "\(v[0])")
            case .string("Infinity"): #expect(got == .infinity, "\(v[0])")
            case .string("-Infinity"): #expect(got == -.infinity, "\(v[0])")
            default: #expect(got == nil, "\(v[0])")
            }
        }
    }

    /// Days to the pickup across the changes of summer time in Berlin (values from Node with TZ=Europe/Berlin).
    @Test func daysAcrossSummerTime() throws {
        let berlin = try #require(TimeZone(identifier: "Europe/Berlin"))
        let cases: [(String, String, Double)] = [
            ("2026-10-25T10:00:00Z", "2026-10-26", 1), ("2026-10-24T22:30:00Z", "2026-10-25", 0),
            ("2026-10-24T22:30:00Z", "2026-10-27", 2), ("2026-03-29T10:00:00Z", "2026-03-30", 1),
            ("2026-03-28T23:30:00Z", "2026-03-29", 0), ("2026-03-28T22:59:00Z", "2026-03-29", 1),
            ("2026-03-28T10:00:00Z", "2026-04-02", 5),
        ]
        for (now, date, days) in cases {
            let e = HAEntity(entityId: "sensor.w", state: "x", attributes: ["upcoming": [["date": .string(date)]]],
                             context: [:], lastChangedMs: 0, lastUpdatedMs: 0)
            let bins = Waste.bins([e], now: try #require(ISO8601.parse(now)), timeZone: berlin)
            #expect(bins.first?.daysTo == days, "\(now) \(date)")
        }
    }

    @Test func binsLikeTheWeb() throws {
        let utc = try #require(TimeZone(identifier: "UTC"))
        let now = try #require(ISO8601.parse(g["now"]?.string ?? ""))
        let homes = try #require(g["homes"]?.array)
        var total = 0
        for (i, h) in homes.enumerated() {
            let list = (h["entities"]?.array ?? []).map(SecurityTests.entity)
            let hidden = Set(SecurityTests.ids(h["hidden"]))
            let got = Waste.bins(list, hidden: hidden, now: h["withNow"]?.bool == true ? now : nil, timeZone: utc, locale: Locale(identifier: "en"))
            let want = h["bins"]?.array ?? []
            total += want.count
            #expect(got.map(\.entityId) == want.compactMap { $0["entityId"]?.string }, "home \(i)")
            for (b, w) in zip(got, want) {
                #expect(b.name == w["name"]?.string, "home \(i) \(b.entityId)")
                #expect(b.icon == w["icon"]?.string, "home \(i) \(b.entityId)")
                #expect(b.daysTo == w["daysTo"]?.number, "home \(i) \(b.entityId) daysTo")
                #expect(b.nextDate == w["nextDate"]?.string, "home \(i) \(b.entityId)")
                let up = (w["upcoming"]?.array ?? []).map { Waste.Collection(date: $0["date"]?.string ?? "", type: $0["type"]?.string) }
                #expect(b.upcoming == up, "home \(i) \(b.entityId) upcoming")
            }
        }
        #expect(total > 100)
    }
}
