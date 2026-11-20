import SwiftUI

/// The three springs of the style Glas (docs/glas/glas-tokens.json → motion.springs). The web draws them as `linear()`
/// curves; SwiftUI springs with the same duration and overshoot come closest.
public enum HPMotion {
    /// 0.5 s, no overshoot: sheets, page push, press release, inspector.
    public static let smooth = Animation.spring(duration: 0.5, bounce: 0)
    /// 0.35 s, about 4 % overshoot: lenses, segments, switches, menus, swipe reset.
    public static let snappy = Animation.spring(duration: 0.35, bounce: 0.15)
    /// 0.6 s, livelier: confirmations.
    public static let bouncy = Animation.spring(duration: 0.6, bounce: 0.3)
}

extension View {
    /// `animation(_:value:)` that is switched off with "Reduce Motion" (the web's `prefers-reduced-motion`).
    public func hpAnimation<V: Equatable>(_ animation: Animation, value: V) -> some View {
        modifier(HPReducedMotionAnimation(animation: animation, value: value))
    }

    /// Scales down a little while pressed (web: `scale(.97)` over 90–120 ms), not with "Reduce Motion".
    public func hpPressScale(_ pressed: Bool, to scale: CGFloat = 0.97) -> some View {
        modifier(HPPressScale(pressed: pressed, scale: scale))
    }
}

struct HPReducedMotionAnimation<V: Equatable>: ViewModifier {
    let animation: Animation
    let value: V
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content.animation(reduceMotion ? nil : animation, value: value)
    }
}

struct HPPressScale: ViewModifier {
    let pressed: Bool
    let scale: CGFloat
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content
            .scaleEffect(pressed && !reduceMotion ? scale : 1)
            .animation(.easeOut(duration: 0.12), value: pressed)
    }
}

/// A button style that only adds the Glas press feedback (scale), the look stays with the label.
public struct HPPressButtonStyle: ButtonStyle {
    let scale: CGFloat
    public init(scale: CGFloat = 0.97) { self.scale = scale }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label.hpPressScale(configuration.isPressed, to: scale)
    }
}
