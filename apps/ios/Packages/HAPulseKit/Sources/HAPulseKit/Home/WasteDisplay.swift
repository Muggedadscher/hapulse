import Foundation

/// The waste card's display rules (port of `wasteDisplay.ts`): a bin's colour, its countdown and which per-date types
/// the bin window shows.
extension Waste {
    public enum Tone: String, Sendable, CaseIterable {
        case info, warning, positive, danger, neutral
    }

    /// `wasteTone`: a keyword guess from the name and icon (German and English); unknown wording is neutral. The web's
    /// regular expressions are plain alternatives of words, so a substring test is the same rule.
    public static func tone(name: String, icon: String?) -> Tone {
        let s = "\(name) \(icon ?? "")".lowercased()
        func any(_ words: [String]) -> Bool { words.contains { s.contains($0) } }
        if any(["schadstoff", "sonderm", "hazard", "problem", "gift", "toxic", "batter", "elektro", "electro"]) { return .danger }
        if any(["papier", "paper", "karton", "cardboard", "zeitung"]) { return .info }
        if any(["bio", "kompost", "compost", "garten", "garden", "grün", "grun", "green", "organ", "laub", "leaf", "grass"]) {
            return .positive
        }
        if any(["gelb", "yellow", "recycl", "plastik", "plastic", "sack", "verpack", "packaging", "wertstoff", "dsd", "dose",
                "leichtstoff"]) {
            return .warning
        }
        return .neutral
    }

    /// `countdownLabel`: "Today" (also for a count at or below 0, a pickup that has not rolled over yet), "Tomorrow",
    /// "In N days"; nil without a count.
    public static func countdown(_ daysTo: Double?, _ l: Localizer) -> String? {
        guard let d = daysTo else { return nil }
        if d <= 0 { return l.t("waste.today") }
        if d == 1 { return l.t("waste.tomorrow") }
        return l.t("waste.inDays", ["count": .number(d)])
    }

    /// `isWasteSoon`: today or tomorrow.
    public static func isSoon(_ daysTo: Double?) -> Bool { daysTo.map { $0 <= 1 } ?? false }

    /// The bin window shows a date's own type only when it differs from the bin's name (a "(verlegt)" date).
    public static func shownType(_ c: Collection, binName: String) -> String? {
        guard let type = c.type, JSString.trim(type) != binName else { return nil }
        return type
    }
}
