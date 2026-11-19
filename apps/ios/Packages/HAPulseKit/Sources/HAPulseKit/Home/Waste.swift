import Foundation

/// Waste collection (port of `waste.ts`): the sensors of the `waste_collection_schedule` integration, one bin per
/// collection type (the richest sensor of a type wins), soonest pickup first.
public enum Waste {
    public struct Collection: Equatable, Sendable {
        /// `YYYY-MM-DD`
        public var date: String
        public var type: String?
    }

    public struct Bin: Equatable, Sendable, Identifiable {
        public var entityId: String
        /// the collection type without a "(verlegt)"-style suffix
        public var name: String
        public var icon: String?
        /// whole days to the next pickup (0 = today); the sensor's own value may have a fraction
        public var daysTo: Double?
        public var nextDate: String?
        /// ascending, `nextDate` first
        public var upcoming: [Collection]
        public var id: String { entityId }
    }

    struct Candidate {
        var bin: Bin
        var key: String
        var typeCount: Int
    }

    /// `YYYY-MM-DD` from a date or the date part of an ISO time, else nil.
    public static func parseDate(_ value: JSONValue?) -> String? {
        guard let s = value?.string else { return nil }
        let u = Array(JSString.trim(s).utf16)
        guard u.count >= 10 else { return nil }
        func digits(_ r: Range<Int>) -> Bool { r.allSatisfy { (0x30...0x39).contains(u[$0]) } }
        guard digits(0..<4), u[4] == 0x2D, digits(5..<7), u[7] == 0x2D, digits(8..<10) else { return nil }
        let text = String(decoding: u[0..<10], as: UTF16.self)
        let month = Int(text.dropFirst(5).prefix(2))!, day = Int(text.suffix(2))!
        guard (1...12).contains(month), (1...31).contains(day) else { return nil }
        return text
    }

    /// Drops a trailing parenthetical ("Graue Tonne (verlegt)" → "Graue Tonne"): `/\s*\([^)]*\)\s*$/` and trim.
    public static func typeName(_ raw: String) -> String {
        var u = Array(raw.utf16)
        var end = u.count
        while end > 0, JSText.isSpace(u[end - 1]) { end -= 1 }
        if end > 0, u[end - 1] == 0x29 {
            let close = end - 1
            var prev = close - 1
            while prev >= 0, u[prev] != 0x29 { prev -= 1 } // the ")" before: "(" must come after it
            if let open = u[(prev + 1)..<close].firstIndex(of: 0x28) {
                var start = open
                while start > 0, JSText.isSpace(u[start - 1]) { start -= 1 }
                u.removeSubrange(start..<u.count)
            }
        }
        return JSString.trim(String(decoding: u, as: UTF16.self))
    }

    /// `parseWasteSensor`: nil unless the sensor looks like a waste sensor (an `upcoming` list, or a numeric `daysTo`
    /// with a `types` list). `now`: past pickups are dropped and `daysTo` computed when the sensor has none.
    static func parse(_ e: HAEntity, now: Date?, timeZone: TimeZone) -> Candidate? {
        let a = e.attributes
        let rawUpcoming = a["upcoming"]?.array ?? []
        let types = (a["types"]?.array ?? []).compactMap(\.string)
        var attrDays: Double?
        switch a["daysTo"] {
        case .number(let n)?: attrDays = n
        case .string(let s)? where !JSString.trim(s).isEmpty: attrDays = JSNumber.parse(s).flatMap { $0.isFinite ? $0 : nil }
        default: attrDays = nil
        }
        guard !rawUpcoming.isEmpty || (attrDays != nil && !types.isEmpty) else { return nil }

        var upcoming: [Collection] = rawUpcoming.compactMap { item in
            guard case .object(let o) = item, let date = parseDate(o["date"]) else { return nil }
            return Collection(date: date, type: o["type"]?.string)
        }
        if let now {
            let today = startOfDay(now, timeZone)
            upcoming = upcoming.filter { u in localMidnight(u.date, timeZone).map { $0 >= today } ?? true }
        }
        upcoming = upcoming.enumerated().sorted { l, r in l.element.date == r.element.date ? l.offset < r.offset : l.element.date < r.element.date }.map(\.element)
        var seen = Set<String>()
        upcoming = upcoming.filter { seen.insert($0.date).inserted }

        let plain = types.first { typeName($0) == JSString.trim($0) }
        let primary = plain ?? types.first
        let rawFallback = a["friendly_name"]?.string ?? e.entityId.split(separator: ".", omittingEmptySubsequences: false).dropFirst().first.map(String.init) ?? e.entityId
        let fallback = JSString.trim(dropPrefix(rawFallback).replacingOccurrences(of: "_", with: " "))
        let name: String
        if let primary { let t = typeName(primary); name = t.isEmpty ? fallback : t } else { name = fallback }

        let next = upcoming.first?.date
        var days = attrDays
        if days == nil, let next, let now, let target = localMidnight(next, timeZone) {
            days = jsRound((target.timeIntervalSince1970 - startOfDay(now, timeZone).timeIntervalSince1970) / 86_400)
        }
        let bin = Bin(entityId: e.entityId, name: name, icon: a["icon"]?.string, daysTo: days, nextDate: next, upcoming: upcoming)
        return Candidate(bin: bin, key: collapseSpaces(name.lowercased()), typeCount: types.count)
    }

    /// `/^Waste Collection Schedule\s+/i`
    static func dropPrefix(_ s: String) -> String {
        let p = "waste collection schedule"
        let u = Array(s.utf16)
        guard u.count > p.utf16.count, String(decoding: u[0..<p.utf16.count], as: UTF16.self).lowercased() == p else { return s }
        var i = p.utf16.count
        guard JSText.isSpace(u[i]) else { return s }
        while i < u.count, JSText.isSpace(u[i]) { i += 1 }
        return String(decoding: u[i...], as: UTF16.self)
    }

    /// `.replace(/\s+/g, ' ').trim()`
    static func collapseSpaces(_ s: String) -> String {
        var out: [UInt16] = []
        var inSpace = false
        for c in s.utf16 {
            if JSText.isSpace(c) { if !inSpace { out.append(0x20) }; inSpace = true } else { out.append(c); inSpace = false }
        }
        return JSString.trim(String(decoding: out, as: UTF16.self))
    }

    static func jsRound(_ x: Double) -> Double { (x + 0.5).rounded(.down) }

    static func startOfDay(_ d: Date, _ tz: TimeZone) -> Date {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = tz
        return cal.startOfDay(for: d)
    }

    static func localMidnight(_ iso: String, _ tz: TimeZone) -> Date? {
        let parts = iso.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = tz
        // like `new Date(y, m - 1, d)`: an out-of-range day rolls over (30.02. → 02.03.)
        return cal.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }

    static func better(_ a: Candidate, _ b: Candidate) -> Bool {
        if a.typeCount != b.typeCount { return a.typeCount > b.typeCount }
        let ah = a.bin.daysTo != nil, bh = b.bin.daysTo != nil
        if ah != bh { return ah }
        if a.bin.upcoming.count != b.bin.upcoming.count { return a.bin.upcoming.count > b.bin.upcoming.count }
        let al = a.bin.entityId.utf16.count, bl = b.bin.entityId.utf16.count
        if al != bl { return al < bl }
        return a.bin.entityId.utf16.lexicographicallyPrecedes(b.bin.entityId.utf16)
    }

    /// `detectWasteBins`. Bins without an upcoming date and without a countdown ≥ 0 are left out.
    public static func bins(_ entities: [HAEntity], hidden: Set<String> = [], now: Date? = nil, timeZone: TimeZone = .current,
                            locale: Locale = .current) -> [Bin] {
        // groups in the order of the entities (like the web's Map), so the result never depends on hashing
        var groups: [String: Candidate] = [:]
        var keys: [String] = []
        for e in entities where e.entityId.hasPrefix("sensor.") && !hidden.contains(e.entityId) {
            guard let c = parse(e, now: now, timeZone: timeZone) else { continue }
            if let old = groups[c.key] { if !better(c, old) { continue } } else { keys.append(c.key) }
            groups[c.key] = c
        }
        return keys.compactMap { groups[$0]?.bin }
            .filter { $0.nextDate != nil || ($0.daysTo.map { $0 >= 0 } ?? false) }
            .sorted { a, b in
                if let ad = a.daysTo, let bd = b.daysTo, ad != bd { return ad < bd }
                if (a.daysTo == nil) != (b.daysTo == nil) { return a.daysTo != nil }
                if let an = a.nextDate, let bn = b.nextDate, an != bn { return an < bn }
                let r = JSCompare.locale(a.name, b.name, locale)
                return r == .orderedSame ? a.entityId < b.entityId : r == .orderedAscending
            }
    }
}

/// `Number(string)` of JavaScript: decimal literal with sign, `Infinity`, or 0x/0o/0b; white space around is allowed;
/// nil for NaN.
enum JSNumber {
    static func parse(_ s: String) -> Double? {
        let t = JSString.trim(s)
        if t.isEmpty { return 0 }
        let u = Array(t.utf16)
        if u.count > 2, u[0] == 0x30 {
            let radix: Int? = switch u[1] { case 0x78, 0x58: 16; case 0x6F, 0x4F: 8; case 0x62, 0x42: 2; default: nil }
            if let radix {
                var v = 0.0
                for c in u[2...] {
                    guard let d = Int(String(UnicodeScalar(c).map(Character.init) ?? " "), radix: radix) else { return nil }
                    v = v * Double(radix) + Double(d)
                }
                return v
            }
        }
        var i = 0
        var sign = 1.0
        if u[i] == 0x2B || u[i] == 0x2D { sign = u[i] == 0x2D ? -1 : 1; i += 1 }
        if String(decoding: u[i...], as: UTF16.self) == "Infinity" { return sign * .infinity }
        let body = u[i...]
        var j = body.startIndex, intDigits = 0, fracDigits = 0
        func isDigit(_ k: Int) -> Bool { k < u.count && (0x30...0x39).contains(u[k]) }
        while isDigit(j) { j += 1; intDigits += 1 }
        if j < u.count, u[j] == 0x2E { j += 1; while isDigit(j) { j += 1; fracDigits += 1 } }
        guard intDigits + fracDigits > 0 else { return nil }
        if j < u.count, u[j] == 0x65 || u[j] == 0x45 {
            j += 1
            if j < u.count, u[j] == 0x2B || u[j] == 0x2D { j += 1 }
            guard isDigit(j) else { return nil }
            while isDigit(j) { j += 1 }
        }
        guard j == u.count else { return nil }
        var text = String(decoding: body, as: UTF16.self)
        if text.hasPrefix(".") { text = "0" + text }
        if text.contains(".e") || text.contains(".E") { text = text.replacingOccurrences(of: ".e", with: ".0e").replacingOccurrences(of: ".E", with: ".0E") }
        if text.hasSuffix(".") { text += "0" }
        return Double(text).map { sign * $0 }
    }
}
