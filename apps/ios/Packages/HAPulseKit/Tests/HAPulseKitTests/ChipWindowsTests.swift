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

/// The locks window and the lock rules (`LocksModal.tsx`, `lockLogic.ts`).
@Suite struct LocksWindowTests {
    static func lock(_ id: String, _ state: String, name: String? = nil, code: String? = nil) -> HAEntity {
        var a: [String: JSONValue] = [:]
        if let name { a["friendly_name"] = .string(name) }
        if let code { a["code_format"] = .string(code) }
        return ChipWindowsTests.e(id, state, a)
    }

    @Test func notLockedFirstThenByName() {
        let list = [Self.lock("lock.a", "locked", name: "Zaun"), Self.lock("lock.b", "unlocked", name: "Tür"),
                    Self.lock("lock.c", "locked", name: "Äußere"), Self.lock("lock.d", "jammed", name: "Garten"),
                    Self.lock("lock.e", "locked", name: "Hidden"), Self.lock("switch.x", "on")]
        let entities = Dictionary(uniqueKeysWithValues: list.map { ($0.entityId, $0) })
        let de = ChipWindows.locks(entities, hidden: ["lock.e"], locale: Locale(identifier: "de"))
        #expect(de == ["lock.d", "lock.b", "lock.c", "lock.a"])
        // Swedish puts Ä after Z
        let sv = ChipWindows.locks(entities, hidden: ["lock.e"], locale: Locale(identifier: "sv"))
        #expect(sv == ["lock.d", "lock.b", "lock.a", "lock.c"])
    }

    @Test func rules() {
        #expect(Locks.busy("jammed") && Locks.busy("locking") && Locks.busy("unavailable"))
        #expect(!Locks.busy("locked") && !Locks.busy("unlocked") && !Locks.busy("open"))
        let plain = Self.lock("lock.a", "locked")
        let digits = Self.lock("lock.b", "locked", code: "^\\d{4}$")
        let digitsPlus = Self.lock("lock.c", "locked", code: "\\d+")
        let text = Self.lock("lock.d", "locked", code: ".+")
        #expect(!Locks.needsCode(plain) && Locks.needsCode(digits) && Locks.needsCode(text))
        #expect(!Locks.needsCode(Self.lock("lock.e", "locked", code: "")))
        #expect(Locks.codeIsNumeric(digits) && Locks.codeIsNumeric(digitsPlus))
        #expect(!Locks.codeIsNumeric(text) && !Locks.codeIsNumeric(plain) && !Locks.codeIsNumeric(Self.lock("lock.f", "x", code: "\\d")))
        #expect(Locks.needsDialog(.unlock, [plain]))
        #expect(!Locks.needsDialog(.lock, [plain]))
        #expect(Locks.needsDialog(.lock, [plain, digits]))
    }

    @Test func roomName() {
        let room = Room(id: "hall", name: "Flur", icon: nil, picture: nil, entityIds: ["lock.a"], domains: [:], domainOrder: [])
        #expect(ChipWindows.roomName("lock.a", rooms: [room]) == "Flur")
        #expect(ChipWindows.roomName("lock.b", rooms: [room]) == nil)
    }
}

/// The garage window (`GarageModal.tsx`).
@Suite struct GarageWindowTests {
    static func door(_ id: String, _ state: String, name: String, dc: String = "garage") -> HAEntity {
        ChipWindowsTests.e(id, state, ["friendly_name": .string(name), "device_class": .string(dc)])
    }

    @Test func openFirstThenByName() {
        let list = [Self.door("cover.a", "closed", name: "Zufahrt", dc: "gate"), Self.door("cover.b", "closing", name: "Werkstatt"),
                    Self.door("cover.c", "closed", name: "Carport"), Self.door("cover.d", "unavailable", name: "Alt"),
                    Self.door("cover.e", "open", name: "Hidden"), Self.door("cover.f", "open", name: "Rollo", dc: "shutter")]
        let entities = Dictionary(uniqueKeysWithValues: list.map { ($0.entityId, $0) })
        #expect(ChipWindows.garages(entities, hidden: ["cover.e"], locale: Locale(identifier: "de"))
            == ["cover.b", "cover.d", "cover.c", "cover.a"])
    }

    @Test func iconNames() {
        #expect(ChipWindows.appIcon(mdi: "mdi:gate-open") == "mdi.mdiGateOpen")
        #expect(ChipWindows.appIcon(mdi: "mdi:garage") == "mdi.mdiGarage")
        #expect(ChipWindows.appIcon(mdi: "mdi:garage-alert") == "mdi.mdiGarageAlert")
        for s in ["closed", "open", "unavailable"] {
            for dc in ["garage", "gate"] {
                let name = ChipWindows.appIcon(mdi: Garage.mdiIcon(Self.door("cover.x", s, name: "x", dc: dc)))
                #expect(IconLibrary.icon(name) != nil, "\(name) is missing in icons.json")
            }
        }
    }
}
