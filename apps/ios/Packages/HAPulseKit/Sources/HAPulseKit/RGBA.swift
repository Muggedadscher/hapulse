import Foundation

/// A colour as the web code computes it: channels 0…255 (not rounded), alpha 0…1.
/// Port of `parseColor`, `toHex`, `compositeOver`, `relativeLuminance`, `contrastRatio`, `hslToHex` from
/// `packages/core/src/glasTokens.ts`; the golden cases in `Fixtures/glasAccent.json` check the result.
public struct RGBA: Equatable, Hashable, Sendable {
    public var r: Double
    public var g: Double
    public var b: Double
    public var a: Double

    public init(_ r: Double, _ g: Double, _ b: Double, _ a: Double = 1) {
        self.r = r
        self.g = g
        self.b = b
        self.a = a
    }

    /// `#rgb`, `#rrggbb`, `rgb()`/`rgba()` with commas or spaces, `transparent`. Anything else → nil.
    public init?(css input: String) {
        let s = input.trimmingCharacters(in: .whitespaces).lowercased()
        if s == "transparent" { self.init(0, 0, 0, 0); return }
        if s.hasPrefix("#") {
            let hex = Array(s.dropFirst())
            guard hex.allSatisfy(\.isHexDigit) else { return nil }
            func v(_ part: [Character]) -> Double { Double(Int(String(part), radix: 16) ?? 0) }
            if hex.count == 3 {
                self.init(v([hex[0], hex[0]]), v([hex[1], hex[1]]), v([hex[2], hex[2]]))
                return
            }
            if hex.count == 6 {
                self.init(v(Array(hex[0..<2])), v(Array(hex[2..<4])), v(Array(hex[4..<6])))
                return
            }
            return nil
        }
        guard s.hasPrefix("rgb"), let open = s.firstIndex(of: "("), s.hasSuffix(")") else { return nil }
        let name = s[s.startIndex..<open]
        guard name == "rgb" || name == "rgba" else { return nil }
        let body = s[s.index(after: open)..<s.index(before: s.endIndex)]
        let parts = body.split(whereSeparator: { $0 == "," || $0 == " " || $0 == "/" }).map(String.init)
        guard parts.count == 3 || parts.count == 4 else { return nil }
        // like the web's pattern `[\d.]+`: no sign, no exponent
        func plain(_ p: String) -> Bool { !p.isEmpty && p.allSatisfy { $0.isASCII && ($0.isNumber || $0 == ".") } }
        guard parts.prefix(3).allSatisfy(plain), parts.count == 3 || plain(parts[3].hasSuffix("%") ? String(parts[3].dropLast()) : parts[3]) else { return nil }
        let nums = parts.prefix(3).compactMap(Double.init)
        guard nums.count == 3 else { return nil }
        var alpha = 1.0
        if parts.count == 4 {
            let p = parts[3]
            if p.hasSuffix("%") {
                guard let v = Double(p.dropLast()) else { return nil }
                alpha = v / 100
            } else {
                guard let v = Double(p) else { return nil }
                alpha = v
            }
        }
        self.init(nums[0], nums[1], nums[2], alpha)
    }

    /// JavaScript's `Math.round` (half up, also for negatives) — the web rounds this way.
    static func jsRound(_ v: Double) -> Double { (v + 0.5).rounded(.down) }

    /// `#RRGGBB` (upper case, alpha ignored), like `toHex`.
    public var hex: String {
        func h(_ v: Double) -> String {
            let n = Int(Self.jsRound(min(255, max(0, v))))
            let s = String(n, radix: 16, uppercase: true)
            return s.count == 1 ? "0" + s : s
        }
        return "#" + h(r) + h(g) + h(b)
    }

    /// `rgba(r,g,b,a)` with the channels as integers when they are whole.
    public var css: String {
        func f(_ v: Double) -> String { v == v.rounded() ? String(Int(v)) : String(v) }
        return a == 1 ? hex : "rgba(\(f(r)),\(f(g)),\(f(b)),\(f(a)))"
    }

    /// This colour (with its alpha) over an opaque `background` → opaque colour, rounded like `compositeOver`.
    public func over(_ background: RGBA) -> RGBA {
        let mixed = RGBA(r * a + background.r * (1 - a), g * a + background.g * (1 - a), b * a + background.b * (1 - a))
        return mixed.rounded
    }

    /// Rounded to whole channels and opaque (what a hex string carries).
    public var rounded: RGBA {
        RGBA(Self.jsRound(min(255, max(0, r))), Self.jsRound(min(255, max(0, g))), Self.jsRound(min(255, max(0, b))))
    }

    /// WCAG relative luminance of the rounded colour.
    public var luminance: Double {
        let c = rounded
        func lin(_ v: Double) -> Double {
            let x = v / 255
            return x <= 0.04045 ? x / 12.92 : pow((x + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
    }

    /// WCAG contrast ratio (1…21) of two colours, both taken as opaque.
    public static func contrast(_ x: RGBA, _ y: RGBA) -> Double {
        let lx = x.luminance, ly = y.luminance
        return (max(lx, ly) + 0.05) / (min(lx, ly) + 0.05)
    }

    /// `hslToHex(h, s, l)`: s and l in percent; the result is rounded like the hex string.
    public static func hsl(_ h: Double, _ s: Double, _ l: Double) -> RGBA {
        let hh = (h.truncatingRemainder(dividingBy: 360) + 360).truncatingRemainder(dividingBy: 360)
        let ss = s / 100, ll = l / 100
        func k(_ n: Double) -> Double { (n + hh / 30).truncatingRemainder(dividingBy: 12) }
        let a = ss * min(ll, 1 - ll)
        func f(_ n: Double) -> Double { ll - a * max(-1, min(k(n) - 3, min(9 - k(n), 1))) }
        return RGBA(f(0) * 255, f(8) * 255, f(4) * 255).rounded
    }
}

extension GlasColor {
    public func value(dark: Bool) -> RGBA { dark ? values.dark : values.light }
}
