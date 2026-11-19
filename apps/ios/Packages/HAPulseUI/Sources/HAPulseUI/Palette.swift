import SwiftUI
import HAPulseKit

extension Color {
    /// A colour of the web's table (channels 0…255, alpha 0…1), in sRGB like the CSS.
    public init(_ c: RGBA) {
        self.init(.sRGB, red: c.r / 255, green: c.g / 255, blue: c.b / 255, opacity: c.a)
    }
}

/// A colour of the style Glas that follows light/dark like the web's CSS variables (`--g-*`).
public struct GlasStyle: ShapeStyle {
    public let key: GlasColor
    public init(_ key: GlasColor) { self.key = key }

    public func resolve(in environment: EnvironmentValues) -> Color {
        Color(key.value(dark: environment.colorScheme == .dark))
    }
}

extension ShapeStyle where Self == GlasStyle {
    /// `.foregroundStyle(.glas(.label))`
    public static func glas(_ key: GlasColor) -> GlasStyle { GlasStyle(key) }
}

/// The parts of the accent family (`GlasAccent`).
public enum AccentPart: Sendable {
    case accent, accentInk, tabInk, accentSoft, prominent, onProminent, onAccentInk, focus
}

extension EnvironmentValues {
    /// The admin's accent hue (setting `accentHue`); nil = the default iOS orange.
    @Entry public var glasAccentHue: Double? = nil
}

/// An accent colour that follows light/dark and the accent hue in the environment.
public struct AccentStyle: ShapeStyle {
    public let part: AccentPart
    public init(_ part: AccentPart) { self.part = part }

    public func resolve(in environment: EnvironmentValues) -> Color {
        let a = GlasAccent.make(hue: environment.glasAccentHue, mode: environment.colorScheme == .dark ? .dark : .light)
        let css: String
        switch part {
        case .accent: css = a.accent
        case .accentInk: css = a.accentInk
        case .tabInk: css = a.tabInk
        case .accentSoft: css = a.accentSoft
        case .prominent: css = a.prominent
        case .onProminent: css = a.onProminent
        case .onAccentInk: css = a.onAccentInk
        case .focus: css = a.focus
        }
        return Color(RGBA(css: css) ?? RGBA(255, 149, 0))
    }
}

extension ShapeStyle where Self == AccentStyle {
    /// `.foregroundStyle(.accentPart(.accentInk))`
    public static func accentPart(_ part: AccentPart) -> AccentStyle { AccentStyle(part) }
}
