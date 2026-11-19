import Foundation

/// Locale-aware number text, the one place the app turns a number into display text. Port of `formatNumber`
/// (`packages/core/src/numberFormat.ts`), which uses `Intl.NumberFormat`. Rounding, separators and the CLDR rule for
/// grouping (Spanish and Italian group only from five digits on) are written out here instead of using `NumberFormatter`, whose
/// output differs between Apple platforms and Linux; `Fixtures/numberFormat.json` holds the web's output for all seven
/// languages.
public enum NumberFormat {
    struct Symbols {
        let decimal: String
        let group: String
        let minus: String
        /// CLDR `minimumGroupingDigits`: grouping starts at `3 + minGrouping` integer digits.
        let minGrouping: Int
    }

    static func symbols(_ locale: String) -> Symbols {
        switch String(locale.lowercased().prefix(while: { $0 != "-" && $0 != "_" })) {
        case "de", "pt": return Symbols(decimal: ",", group: ".", minus: "-", minGrouping: 1)
        case "es", "it": return Symbols(decimal: ",", group: ".", minus: "-", minGrouping: 2)
        case "fr": return Symbols(decimal: ",", group: "\u{202F}", minus: "-", minGrouping: 1)
        case "sv": return Symbols(decimal: ",", group: "\u{00A0}", minus: "\u{2212}", minGrouping: 1)
        default: return Symbols(decimal: ".", group: ",", minus: "-", minGrouping: 1)
        }
    }

    /// - Parameters:
    ///   - maxDecimals: maximum fraction digits (default 1)
    ///   - minDecimals: minimum fraction digits (default 0), e.g. 1 for temperatures ("21,0")
    public static func format(_ value: Double, locale: String = "en", maxDecimals: Int = 1, minDecimals: Int = 0) -> String {
        guard value.isFinite else { return value.isNaN ? "NaN" : (value < 0 ? "-Infinity" : "Infinity") }
        let maxD = max(0, maxDecimals)
        let minD = min(maxD, max(0, minDecimals))
        let sym = symbols(locale)

        // Intl (ICU) rounds the shortest decimal that reads back as the same double ("1.005" → "1.01"), not the exact
        // binary value; Swift's `description` is that shortest form.
        let (intPart, fracPart) = shortestDecimal(abs(value))
        var intDigits = intPart.map { Int(String($0))! }
        let fracAll = fracPart.map { Int(String($0))! }
        var frac = Array(fracAll.prefix(maxD))
        while frac.count < maxD { frac.append(0) }
        if fracAll.count > maxD, fracAll[maxD] >= 5 {
            var carry = 1
            var i = frac.count - 1
            while carry > 0 && i >= 0 {
                let s = frac[i] + carry
                frac[i] = s % 10
                carry = s / 10
                i -= 1
            }
            i = intDigits.count - 1
            while carry > 0 && i >= 0 {
                let s = intDigits[i] + carry
                intDigits[i] = s % 10
                carry = s / 10
                i -= 1
            }
            if carry > 0 { intDigits.insert(carry, at: 0) }
        }
        while frac.count > minD, frac.last == 0 { frac.removeLast() }
        while intDigits.count > 1, intDigits.first == 0 { intDigits.removeFirst() }

        var intText = intDigits.map(String.init).joined()
        if intText.count >= 3 + sym.minGrouping {
            var groups: [String] = []
            var rest = Substring(intText)
            while rest.count > 3 {
                groups.insert(String(rest.suffix(3)), at: 0)
                rest = rest.dropLast(3)
            }
            groups.insert(String(rest), at: 0)
            intText = groups.joined(separator: sym.group)
        }
        let isZero = intDigits.allSatisfy { $0 == 0 } && frac.allSatisfy { $0 == 0 }
        let sign = (value < 0 && !isZero) ? sym.minus : ""
        let fracText = frac.isEmpty ? "" : sym.decimal + frac.map(String.init).joined()
        return sign + intText + fracText
    }

    /// Digits before and after the point of the shortest round-trip decimal of `v` (v ≥ 0), without exponent.
    static func shortestDecimal(_ v: Double) -> (String, String) {
        let text = v.description.lowercased()
        let parts = text.split(separator: "e", omittingEmptySubsequences: false)
        let mantissa = String(parts[0])
        let exp = parts.count > 1 ? Int(parts[1]) ?? 0 : 0
        let m = mantissa.split(separator: ".", omittingEmptySubsequences: false)
        var digits = String(m[0]) + (m.count > 1 ? String(m[1]) : "")
        var point = m[0].count + exp
        if point <= 0 {
            digits = String(repeating: "0", count: 1 - point) + digits
            point = 1
        }
        if point >= digits.count { digits += String(repeating: "0", count: point - digits.count) }
        let i = digits.index(digits.startIndex, offsetBy: point)
        return (String(digits[..<i]), String(digits[i...]))
    }
}
