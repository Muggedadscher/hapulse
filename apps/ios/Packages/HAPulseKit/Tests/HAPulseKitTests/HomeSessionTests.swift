import Foundation
import Testing
@testable import HAPulseKit

@MainActor
@Suite(.serialized)
struct HomeSessionTests {
    func connectedDemo(_ ha: DemoHA) throws -> HomeSession {
        var o = HAClient.Options()
        o.pingInterval = .seconds(3600)
        let client = try HAClient(baseURL: URL(string: "https://demo.invalid")!, transport: ha, token: { DemoHA.token }, options: o)
        return HomeSession(client: client)
    }

    @Test func demoLoadsEntitiesUserAndDefaults() async throws {
        let home = try DemoHome.load()
        let ha = DemoHA(home: home)
        let s = try connectedDemo(ha)
        await s.start()
        try await eventuallyMain("loaded") { s.loaded && s.user != nil }
        #expect(s.entities.entities.count == home.entities.count)
        #expect(s.entities["alarm_control_panel.home"]?.state == "disarmed")
        #expect(s.entities["alarm_control_panel.home"]?.json == home.entities["alarm_control_panel.home"])
        #expect(s.isAdmin)
        #expect(!s.managed)
        #expect(s.settings.glassStrength == "clear")
        await s.stop()
    }

    @Test func serviceCallsChangeTheDemo() async throws {
        let home = try DemoHome.load()
        let light = try #require(home.entities.keys.sorted().first { $0.hasPrefix("light.") })
        let ha = DemoHA(home: home)
        let s = try connectedDemo(ha)
        await s.start()
        try await eventuallyMain("loaded") { s.loaded }
        let before = s.entities[light]?.state
        _ = try await s.client.callService("light", "toggle", target: ["entity_id": .string(light)])
        try await eventuallyMain("toggled") { s.entities[light]?.state != before }
        await s.stop()
    }

    @Test func managedSettingsFromTheGlobalDocument() async throws {
        let ha = DemoHA(home: try DemoHome.load())
        let s = try connectedDemo(ha)
        s.deviceSecrets = .init(sentinelOrigin: "https://nvr.example", sentinelToken: "own")
        await s.start()
        try await eventuallyMain("loaded") { s.loaded && s.user != nil }
        let ref: JSONValue = .object(["id": "a", "name": "Admin"])
        let doc: JSONValue = .object([
            "v": 1, "rev": 3, "activatedAt": "x", "updatedAt": "y", "activatedBy": ref, "updatedBy": ref,
            "settings": .object(["theme": "ocean", "mode": "dark", "accentHue": 210, "appName": "Haus", "appIcon": .null, "appIconHidden": false,
                                 "customization": .object(["uiStyle": "glas", "glassStrength": "tinted", "favorites": ["light.admin"],
                                                           "scryptedUrl": "https://nvr.example", "hiddenRooms": ["x"]])]),
            "userDefaults": .object(["favorites": ["light.default"], "language": "de"]),
            "shareSecrets": false,
        ])
        await ha.setSystemData(HomeSession.globalKey, doc)
        try await eventuallyMain("managed") { s.managed }
        #expect(s.settings.mode == "dark")
        #expect(s.settings.accentHue == 210)
        #expect(s.settings.glassStrength == "tinted")
        #expect(s.settings.favorites == ["light.default"]) // admin's favorites are USER scope: defaults apply
        #expect(s.settings.language == "de")
        #expect(s.settings.sentinelToken == "own") // admin keeps the own token when nothing is shared
        await ha.setUserData(HomeSession.userKey, .object(["v": 1, "favorites": ["light.mine"], "language": "en", "userName": "Jan"]))
        try await eventuallyMain("user doc") { s.settings.favorites == ["light.mine"] }
        #expect(s.settings.language == "en")
        #expect(s.settings.userName == "Jan")
        await s.stop()
    }
}
