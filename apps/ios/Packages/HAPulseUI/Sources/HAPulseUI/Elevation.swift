import SwiftUI

/// Shadows of the style Glas (docs/glas/glas-tokens.json → elevation). The generator leaves shadows out of
/// `GlasColors` (they are not plain colours), so the few the building blocks need are transcribed here, in one place;
/// views use `.hpShadow(_:)` and never write shadow values themselves.
public enum HPElevation: Sendable {
    /// Switch and slider knob: `0 3px 8px rgba(0,0,0,.15), 0 1px 1px rgba(0,0,0,.16)`, light and dark.
    case knob
    /// Segment lens: light `0 3px 8px rgba(0,0,0,.12), 0 .5px 0 rgba(0,0,0,.04)`, dark `0 3px 8px rgba(0,0,0,.30)`.
    case seg
    /// A device tile that is on: light `0 1px 2px rgba(0,0,0,.04), 0 4px 14px rgba(0,0,0,.06)`, dark none.
    case tileLift
    /// Content card: light `0 .5px 1px rgba(0,0,0,.04)`, dark none.
    case card

    struct Layer {
        let opacity: Double
        let radius: CGFloat
        let y: CGFloat
    }

    /// CSS blur is about twice SwiftUI's shadow radius.
    func layers(dark: Bool) -> [Layer] {
        switch self {
        case .knob: [Layer(opacity: 0.15, radius: 4, y: 3), Layer(opacity: 0.16, radius: 0.5, y: 1)]
        case .seg: dark ? [Layer(opacity: 0.30, radius: 4, y: 3)] : [Layer(opacity: 0.12, radius: 4, y: 3), Layer(opacity: 0.04, radius: 0, y: 0.5)]
        case .tileLift: dark ? [] : [Layer(opacity: 0.04, radius: 1, y: 1), Layer(opacity: 0.06, radius: 7, y: 4)]
        case .card: dark ? [] : [Layer(opacity: 0.04, radius: 0.5, y: 0.5)]
        }
    }
}

struct HPShadowModifier: ViewModifier {
    let elevation: HPElevation?
    @Environment(\.colorScheme) private var scheme

    func body(content: Content) -> some View {
        let layers = elevation?.layers(dark: scheme == .dark) ?? []
        let a = layers.count > 0 ? layers[0] : nil
        let b = layers.count > 1 ? layers[1] : nil
        content
            .shadow(color: .black.opacity(a?.opacity ?? 0), radius: a?.radius ?? 0, y: a?.y ?? 0)
            .shadow(color: .black.opacity(b?.opacity ?? 0), radius: b?.radius ?? 0, y: b?.y ?? 0)
    }
}

extension View {
    /// A Glas shadow; `nil` = none (keeps the view identity when a tile switches between on and off).
    public func hpShadow(_ elevation: HPElevation?) -> some View {
        modifier(HPShadowModifier(elevation: elevation))
    }
}
