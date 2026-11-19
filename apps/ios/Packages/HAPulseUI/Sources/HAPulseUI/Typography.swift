import SwiftUI

/// Text styles of the style Glas (docs/glas/glas-tokens.json → typography): size/line height/weight in points, system
/// font (SF) like the web, figures tabular.
public enum HPText: Sendable, CaseIterable {
    case largeTitle, greetingPhone, title1, title2, title3, headline, body, callout, subhead, footnote, caption1, caption2
    case figure, weatherHero, keypad

    var spec: (size: CGFloat, line: CGFloat, weight: Font.Weight, tracking: CGFloat) {
        switch self {
        case .largeTitle: (34, 41, .bold, 0.37)
        case .greetingPhone: (30, 36, .bold, 0.2)
        case .title1: (28, 34, .bold, 0.2)
        case .title2: (22, 28, .bold, 0)
        case .title3: (20, 25, .semibold, 0)
        case .headline: (17, 22, .semibold, 0)
        case .body: (17, 22, .regular, 0)
        case .callout: (16, 21, .regular, 0)
        case .subhead: (15, 20, .regular, 0)
        case .footnote: (13, 18, .regular, 0)
        case .caption1: (12, 16, .regular, 0)
        case .caption2: (11, 13, .semibold, 0)
        case .figure: (34, 41, .semibold, 0)
        case .weatherHero: (48, 54, .bold, 0)
        case .keypad: (30, 36, .regular, 0)
        }
    }
}

extension HPText {
    /// The system text style that scales like this one with the user's text size (Dynamic Type).
    var relativeTo: Font.TextStyle {
        switch self {
        case .largeTitle, .figure, .weatherHero: .largeTitle
        case .greetingPhone, .title1, .keypad: .title
        case .title2: .title2
        case .title3: .title3
        case .headline: .headline
        case .body: .body
        case .callout: .callout
        case .subhead: .subheadline
        case .footnote: .footnote
        case .caption1: .caption
        case .caption2: .caption2
        }
    }
}

/// Size, line height and tracking scale with the user's text size; the token values are the default size.
struct HPTextModifier: ViewModifier {
    let weight: Font.Weight
    let tracking: CGFloat
    @ScaledMetric var size: CGFloat
    @ScaledMetric var line: CGFloat

    init(_ style: HPText, weight: Font.Weight?) {
        let s = style.spec
        self.weight = weight ?? s.weight
        self.tracking = s.tracking
        _size = ScaledMetric(wrappedValue: s.size, relativeTo: style.relativeTo)
        _line = ScaledMetric(wrappedValue: s.line, relativeTo: style.relativeTo)
    }

    func body(content: Content) -> some View {
        content
            .font(.system(size: size, weight: weight).monospacedDigit())
            .tracking(tracking)
            .lineSpacing(max(0, line - size * 1.2))
    }
}

extension View {
    /// Font, tracking and line height of a Glas text style; `weight` overrides the style's weight (e.g. 600 emphasis).
    /// Scales with Dynamic Type.
    public func hpText(_ style: HPText, weight: Font.Weight? = nil) -> some View {
        modifier(HPTextModifier(style, weight: weight))
    }
}
