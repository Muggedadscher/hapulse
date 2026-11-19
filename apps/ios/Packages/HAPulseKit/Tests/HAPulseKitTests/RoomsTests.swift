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
        let rooms = Rooms.build(registries) { states[$0] != nil }
        #expect(rooms.map(\.id) == (golden["rooms"]?.array ?? []).compactMap { $0["id"]?.string })
        for (room, want) in zip(rooms, golden["rooms"]?.array ?? []) {
            #expect(json(room) == want, "room \(room.id)")
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
        let sorted = names.sorted { JSCompare.locale($0, $1) == .orderedAscending }
        #expect(sorted == ["apfel", "Äpfel", "Arbeitszimmer", "Ärger", "bad", "Bad", "Küche", "Zimmer 10", "Zimmer 9"])
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
}
