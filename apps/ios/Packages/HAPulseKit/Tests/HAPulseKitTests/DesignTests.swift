import Foundation
import Testing
@testable import HAPulseKit

struct AccentCase: Decodable { let mode: GlasAccent.Mode; let hue: Double?; let out: GlasAccent }

@Suite struct DesignTests {
    @Test func accentMatchesWebForEveryHue() throws {
        let cases: [AccentCase] = try Golden.load("glasAccent")
        #expect(cases.count > 700)
        var failures: [String] = []
        for c in cases {
            let got = GlasAccent.make(hue: c.hue, mode: c.mode)
            if got != c.out { failures.append("\(c.mode) \(c.hue.map { "\($0)" } ?? "nil"): \(got) != \(c.out)") }
        }
        #expect(failures.isEmpty, "\(failures.count) differences, e.g. \(failures.prefix(4))")
    }

    @Test func colourTableIsComplete() {
        #expect(GlasColor.allCases.count > 80)
        #expect(GlasColor.bg.values.light.hex == "#F2F2F7")
        #expect(GlasColor.bg.values.dark.hex == "#000000")
        #expect(GlasColor.fill.values.light.a == 0.12)
    }

    @Test func cssParsing() {
        #expect(RGBA(css: "#abc") == RGBA(170, 187, 204))
        #expect(RGBA(css: "rgba(120,120,128,.12)") == RGBA(120, 120, 128, 0.12))
        #expect(RGBA(css: "rgb(1 2 3 / 50%)") == RGBA(1, 2, 3, 0.5))
        #expect(RGBA(css: "color-mix(in srgb, red 5%, blue)") == nil)
    }

    @Test func everyIconParses() throws {
        #expect(!IconLibrary.all.isEmpty)
        for (name, icon) in IconLibrary.all {
            let cmds = try icon.commands()
            #expect(!cmds.isEmpty, "\(name)")
            for c in cmds {
                let pts: [IconPoint]
                switch c {
                case .move(let p), .line(let p): pts = [p]
                case .cubic(let a, let b, let p): pts = [a, b, p]
                case .close: pts = []
                }
                for p in pts { #expect(p.x.isFinite && p.y.isFinite && p.x > -2 && p.x < 26 && p.y > -2 && p.y < 26, "\(name)") }
            }
        }
    }

    @Test func arcEndsWhereSVGSays() throws {
        let cmds = try SVGPath.parse("M2 12A10 10 0 0 0 22 12")
        guard case .cubic(_, _, let end)? = cmds.last else { Issue.record("no curve"); return }
        #expect(end == IconPoint(22, 12))
    }

    @Test func demoHomeLoads() throws {
        let demo = try DemoHome.load()
        #expect(demo.entities.count > 50)
        #expect(ISO8601.parse("2026-06-15T09:41:00.000Z") == demo.now)
    }
}

