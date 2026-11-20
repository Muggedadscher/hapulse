import SwiftUI
import HAPulseKit

/// A colour family of the style Glas, as the web uses it for device states (light yellow, fan teal, heat orange …):
/// the full colour, its text-safe ink, a soft background and the glyph colour on the full colour (§2.5: no white on
/// yellow/orange, white glyphs only on blue/red).
public enum HPTone: Sendable, Hashable, CaseIterable {
    case yellow, orange, teal, green, blue, red, accent

    /// The full colour (filled circles, chart area, slider fill).
    public var fill: AnyShapeStyle {
        switch self {
        case .yellow: AnyShapeStyle(.glas(.yellow))
        case .orange: AnyShapeStyle(.glas(.orange))
        case .teal: AnyShapeStyle(.glas(.teal))
        case .green: AnyShapeStyle(.glas(.green))
        case .blue: AnyShapeStyle(.glas(.blue))
        case .red: AnyShapeStyle(.glas(.red))
        case .accent: AnyShapeStyle(.accentPart(.accent))
        }
    }

    /// Text and line colour with enough contrast on cards (4.5:1).
    public var ink: AnyShapeStyle {
        switch self {
        case .yellow: AnyShapeStyle(.glas(.yellowInk))
        case .orange: AnyShapeStyle(.glas(.orangeInk))
        case .teal: AnyShapeStyle(.glas(.tealInk))
        case .green: AnyShapeStyle(.glas(.greenInk))
        case .blue: AnyShapeStyle(.glas(.blueInk))
        case .red: AnyShapeStyle(.glas(.redInk))
        case .accent: AnyShapeStyle(.accentPart(.accentInk))
        }
    }

    /// Soft background (chips, pills); never directly on `bg`.
    public var soft: AnyShapeStyle {
        switch self {
        case .yellow: AnyShapeStyle(.glas(.yellowSoft))
        case .orange: AnyShapeStyle(.glas(.orangeSoft))
        case .teal: AnyShapeStyle(.glas(.tealSoft))
        case .green: AnyShapeStyle(.glas(.greenSoft))
        case .blue: AnyShapeStyle(.glas(.blueSoft))
        case .red: AnyShapeStyle(.glas(.redSoft))
        case .accent: AnyShapeStyle(.accentPart(.accentSoft))
        }
    }

    /// The glyph on `fill`.
    public var glyph: AnyShapeStyle {
        switch self {
        case .blue, .red: AnyShapeStyle(.glas(.onBadge))
        case .accent: AnyShapeStyle(.accentPart(.onProminent))
        default: AnyShapeStyle(.glas(.glyphDark))
        }
    }
}
