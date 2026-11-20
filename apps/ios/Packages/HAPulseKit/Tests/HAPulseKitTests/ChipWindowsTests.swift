import Foundation
import Testing
@testable import HAPulseKit

/// The lights and doors windows behind the summary chips (`LightsModal.tsx`, `DoorsModal.tsx`).
@Suite struct ChipWindowsTests {
    static func e(_ id: String, _ state: String, _ attrs: [String: JSONValue] = [:]) -> HAEntity {
        HAEntity(entityId: id, state: state, attributes: attrs, context: [:], lastChangedMs: 0, lastUpdatedMs: 0)
    }

    static func room(_ id: String, lights: [String]) -> Room {
        Room(id: id, name: id.capitalized, icon: nil, picture: nil, entityIds: lights,
             domains: lights.isEmpty ? [:] : ["light": lights], domainOrder: lights.isEmpty ? [] : ["light"])
    }

    @Test func lightsByRoomInTheUsersOrderThenOther() {
        let list = [Self.e("light.a", "on"), Self.e("light.b", "off"), Self.e("light.c", "on"), Self.e("light.z", "off"),
                    Self.e("light.y", "on"), Self.e("switch.s", "on")]
        let entities = Dictionary(uniqueKeysWithValues: list.map { ($0.entityId, $0) })
        let rooms = [Self.room("kitchen", lights: ["light.a", "light.b", "light.gone"]), Self.room("bath", lights: ["light.c"]),
                     Self.room("hall", lights: [])]
        let groups = ChipWindows.lightGroups(entities, rooms: rooms, roomOrder: ["bath", "kitchen"], hidden: ["light.b"])
        #expect(groups.map { $0.room?.id } == ["bath", "kitchen", nil])
        #expect(groups.map(\.ids) == [["light.c"], ["light.a"], ["light.y", "light.z"]])
        #expect(ChipWindows.lightsOn(entities, hidden: ["light.y"]) == ["light.a", "light.c"])
    }

    @Test func brightnessAndName() {
        #expect(ChipWindows.brightnessPercent(Self.e("light.a", "on", ["brightness": .number(128)])) == 50)
        #expect(ChipWindows.brightnessPercent(Self.e("light.a", "on", ["brightness": .number(255)])) == 100)
        #expect(ChipWindows.brightnessPercent(Self.e("light.a", "on")) == nil)
        #expect(ChipWindows.name(Self.e("light.desk_lamp", "on")) == "desk_lamp")
        #expect(ChipWindows.name(Self.e("light.a", "on", ["friendly_name": .string("Desk")])) == "Desk")
    }

    @Test func doorsAndWindowsOpenFirst() {
        func s(_ id: String, _ state: String, _ dc: String) -> HAEntity { Self.e(id, state, ["device_class": .string(dc)]) }
        let list = [s("binary_sensor.d1", "off", "door"), s("binary_sensor.d2", "on", "garage_door"),
                    s("binary_sensor.d3", "off", "opening"), s("binary_sensor.w1", "off", "window"),
                    s("binary_sensor.w2", "on", "window"), s("binary_sensor.m", "on", "motion"),
                    s("binary_sensor.h", "on", "window"), s("sensor.x", "on", "door")]
        let entities = Dictionary(uniqueKeysWithValues: list.map { ($0.entityId, $0) })
        let o = ChipWindows.openings(entities, hidden: ["binary_sensor.h"])
        #expect(o.doors == ["binary_sensor.d2", "binary_sensor.d1", "binary_sensor.d3"])
        #expect(o.windows == ["binary_sensor.w2", "binary_sensor.w1"])
        #expect(ChipWindows.openings([:], hidden: []).isEmpty)
    }
}
