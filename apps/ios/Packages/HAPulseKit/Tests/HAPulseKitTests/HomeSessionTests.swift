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

    @Test func roomsOfTheDemoAfterConnect() async throws {
        let home = try DemoHome.load()
        let s = try connectedDemo(DemoHA(home: home))
        #expect(s.rooms.isEmpty)
        await s.start()
        try await eventuallyMain("registries") { s.loaded && s.registries != nil }
        let golden = try Golden.load("rooms", as: JSONValue.self)
        let want = (golden["demo"]?["rooms"]?.array ?? []).compactMap { $0["id"]?.string }
        #expect(!want.isEmpty)
        #expect(s.rooms.map(\.id) == want)
        await s.stop()
    }

    func fakeSession(_ ha: FakeHA) throws -> HomeSession {
        var o = HAClient.Options()
        o.pingInterval = .seconds(3600)
        o.retryDelays = [.milliseconds(50)]
        let client = try HAClient(baseURL: URL(string: "https://ha.example")!, transport: ha, token: { "good" }, options: o)
        return HomeSession(client: client)
    }

    func registryCalls(_ ha: FakeHA) async -> Int {
        await ha.received.filter { $0["type"]?.string == "config/area_registry/list" }.count
    }

    /// A Home Assistant that refuses the registry lists is asked once per connect, not again every few seconds;
    /// a new connect asks again.
    @Test func refusedRegistriesAreNotRetried() async throws {
        let ha = FakeHA() // answers every unknown command with unknown_command
        let s = try fakeSession(ha)
        await s.start()
        try await eventuallyMainAsync("asked") { await self.registryCalls(ha) == 1 }
        try await Task.sleep(for: .milliseconds(1500)) // the old code asked again after 1 s
        #expect(await registryCalls(ha) == 1)
        #expect(s.registries == nil)
        await ha.dropCurrent()
        try await eventuallyMainAsync("asked after reconnect") { await self.registryCalls(ha) == 2 }
        await s.close()
    }

    /// Closing while a `.connected` may still sit in the status stream starts no new request afterwards.
    @Test func closeStartsNothingAfterwards() async throws {
        let ha = FakeHA()
        let s = try fakeSession(ha)
        await s.start()
        try await eventuallyMainAsync("asked") { await self.registryCalls(ha) == 1 }
        await s.close()
        let before = await ha.received.count
        try await Task.sleep(for: .milliseconds(300))
        #expect(await ha.received.count == before)
    }

    @Test func stateTranslationsLoadOncePerLanguage() async throws {
        let s = try connectedDemo(DemoHA(home: try DemoHome.load()))
        await s.start()
        try await eventuallyMain("loaded") { s.loaded }
        await s.loadStateTranslations(language: "de")
        #expect(s.stateTranslations.isEmpty) // the demo has none; the call must not fail
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
        // the admin points Sentinel elsewhere: this device's token stays home instead of going to the other server
        var moved = doc.object!
        var ms = moved["settings"]!.object!
        var mc = ms["customization"]!.object!
        mc["scryptedUrl"] = "https://other.example/endpoint/@local/sentinel-nvr/public/"
        ms["customization"] = .object(mc)
        moved["settings"] = .object(ms)
        moved["rev"] = 4
        await ha.setSystemData(HomeSession.globalKey, .object(moved))
        try await eventuallyMain("moved") { s.settings.sentinelURL.hasPrefix("https://other.example") }
        #expect(s.settings.sentinelToken == "")
        await ha.setSystemData(HomeSession.globalKey, doc)
        try await eventuallyMain("back") { s.settings.sentinelToken == "own" }
        await ha.setUserData(HomeSession.userKey, .object(["v": 1, "favorites": ["light.mine"], "language": "en", "userName": "Jan"]))
        try await eventuallyMain("user doc") { s.settings.favorites == ["light.mine"] }
        #expect(s.settings.language == "en")
        #expect(s.settings.userName == "Jan")
        await s.stop()
    }
}
