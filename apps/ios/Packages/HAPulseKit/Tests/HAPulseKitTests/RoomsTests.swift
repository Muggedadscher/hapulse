import Foundation
import Testing
@testable import HAPulseKit

/// `buildRooms` and `roomSummary` against the golden cases of the web code (`Fixtures/rooms.json`).
@Suite struct RoomsTests {
    private static func entity(_ id: String, _ raw: JSONValue) -> HAEntity {
        HAEntity(entityId: id, state: raw["state"]?.string ?? "", attributes: raw["attributes"]?.object ?? [:],
                 context: [:], lastChangedMs: 0, lastUpdatedMs: 0)
    }

    private static func json(_ room: Room) -> JSONValue {
        .object([
            "id": .string(room.id), "name": .string(room.name),
            "icon": room.icon.map(JSONValue.string) ?? .null, "picture": room.picture.map(JSONValue.string) ?? .null,
            "entityIds": .array(room.entityIds.map(JSONValue.string)),
            "domains": .object(room.domains.mapValues { .array($0.map(JSONValue.string)) }),
        ])
    }

    private static func json(_ s: RoomSummary) -> JSONValue {
        var o: [String: JSONValue] = [
            "anyMotion": .bool(s.anyMotion), "lightsOn": .number(Double(s.lightsOn)),
            "lightsTotal": .number(Double(s.lightsTotal)), "mediaPlaying": .bool(s.mediaPlaying),
        ]
        if let t = s.temperature { o["temperature"] = .number(t) }
        if let h = s.humidity { o["humidity"] = .number(h) }
        if let c = s.climateState { o["climateState"] = .string(c) }
        return .object(o)
    }

    private static func check(registries: Registries, states: [String: JSONValue], golden: JSONValue) {
        let rooms = Rooms.build(registries, locale: Locale(identifier: "en")) { states[$0] != nil }
        #expect(rooms.map(\.id) == (golden["rooms"]?.array ?? []).compactMap { $0["id"]?.string })
        for (room, want) in zip(rooms, golden["rooms"]?.array ?? []) {
            #expect(json(room) == want, "room \(room.id)")
            #expect(room.domainOrder == golden["domainOrders"]?[room.id]?.array?.compactMap(\.string), "order \(room.id)")
            let s = Rooms.summary(room) { id in states[id].map { entity(id, $0) } }
            #expect(json(s) == golden["summaries"]?[room.id], "summary \(room.id)")
        }
    }

    @Test func rulesOfBuildRooms() throws {
        let g = try Golden.load("rooms", as: JSONValue.self)
        let c = try #require(g["cases"])
        let r = try #require(c["registries"])
        Self.check(registries: Registries(areas: r["areas"] ?? .null, devices: r["devices"] ?? .null, entities: r["entities"] ?? .null),
              states: c["states"]?.object ?? [:], golden: c)
    }

    @Test func demoHomeLikeTheWeb() throws {
        let g = try Golden.load("rooms", as: JSONValue.self)
        let demo = try DemoHome.load()
        let r = demo.registries
        Self.check(registries: Registries(areas: r["areas"] ?? .null, devices: r["devices"] ?? .null, entities: r["entities"] ?? .null),
              states: demo.entities, golden: try #require(g["demo"]))
    }

    @Test func localeCompareLikeJavaScript() {
        let names = ["Zimmer 9", "bad", "Ärger", "Küche", "Arbeitszimmer", "Zimmer 10", "Bad", "Äpfel", "apfel"]
        let sorted = names.sorted { JSCompare.locale($0, $1, Locale(identifier: "en")) == .orderedAscending }
        #expect(sorted == ["apfel", "Äpfel", "Arbeitszimmer", "Ärger", "bad", "Bad", "Küche", "Zimmer 10", "Zimmer 9"])
    }

    @Test func localeCompareAgainstNode() throws {
        let pairs = try Golden.load("localeCompare", as: JSONValue.self).array ?? []
        #expect(pairs.count > 3000)
        var bad = 0
        for p in pairs {
            let v = p.array ?? []
            let a = v.first?.string ?? "", b = v.dropFirst().first?.string ?? ""
            for (lang, want) in [("en", v.dropFirst(2).first?.number), ("sv", v.dropFirst(3).first?.number)] {
                let got = JSCompare.locale(a, b, Locale(identifier: lang))
                let sign = got == .orderedAscending ? -1 : got == .orderedSame ? 0 : 1
                if Double(sign) != want {
                    bad += 1
                    if bad <= 8 { Issue.record("\(lang): \(a) | \(b): \(sign), JavaScript \(String(describing: want))") }
                }
            }
        }
        #expect(bad == 0)
    }

    @Test func parseFloatAgainstNode() throws {
        let cases = try Golden.load("parseFloat", as: JSONValue.self).array ?? []
        #expect(cases.count > 30)
        for c in cases {
            let v = c.array ?? []
            let input = v.first?.string ?? ""
            let got = JSCompare.parseFloat(input)
            switch v.dropFirst().first {
            case .string("Infinity")?: #expect(got == .infinity, "\(input)")
            case .string("-Infinity")?: #expect(got == -.infinity, "\(input)")
            case .number(let n)?: #expect(got == n, "\(input)")
            default: #expect(got == nil, "\(input)")
            }
            if v.last?.bool == true { #expect(got?.sign == .minus, "\(input) is -0") }
        }
    }

    @Test func parseFloatLikeJavaScript() {
        #expect(JSCompare.parseFloat("21.5") == 21.5)
        #expect(JSCompare.parseFloat("  -3e2x") == -300)
        #expect(JSCompare.parseFloat(".5") == 0.5)
        #expect(JSCompare.parseFloat("5.") == 5)
        #expect(JSCompare.parseFloat("1e") == 1)
        #expect(JSCompare.parseFloat("n/a") == nil)
        #expect(JSCompare.parseFloat("unavailable") == nil)
        #expect(JSCompare.parseFloat("Infinity") == .infinity)
    }

    // MARK: room page sections

    @Test func sectionsLikeTheRoomPage() throws {
        let g = try Golden.load("roomSections", as: JSONValue.self)
        let cases = try #require(g["sections"]?.array)
        #expect(cases.count == 300)
        func strings(_ v: JSONValue?) -> [String]? { v?.array?.compactMap(\.string) }
        for (n, c) in cases.enumerated() {
            let i = try #require(c["input"])
            let entities = i["entities"]?.object ?? [:]
            let input = RoomSections.Input(
                domains: (i["domains"]?.object ?? [:]).mapValues { strings($0) ?? [] },
                domainOrder: strings(i["domainOrder"]) ?? [],
                entity: { id in entities[id].map { Self.entity(id, $0) } },
                hiddenEntities: strings(i["hiddenEntities"]) ?? [], editMode: i["editMode"]?.bool ?? false,
                sentinel: i["sentinel"]?.bool ?? false, cameraIds: strings(i["cameraIds"]) ?? [],
                storedEntityOrder: strings(i["storedEntityOrder"]), storedSectionOrder: strings(i["storedSectionOrder"]),
                heatingPlan: i["heatingPlan"]?.bool ?? false)
            let (sections, snapshot) = RoomSections.build(input)
            let want = c["out"]?["sections"]?.array ?? []
            #expect(sections.map(\.key.rawValue) == want.compactMap { $0["key"]?.string }, "case \(n)")
            for (s, w) in zip(sections, want) {
                #expect(s.ids == strings(w["ids"]), "case \(n) \(s.key)")
                #expect(s.isSensor == (w["isSensor"]?.bool ?? false), "case \(n) \(s.key)")
            }
            let wantSnap = c["out"]?["snapshot"]?.object ?? [:]
            #expect(Set(snapshot.keys.map(\.rawValue)) == Set(wantSnap.keys), "case \(n)")
            for (k, v) in snapshot { #expect(v == strings(wantSnap[k.rawValue]), "case \(n) snapshot \(k)") }
            let comb = try #require(c["combined"])
            #expect(RoomSections.combinedEntityOrder(comb["key"]?.string ?? "", strings(comb["ids"]) ?? [], snapshot)
                    == strings(comb["result"]), "case \(n) combined")
        }
    }

    @Test func roomNameLeftOutLikeTheWeb() throws {
        let g = try Golden.load("roomSections", as: JSONValue.self)
        for c in g["strip"]?.array ?? [] {
            let name = c["name"]?.string ?? "", room = c["room"]?.string ?? ""
            #expect(RoomSections.stripRoomName(name, room) == c["result"]?.string, "\(name) / \(room)")
        }
    }
}
