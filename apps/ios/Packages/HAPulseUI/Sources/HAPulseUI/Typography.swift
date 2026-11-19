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

extension View {
    /// Font, tracking and line height of a Glas text style; `weight` overrides the style's weight (e.g. 600 emphasis).
    public func hpText(_ style: HPText, weight: Font.Weight? = nil) -> some View {
        let s = style.spec
        return self
            .font(.system(size: s.size, weight: weight ?? s.weight).monospacedDigit())
            .tracking(s.tracking)
            .lineSpacing(max(0, s.line - s.size * 1.2))
    }
}
