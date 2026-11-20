import Foundation
import Testing
@testable import HAPulseKit

struct SettingsTests {
    let g: JSONValue

    init() throws { g = try Golden.load("settings", as: JSONValue.self) }

    private func list(_ k: String) -> [JSONValue] { g[k]?.array ?? [] }

    @Test func defaults() {
        #expect(JSONValue.object(SettingsRules.defaultCustomization) == g["defaults"])
    }

    @Test func hydrate() {
        for c in list("hydrate") {
            #expect(JSONValue.object(SettingsRules.hydrate(c["input"])) == c["out"], "\(c["input"] ?? .null)")
        }
    }

    @Test func imports() {
        for (i, c) in list("imports").enumerated() {
            let out = SettingsRules.imported(current: c["cur"]?.object ?? [:], raw: c["raw"])
            #expect(JSONValue.object(out) == c["out"], "case \(i)")
        }
    }

    @Test func globals() {
        for (i, c) in list("globals").enumerated() {
            let out = SettingsRules.applyGlobal(current: c["cur"]?.object ?? [:], payload: c["payload"]?.object ?? [:])
            #expect(JSONValue.object(out) == c["out"], "case \(i)")
        }
    }

    @Test func users() {
        for (i, c) in list("users").enumerated() {
            let out = SettingsRules.applyUser(current: c["cur"]?.object ?? [:], payload: c["payload"]?.object ?? [:])
            #expect(JSONValue.object(out) == c["out"], "case \(i)")
        }
    }

    @Test func sharedSecrets() {
        for (i, c) in list("shared").enumerated() {
            let out = SettingsRules.sharedSecrets(current: c["cur"]?.object ?? [:], secrets: c["secrets"], keepOwn: c["keepOwn"]?.bool ?? false)
            #expect(JSONValue.object(out) == c["out"], "case \(i)")
        }
    }

    @Test func urlSecrets() {
        for c in list("secrets") {
            let input = c["input"]?.string ?? ""
            #expect(SettingsSecrets.originOf(input).map(JSONValue.string) ?? .null == c["origin"], "origin \(input)")
            let s = SettingsSecrets.splitUrlToken(input)
            #expect(JSONValue.object(["url": .string(s.url), "token": s.token.map(JSONValue.string) ?? .null]) == c["split"], "split \(input)")
        }
    }

    @Test func themes() {
        for c in list("themes") {
            let out = SettingsRules.migrateTheme(c["input"]).map { JSONValue.object(["theme": .string($0.theme), "mode": .string($0.mode)]) } ?? .null
            #expect(out == c["out"], "\(c["input"] ?? .null)")
        }
    }

    @Test func scope() {
        let s = g["scope"] ?? .null
        #expect(JSONValue.array(SettingsRules.userCustomizationKeys.map(JSONValue.string)) == s["userKeys"])
        #expect(JSONValue.array(SettingsRules.globalTopKeys.map(JSONValue.string)) == s["globalTop"])
        let st = s["state"]?.object ?? [:]
        #expect(JSONValue.object(SettingsRules.extractGlobal(st)) == s["extractGlobal"])
        #expect(JSONValue.object(SettingsRules.extractUser(st)) == s["extractUser"])
        #expect(JSONValue.object(SettingsRules.extractSecrets(st)) == s["extractSecrets"])
        let diff = SettingsRules.diffGlobal(s["extractGlobal"]?.object ?? [:], s["changed"]?.object ?? [:])
        #expect(JSONValue.object(diff) == s["diff"])
        #expect(!diff.isEmpty == s["hasChanges"]?.bool)
        #expect(SettingsRules.diffGlobal(s["extractGlobal"]?.object ?? [:], s["extractGlobal"]?.object ?? [:]).isEmpty == (s["noChanges"]?.bool == false))
        var onto = s["extractGlobal"]?.object ?? [:]
        onto["mode"] = "auto"
        #expect(JSONValue.object(SettingsRules.mergeGlobal(onto, diff)) == s["merged"])
        for c in s["validDoc"]?.array ?? [] { #expect(SettingsRules.isValidGlobalDoc(c["doc"]) == c["out"]?.bool) }
        for c in s["validUser"]?.array ?? [] { #expect(SettingsRules.isValidUserPayload(c["doc"]) == c["out"]?.bool) }
    }
}
