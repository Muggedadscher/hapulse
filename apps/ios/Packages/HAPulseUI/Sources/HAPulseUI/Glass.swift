import SwiftUI

/// The one entry point to the system's Liquid Glass. Everything glass in the app goes through here, so a fallback
/// material (an older iOS, "reduce transparency") is a change in this file only.
public enum HPGlassKind: Sendable {
    /// Floating controls: tab bar, capsules, buttons on top of content.
    case regular
    /// Clear glass over pictures (camera stage).
    case clear
}

extension View {
    public func hpGlass<S: Shape>(_ kind: HPGlassKind = .regular, in shape: S, tint: Color? = nil, interactive: Bool = false) -> some View {
        var glass: Glass = kind == .clear ? .clear : .regular
        if let tint { glass = glass.tint(tint) }
        if interactive { glass = glass.interactive() }
        return self.glassEffect(glass, in: shape)
    }
}

/// A content card of the style Glas: opaque `card` surface (the web uses glass only for the functional layer), radius
/// 26, padding 16.
public struct HPCard<Content: View>: View {
    let content: Content
    public init(@ViewBuilder content: () -> Content) { self.content = content() }

    public var body: some View {
        content
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.glas(.card), in: RoundedRectangle(cornerRadius: 26, style: .continuous))
    }
}
