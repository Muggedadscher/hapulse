import Foundation

/// A point in the 24 × 24 icon grid.
public struct IconPoint: Equatable, Sendable {
    public var x: Double
    public var y: Double
    public init(_ x: Double, _ y: Double) { self.x = x; self.y = y }
}

/// Absolute drawing commands; arcs and the shorthand curves are already resolved, so a UI only needs these four.
public enum PathCommand: Equatable, Sendable {
    case move(IconPoint)
    case line(IconPoint)
    case cubic(IconPoint, IconPoint, IconPoint)
    case close
}

/// The icons of the web UI (Lucide = stroked outlines, MDI = filled), taken over as path data by the generator from
/// the list `apps/ios/icons.json`. Lucide icons are drawn with a stroke width the view chooses, as in the web
/// (`strokeWidth={1.75}` …).
public struct IconData: Sendable, Decodable {
    public enum Kind: String, Sendable, Decodable { case stroke, fill }
    public let kind: Kind
    public let paths: [String]

    /// All sub-paths of the icon as commands.
    public func commands() throws -> [PathCommand] {
        try paths.flatMap { try SVGPath.parse($0) }
    }
}

public enum IconLibrary {
    /// Names like `lucide.house` or `mdi.mdiLightbulb`.
    public static let all: [String: IconData] = {
        guard let url = Resources.url("icons.json"), let data = try? Data(contentsOf: url) else { return [:] }
        return (try? JSONDecoder().decode([String: IconData].self, from: data)) ?? [:]
    }()

    public static func icon(_ name: String) -> IconData? { all[name] }
}

/// Parser for SVG path data (`d`), all commands incl. relative forms and elliptical arcs.
public enum SVGPath {
    public struct ParseError: Error, Equatable { public let message: String }

    public static func parse(_ d: String) throws -> [PathCommand] {
        var scanner = Scanner(Array(d.unicodeScalars))
        var out: [PathCommand] = []
        var cur = IconPoint(0, 0), start = IconPoint(0, 0)
        var lastCubicCtrl: IconPoint? = nil
        var lastQuadCtrl: IconPoint? = nil
        var cmd: Character? = nil

        while true {
            scanner.skipSeparators()
            if scanner.atEnd { break }
            if let c = scanner.peekCommand() {
                cmd = c
                scanner.advance()
            } else if cmd == nil {
                throw ParseError(message: "path must start with a command")
            }
            guard let c = cmd else { break }
            let rel = c.isLowercase
            func pt(_ x: Double, _ y: Double) -> IconPoint { rel ? IconPoint(cur.x + x, cur.y + y) : IconPoint(x, y) }
            var nextCubic: IconPoint? = nil
            var nextQuad: IconPoint? = nil
            switch Character(c.lowercased()) {
            case "m":
                let p = pt(try scanner.number(), try scanner.number())
                out.append(.move(p)); cur = p; start = p
                cmd = rel ? "l" : "L" // further pairs are lines
            case "l":
                let p = pt(try scanner.number(), try scanner.number())
                out.append(.line(p)); cur = p
            case "h":
                let x = try scanner.number()
                let p = IconPoint(rel ? cur.x + x : x, cur.y)
                out.append(.line(p)); cur = p
            case "v":
                let y = try scanner.number()
                let p = IconPoint(cur.x, rel ? cur.y + y : y)
                out.append(.line(p)); cur = p
            case "c":
                let c1 = pt(try scanner.number(), try scanner.number())
                let c2 = pt(try scanner.number(), try scanner.number())
                let p = pt(try scanner.number(), try scanner.number())
                out.append(.cubic(c1, c2, p)); cur = p; nextCubic = c2
            case "s":
                let c1 = lastCubicCtrl.map { IconPoint(2 * cur.x - $0.x, 2 * cur.y - $0.y) } ?? cur
                let c2 = pt(try scanner.number(), try scanner.number())
                let p = pt(try scanner.number(), try scanner.number())
                out.append(.cubic(c1, c2, p)); cur = p; nextCubic = c2
            case "q":
                let q = pt(try scanner.number(), try scanner.number())
                let p = pt(try scanner.number(), try scanner.number())
                out.append(quad(cur, q, p)); cur = p; nextQuad = q
            case "t":
                let q = lastQuadCtrl.map { IconPoint(2 * cur.x - $0.x, 2 * cur.y - $0.y) } ?? cur
                let p = pt(try scanner.number(), try scanner.number())
                out.append(quad(cur, q, p)); cur = p; nextQuad = q
            case "a":
                let rx = try scanner.number(), ry = try scanner.number(), rot = try scanner.number()
                let large = try scanner.flag(), sweep = try scanner.flag()
                let p = pt(try scanner.number(), try scanner.number())
                out.append(contentsOf: arc(from: cur, to: p, rx: rx, ry: ry, rotation: rot, large: large, sweep: sweep))
                cur = p
            case "z":
                out.append(.close); cur = start
                cmd = nil
            default:
                throw ParseError(message: "unknown command \(c)")
            }
            lastCubicCtrl = nextCubic
            lastQuadCtrl = nextQuad
        }
        return out
    }

    static func quad(_ p0: IconPoint, _ q: IconPoint, _ p: IconPoint) -> PathCommand {
        .cubic(IconPoint(p0.x + 2 / 3 * (q.x - p0.x), p0.y + 2 / 3 * (q.y - p0.y)),
               IconPoint(p.x + 2 / 3 * (q.x - p.x), p.y + 2 / 3 * (q.y - p.y)), p)
    }

    /// Elliptical arc → cubic Béziers (SVG 1.1 implementation notes F.6).
    static func arc(from p0: IconPoint, to p1: IconPoint, rx rx0: Double, ry ry0: Double, rotation: Double,
                    large: Bool, sweep: Bool) -> [PathCommand] {
        if p0 == p1 { return [] }
        var rx = abs(rx0), ry = abs(ry0)
        if rx == 0 || ry == 0 { return [.line(p1)] }
        let phi = rotation * .pi / 180
        let cosP = cos(phi), sinP = sin(phi)
        let dx = (p0.x - p1.x) / 2, dy = (p0.y - p1.y) / 2
        let x1 = cosP * dx + sinP * dy, y1 = -sinP * dx + cosP * dy
        let lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
        if lambda > 1 { rx *= lambda.squareRoot(); ry *= lambda.squareRoot() }
        let num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
        let den = rx * rx * y1 * y1 + ry * ry * x1 * x1
        var coef = den == 0 ? 0 : max(0, num / den).squareRoot()
        if large == sweep { coef = -coef }
        let cx1 = coef * rx * y1 / ry, cy1 = -coef * ry * x1 / rx
        let cx = cosP * cx1 - sinP * cy1 + (p0.x + p1.x) / 2
        let cy = sinP * cx1 + cosP * cy1 + (p0.y + p1.y) / 2
        func angle(_ ux: Double, _ uy: Double, _ vx: Double, _ vy: Double) -> Double {
            let a = atan2(ux * vy - uy * vx, ux * vx + uy * vy)
            return a
        }
        let theta1 = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry)
        var delta = angle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry)
        if !sweep && delta > 0 { delta -= 2 * .pi }
        if sweep && delta < 0 { delta += 2 * .pi }
        let segments = max(1, Int((abs(delta) / (.pi / 2)).rounded(.up)))
        let step = delta / Double(segments)
        let t = 4.0 / 3.0 * tan(step / 4)
        var out: [PathCommand] = []
        var a1 = theta1
        func point(_ a: Double) -> IconPoint {
            IconPoint(cx + rx * cos(a) * cosP - ry * sin(a) * sinP, cy + rx * cos(a) * sinP + ry * sin(a) * cosP)
        }
        func deriv(_ a: Double) -> IconPoint {
            IconPoint(-rx * sin(a) * cosP - ry * cos(a) * sinP, -rx * sin(a) * sinP + ry * cos(a) * cosP)
        }
        for i in 0..<segments {
            let a2 = a1 + step
            let s = point(a1), e = i == segments - 1 ? p1 : point(a2)
            let d1 = deriv(a1), d2 = deriv(a2)
            out.append(.cubic(IconPoint(s.x + t * d1.x, s.y + t * d1.y), IconPoint(e.x - t * d2.x, e.y - t * d2.y), e))
            a1 = a2
        }
        return out
    }

    struct Scanner {
        let s: [Unicode.Scalar]
        var i = 0
        init(_ s: [Unicode.Scalar]) { self.s = s }
        var atEnd: Bool { i >= s.count }

        mutating func skipSeparators() {
            while i < s.count, s[i] == " " || s[i] == "," || s[i] == "\n" || s[i] == "\t" || s[i] == "\r" { i += 1 }
        }

        func peekCommand() -> Character? {
            guard i < s.count else { return nil }
            let c = Character(s[i])
            return "MmLlHhVvCcSsQqTtAaZz".contains(c) ? c : nil
        }

        mutating func advance() { i += 1 }

        mutating func flag() throws -> Bool {
            skipSeparators()
            guard i < s.count, s[i] == "0" || s[i] == "1" else { throw ParseError(message: "arc flag expected") }
            defer { i += 1 }
            return s[i] == "1"
        }

        mutating func number() throws -> Double {
            skipSeparators()
            let startIdx = i
            if i < s.count, s[i] == "-" || s[i] == "+" { i += 1 }
            var seenDot = false, seenDigit = false
            while i < s.count {
                let c = s[i]
                if c >= "0" && c <= "9" { seenDigit = true; i += 1 }
                else if c == "." && !seenDot { seenDot = true; i += 1 }
                else { break }
            }
            if i < s.count, s[i] == "e" || s[i] == "E" {
                var j = i + 1
                if j < s.count, s[j] == "-" || s[j] == "+" { j += 1 }
                if j < s.count, s[j] >= "0" && s[j] <= "9" {
                    i = j
                    while i < s.count, s[i] >= "0" && s[i] <= "9" { i += 1 }
                }
            }
            guard seenDigit, let v = Double(String(String.UnicodeScalarView(s[startIdx..<i]))) else {
                throw ParseError(message: "number expected at \(startIdx)")
            }
            return v
        }
    }
}
