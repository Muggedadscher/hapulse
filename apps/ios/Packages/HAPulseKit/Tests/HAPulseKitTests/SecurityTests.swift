import Foundation
import Testing
@testable import HAPulseKit

/// Garages, locks, alarm panels, summary chips, home hints and active scenes against the web
/// (`Fixtures/security.json`).
@Suite struct SecurityTests {
    let g: JSONValue
    let now: Date

    init() throws {
        g = try Golden.load("security", as: JSONValue.self)
        now = try #require(ISO8601.parse(g["now"]?.string ?? ""))
    }

    static func ms(_ v: JSONValue?) -> Int64 {
        ISO8601.parse(v?.string ?? "").map { Int64(($0.timeIntervalSince1970 * 1000).rounded()) } ?? 0
    }

    static func entity(_ v: JSONValue) -> HAEntity {
        HAEntity(entityId: v["entity_id"]?.string ?? "", state: v["state"]?.string ?? "", attributes: v["attributes"]?.object ?? [:],
                 context: [:], lastChangedMs: ms(v["last_changed"]), lastUpdatedMs: ms(v["last_updated"]))
    }

    static func ids(_ v: JSONValue?) -> [String] { (v?.array ?? []).compactMap(\.string) }

    static func garageSummary(_ v: JSONValue?) -> Garage.Summary {
        Garage.Summary(total: Int(v?["total"]?.number ?? -1), closed: Int(v?["closed"]?.number ?? -1), open: Int(v?["open"]?.number ?? -1),
                       unavailable: Int(v?["unavailable"]?.number ?? -1), allClosed: v?["allClosed"]?.bool ?? false)
    }

    static func lockSummary(_ v: JSONValue?) -> Locks.Summary {
        Locks.Summary(total: Int(v?["total"]?.number ?? -1), locked: Int(v?["locked"]?.number ?? -1), open: Int(v?["open"]?.number ?? -1),
                      problem: Int(v?["problem"]?.number ?? -1))
    }

    @Test func garagesLikeTheWeb() throws {
        let cases = try #require(g["garages"]?.array)
        #expect(cases.count > 200)
        for c in cases {
            let e = Self.entity(try #require(c["entity"]))
            let what = "\(e.state) \(e.attributes)"
            #expect(Garage.isGarageDoor(e) == c["isGarageDoor"]?.bool, "\(what)")
            #expect(Garage.status(e.state).rawValue == c["status"]?.string, "\(what)")
            #expect(Garage.isOpen(e.state) == c["isOpen"]?.bool, "\(what)")
            #expect(Garage.canAct(e, .open) == c["canOpen"]?.bool, "open \(what)")
            #expect(Garage.canAct(e, .close) == c["canClose"]?.bool, "close \(what)")
            #expect(Garage.canStop(e) == c["canStop"]?.bool, "stop \(what)")
            #expect(Garage.mdiIcon(e) == c["icon"]?.string, "icon \(what)")
        }
    }

    @Test func locksDoorsAndAlarmPanels() throws {
        let sets = try #require(g["sets"]?.array)
        for s in sets {
            let locks = (s["locks"]?.array ?? []).map(Self.entity)
            let doors = (s["doors"]?.array ?? []).map(Self.entity)
            let alarms = (s["alarms"]?.array ?? []).map(Self.entity)
            let ls = Locks.summary(locks)
            #expect(ls == Self.lockSummary(s["lockSummary"]))
            #expect(Locks.tone(ls).rawValue == s["lockTone"]?.string)
            #expect(Garage.summary(doors) == Self.garageSummary(s["garageSummary"]))
            #expect(Alarm.sortPanels(alarms).map(\.entityId) == Self.ids(s["alarmOrder"]))
            #expect(Garage.targets(doors, .open).map(\.entityId) == Self.ids(s["openTargets"]))
            #expect(Garage.targets(doors, .close).map(\.entityId) == Self.ids(s["closeTargets"]))
        }
    }

    @Test func chipsAndHintsOfWholeHomes() throws {
        let homes = try #require(g["homes"]?.array)
        #expect(homes.count == 200)
        var hintsSeen = Set<String>()
        for (i, h) in homes.enumerated() {
            let list = (h["entities"]?.array ?? []).map(Self.entity)
            let map = Dictionary(uniqueKeysWithValues: list.map { ($0.entityId, $0) })
            let c = ChipCounts.count(map, poolPump: "switch.pool_pump", poolRequired: ["switch.pool_pump", "sensor.pool_temp"])
            let w = try #require(h["chips"])
            #expect(c.peopleHome.map(\.entityId) == Self.ids(w["peopleHome"]), "home \(i)")
            #expect(c.lightsOn == Int(w["lightsOn"]?.number ?? -1), "home \(i)")
            #expect(c.openDoorWindow == Int(w["openDoorWindow"]?.number ?? -1), "home \(i)")
            #expect(c.alarm?.entityId == w["alarm"]?.string, "home \(i)")
            #expect(c.mediaPlaying == Int(w["mediaPlaying"]?.number ?? -1), "home \(i)")
            #expect(c.poolPresent == w["pool"]?["present"]?.bool, "home \(i)")
            #expect(c.poolRunning == w["pool"]?["running"]?.bool, "home \(i)")
            #expect(c.garages == Self.garageSummary(w["garages"]), "home \(i)")
            #expect(c.locks == Self.lockSummary(w["locks"]), "home \(i)")

            let waste = (h["waste"]?.array ?? []).map {
                Waste.Bin(entityId: $0["entityId"]?.string ?? "", name: "", daysTo: $0["daysTo"]?.number, upcoming: [])
            }
            let missing = (h["heatingMissing"]?.array ?? []).map {
                Hints.MissingPlan(areaId: $0["areaId"]?.string ?? "", name: $0["name"]?.string ?? "", thermostats: Self.ids($0["thermostats"]))
            }
            let r = Hints.collect(list, now: now, hidden: Set(Self.ids(h["hidden"])), doorOpenMinutes: h["doorOpenMinutes"]?.number.map { Int($0) },
                                  waste: waste, camerasNotRecording: Int(h["camerasNotRecording"]?.number ?? 0), heatingMissing: missing,
                                  locale: Locale(identifier: "en"))
            let want = h["hints"]?.array ?? []
            #expect(r.hints.map(\.id) == want.compactMap { $0["id"]?.string }, "home \(i)")
            for (got, w) in zip(r.hints, want) {
                hintsSeen.insert(got.kind.rawValue)
                #expect(got.kind.rawValue == w["kind"]?.string)
                #expect(String(describing: got.severity) == w["severity"]?.string)
                #expect(got.count == Int(w["count"]?.number ?? -1), "home \(i) \(got.id)")
                #expect(got.entityIds == Self.ids(w["entityIds"]), "home \(i) \(got.id)")
                #expect(got.room?.areaId == w["room"]?["areaId"]?.string)
                #expect(got.room?.name == w["room"]?["name"]?.string)
            }
            #expect(r.recheckAt.map { Int64(($0.timeIntervalSince1970 * 1000).rounded()) } == h["recheckAt"]?.string.map { Self.ms(.string($0)) },
                    "home \(i)")
        }
        // the random homes reach every kind of hint
        #expect(hintsSeen == Set(Hints.Kind.allCases.map(\.rawValue)))
    }

    @Test func activeScenesLikeTheWeb() throws {
        let cases = try #require(g["scenes"]?.array)
        var activeSeen = 0
        for (i, c) in cases.enumerated() {
            let scenes = (c["scenes"]?.array ?? []).map(Self.entity)
            let states = (c["states"]?.object ?? [:]).mapValues(Self.entity)
            let got = ActiveScenes.ids(scenes, states: { states[$0] }, now: now)
            let want = Set(Self.ids(c["active"]))
            activeSeen += want.count
            #expect(got == want, "case \(i)")
        }
        #expect(activeSeen > 10)
    }
}
