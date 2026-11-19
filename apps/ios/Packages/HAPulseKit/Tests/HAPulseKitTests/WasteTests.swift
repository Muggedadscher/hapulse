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
