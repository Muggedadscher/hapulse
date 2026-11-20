import Foundation
import Testing
@testable import HAPulseKit

/// Which summary chips show, and in which order (`SummaryChipsBar.tsx`/`SummaryChips.tsx`).
@Suite struct SummaryChipsTests {
    static func counts(alarm: Bool = false, pool: Bool = false, garages: Int = 0, locks: Int = 0) -> ChipCounts {
        var c = ChipCounts()
        if alarm { c.alarm = HAEntity(entityId: "alarm_control_panel.home", state: "disarmed", attributes: [:], context: [:], lastChangedMs: 0, lastUpdatedMs: 0) }
        c.poolPresent = pool
        c.garages.total = garages
        c.locks.total = locks
        return c
    }

    @Test func allWhenNoneOrAllChosen() {
        let c = Self.counts(alarm: true, pool: true, garages: 1, locks: 2)
        let all: [SummaryChips.Chip] = [.people, .lights, .doors, .garage, .locks, .alarm, .pool, .media]
        #expect(SummaryChips.visible(c, homeChips: [], order: nil) == all)
        #expect(SummaryChips.visible(c, homeChips: SummaryChips.Chip.allCases.map(\.rawValue), order: nil) == all)
    }

    @Test func chipsWithoutDevicesAreLeftOut() {
        #expect(SummaryChips.visible(Self.counts(), homeChips: [], order: nil) == [.people, .lights, .doors, .media])
    }

    @Test func aSubsetShowsOnlyThose() {
        let c = Self.counts(alarm: true)
        #expect(SummaryChips.visible(c, homeChips: ["media", "lights"], order: nil) == [.lights, .media])
    }

    @Test func storedOrderWins() {
        let c = Self.counts(pool: true, garages: 1)
        // pool and garage are in the stored order: no default placement
        let order = ["media", "pool", "people", "garage", "lights", "doors"]
        #expect(SummaryChips.visible(c, homeChips: [], order: order) == [.media, .pool, .people, .garage, .lights, .doors])
        // not in the stored order: garage after doors, pool before media, locks after garage
        let c2 = Self.counts(pool: true, garages: 1, locks: 1)
        #expect(SummaryChips.visible(c2, homeChips: [], order: ["media", "doors", "people"])
            == [.pool, .media, .doors, .garage, .locks, .people, .lights])
    }

    @Test func locksFollowDoorsWithoutGarage() {
        #expect(SummaryChips.visible(Self.counts(locks: 1), homeChips: [], order: nil) == [.people, .lights, .doors, .locks, .media])
    }

    @Test func alarmTone() {
        #expect(SummaryChips.alarmTone(nil) == .none)
        #expect(SummaryChips.alarmTone("disarmed") == .none)
        #expect(SummaryChips.alarmTone("armed_away") == .armed)
        #expect(SummaryChips.alarmTone("triggered") == .triggered)
        #expect(SummaryChips.alarmTone("pending") == .other)
    }
}

/// Scene tiles: icon by keywords, Glas tone by icon or position (`ScenesCard.tsx`, `sceneTone.ts`).
@Suite struct SceneLookTests {
    @Test func iconsByKeyword() {
        #expect(SceneLook.icon("Good Morning") == "sun")
        #expect(SceneLook.icon("Bedroom sleep") == "moon") // "bed" and "sleep"
        #expect(SceneLook.icon("Relax") == "sunset")
        #expect(SceneLook.icon("living_room_movie") == "tv")
        #expect(SceneLook.icon("Party") == "party-popper")
        #expect(SceneLook.icon("Office focus") == "book-open")
        #expect(SceneLook.icon("Breakfast") == "coffee")
        #expect(SceneLook.icon("Sound") == "music-2")
        #expect(SceneLook.icon("Kochen") == "sparkles")
        // the first rule that matches wins, like the web's if-chain: "wake" before "bed"
        #expect(SceneLook.icon("bedroom wake") == "sun")
    }

    @Test func tones() {
        #expect(SceneLook.tone("Morning", index: 3) == "yellow")
        #expect(SceneLook.tone("Night", index: 0) == "indigo")
        #expect(SceneLook.tone("Cinema", index: 0) == "purple")
        #expect((0..<5).map { SceneLook.tone("Kochen", index: $0) } == ["yellow", "purple", "orange", "indigo", "yellow"])
    }

    @Test func names() {
        let e = HAEntity(entityId: "scene.living_room_movie", state: "unknown", attributes: [:], context: [:], lastChangedMs: 0, lastUpdatedMs: 0)
        #expect(SceneLook.name(e) == "living room movie")
        var f = e
        f.attributes["friendly_name"] = .string("Kino_Abend")
        #expect(SceneLook.name(f) == "Kino Abend")
    }
}
