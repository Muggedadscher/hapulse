import Foundation
import Testing
@testable import HAPulseKit

/// Room kind, icon, status icon, temperature and capsules against the web's results (`Fixtures/roomLook.json`).
@Suite struct RoomLookTests {
    let g: JSONValue
    let entities: [String: HAEntity]

    init() throws {
        g = try Golden.load("roomLook", as: JSONValue.self)
        entities = (g["entities"]?.object ?? [:]).reduce(into: [:]) { m, kv in
            m[kv.key] = HAEntity(entityId: kv.key, state: kv.value["state"]?.string ?? "",
                                 attributes: kv.value["attributes"]?.object ?? [:], context: [:], lastChangedMs: 0, lastUpdatedMs: 0)
        }
    }

    private func room(_ v: JSONValue) -> Room {
        let domains = (v["domains"]?.object ?? [:]).mapValues { $0.array?.compactMap(\.string) ?? [] }
        return Room(id: v["id"]?.string ?? "", name: v["name"]?.string ?? "", icon: nil, picture: nil,
                    entityIds: v["entityIds"]?.array?.compactMap(\.string) ?? [], domains: domains,
                    domainOrder: Array(domains.keys))
    }

    private func json(_ r: RoomClimate.Reading?) -> JSONValue {
        guard let r else { return .null }
        return .object(["entityId": .string(r.entityId), "value": .number(r.value), "unit": r.unit.map(JSONValue.string) ?? .null])
    }

    @Test func kindsLikeTheWeb() {
        let cases = g["kinds"]?.array ?? []
        #expect(cases.count > 500)
        for c in cases {
            let name = c["name"]?.string ?? ""
            #expect(RoomLook.kind(name) == c["kind"]?.string, "\(name)")
        }
    }

    @Test func iconsLikeTheWeb() {
        for c in g["icons"]?.array ?? [] {
            let name = c["name"]?.string ?? "", icon = c["icon"]?.string
            #expect(RoomLook.iconName(name: name, icon: icon) == c["result"]?.string, "\(name) \(icon ?? "-")")
        }
    }

    @Test func temperaturesStatusAndCapsules() throws {
        let entity: (String) -> HAEntity? = { entities[$0] }
        let temps = try #require(g["temps"]?.array)
        for t in temps {
            let r = room(try #require(t["room"]))
            #expect(RoomLook.statusIconName(r, entity: entity) == t["status"]?.string, "status \(r.id)")
            let sources = RoomClimate.sources(r, entity: entity).map { s -> JSONValue in
                .object(["entityId": .string(s.entityId), "kind": .string(s.isClimate ? "climate" : "sensor"),
                         "value": s.value.map(JSONValue.number) ?? .null, "unit": s.unit.map(JSONValue.string) ?? .null])
            }
            #expect(JSONValue.array(sources) == t["sources"], "sources \(r.id)")
            let summary = Rooms.summary(r, entity: entity)
            for b in t["bySource"]?.array ?? [] {
                let raw = b["source"]
                let source: JSONValue? = raw?.string == "__undefined__" ? nil : (raw ?? .null)
                let label = "\(r.id) / \(String(describing: raw))"
                #expect(json(RoomClimate.temperature(r, entity: entity, source: source)) == (b["temperature"] ?? .null), "temp \(label)")
                let glances = RoomClimate.glances(r, entity: entity, source: source).map { gl -> JSONValue in
                    var o = json(gl.reading).object ?? [:]
                    o["kind"] = .string(gl.kind.rawValue)
                    return .object(o)
                }
                #expect(JSONValue.array(glances) == b["glances"], "glances \(label)")
                let s = RoomClimate.withTemperature(summary, r, entity: entity, source: source)
                #expect(s.temperature == b["summary"]?["temperature"]?.number, "summary \(label)")
                #expect(s.humidity == b["summary"]?["humidity"]?.number, "summary \(label)")
                #expect(s.climateState == b["summary"]?["climateState"]?.string, "summary \(label)")
            }
        }
    }

    @Test func lightsAndThermostatTones() {
        for c in g["lights"]?.array ?? [] {
            let id = c["id"]?.string ?? ""
            #expect(RoomClimate.lightPercent(entities[id]!).map(Double.init) == c["percent"]?.number, "\(id)")
        }
        for c in g["tones"]?.array ?? [] {
            let id = c["id"]?.string ?? ""
            #expect(RoomClimate.tone(entities[id]!).rawValue == c["tone"]?.string, "\(id)")
        }
    }
}
