import Foundation
import Testing
@testable import HAPulseKit

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
