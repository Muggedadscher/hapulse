import Foundation

/// The accent family of the style Glas for the user's hue (setting `accentHue`). Port of `glasAccent` in
/// `packages/core/src/glasTokens.ts`; checked against `Fixtures/glasAccent.json` for every whole hue in both modes.
/// The fields are the strings the web writes into its CSS variables, so a comparison is exact.
public struct GlasAccent: Equatable, Sendable, Decodable {
    /// Bright accent, surfaces only.
    public var accent: String
    /// Accessible text and glyph colour.
    public var accentInk: String
    /// Active tab on the lens.
    public var tabInk: String
    public var accentSoft: String
    /// The one prominent primary action of a view.
    public var prominent: String
    public var onProminent: String
    /// Best text colour on `accentInk`.
    public var onAccentInk: String
    public var focus: String

    public enum Mode: String, Sendable, Decodable { case light, dark }

    private static let neutralDark = "#1C1C1E"

    /// The sheet material's weaker gradient stop and its filter brightness (`SHEET` in glasTokens.ts).
    private static func sheet(_ mode: Mode) -> (bottom: RGBA, bright: Double) {
        mode == .light ? (RGBA(255, 255, 255, 0.82), 1.04) : (RGBA(28, 28, 30, 0.80), 0.9)
    }

    private static func color(_ c: GlasColor, _ mode: Mode) -> RGBA { c.value(dark: mode == .dark) }

    private static func sheetOver(_ backdrop: RGBA, _ mode: Mode) -> RGBA {
        let s = sheet(mode)
        let lit = RGBA(backdrop.r * s.bright, backdrop.g * s.bright, backdrop.b * s.bright).rounded
        return s.bottom.over(lit)
    }

    private static func windowGround(_ mode: Mode) -> RGBA {
        sheetOver(color(.scrim, mode).over(color(.bg, mode)), mode)
    }

    private static func bestOn(_ bg: RGBA) -> String {
        let white = RGBA(255, 255, 255), dark = RGBA(css: neutralDark)!
        return RGBA.contrast(white, bg) >= RGBA.contrast(dark, bg) ? "#FFFFFF" : neutralDark
    }

    /// Darken (light) or lighten (dark) until ≥ 4.5:1 against every colour in `against`, at most 40 steps.
    private static func ink(from start: RGBA, _ mode: Mode, against: [RGBA], darken: Double, lighten: Double) -> RGBA {
        var c = start
        func worst() -> Double { against.map { RGBA.contrast(c.rounded, $0) }.min() ?? 21 }
        var i = 0
        while i < 40 && worst() < 4.5 {
            c = mode == .light
                ? RGBA(c.r * darken, c.g * darken, c.b * darken)
                : RGBA(c.r + (255 - c.r) * lighten, c.g + (255 - c.g) * lighten, c.b + (255 - c.b) * lighten)
            i += 1
        }
        return c.rounded
    }

    private static func inkSurfaces(_ mode: Mode, accentSoft: RGBA) -> [RGBA] {
        let card = color(.card, mode), bg = color(.bg, mode), fill = color(.fill, mode)
        let win = windowGround(mode)
        if mode == .light {
            return [bg, fill.over(card), fill.over(bg), accentSoft.over(card), win, accentSoft.over(win)]
        }
        return [card, color(.card2, mode), fill.over(card), accentSoft.over(card), accentSoft.over(color(.group, mode)), win,
                accentSoft.over(win)]
    }

    private static func defaults(_ mode: Mode) -> GlasAccent {
        let d: GlasAccent = mode == .light
            ? GlasAccent(accent: "#FF9500", accentInk: "#A64B00", tabInk: "#A64B00", accentSoft: "rgba(255,149,0,.16)",
                         prominent: "#FF9500", onProminent: neutralDark, onAccentInk: "", focus: "#A64B00")
            : GlasAccent(accent: "#FF9F0A", accentInk: "#FFB340", tabInk: "#FFB340", accentSoft: "rgba(255,159,10,.26)",
                         prominent: "#FF9F0A", onProminent: neutralDark, onAccentInk: "", focus: "#FFB340")
        var out = d
        out.onAccentInk = bestOn(RGBA(css: d.accentInk)!)
        return out
    }

    /// Accent family for `hue` (degrees); without a hue the iOS orange of the design.
    public static func make(hue: Double?, mode: Mode) -> GlasAccent {
        guard let hue, hue.isFinite else { return defaults(mode) }
        let accent = RGBA.hsl(hue, 78, mode == .light ? 50 : 60)
        let alpha = mode == .light ? ".16" : ".26"
        let accentSoftText = "rgba(\(Int(accent.r)),\(Int(accent.g)),\(Int(accent.b)),\(alpha))"
        let accentSoft = RGBA(accent.r, accent.g, accent.b, mode == .light ? 0.16 : 0.26)
        let accentInk = ink(from: accent, mode, against: inkSurfaces(mode, accentSoft: accentSoft), darken: 0.9, lighten: 0.12)
        let tabInk = ink(from: accentInk, mode, against: [color(.lens, mode)], darken: 0.93, lighten: 0.1)
        let dark = RGBA(css: neutralDark)!
        var prominent = accent.hex, onProminent = neutralDark
        if RGBA.contrast(dark, accent) < 4.5 {
            if RGBA.contrast(RGBA(255, 255, 255), accent) >= 4.5 {
                onProminent = "#FFFFFF"
            } else {
                prominent = accentInk.hex
                onProminent = bestOn(accentInk)
            }
        }
        return GlasAccent(accent: accent.hex, accentInk: accentInk.hex, tabInk: tabInk.hex, accentSoft: accentSoftText,
                          prominent: prominent, onProminent: onProminent, onAccentInk: bestOn(accentInk), focus: accentInk.hex)
    }
}
