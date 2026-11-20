import SwiftUI
import HAPulseKit

/// The colour of a swipe action (web `--g-act-*`).
public enum HPSwipeTone: Sendable {
    case delete, ok, neutral

    var style: GlasStyle {
        switch self {
        case .delete: .glas(.actDel)
        case .ok: .glas(.actOk)
        case .neutral: .glas(.actNeutral)
        }
    }
}

/// The thresholds of the web's swipe rows (`swipeMath.ts`).
public enum HPSwipeMath {
    /// The finger has to move this far before the direction is decided; horizontal only if |dx| > |dy|.
    public static let decide: CGFloat = 8
    /// The row follows up to the action width plus this.
    public static let overdrag: CGFloat = 36
    /// Released beyond this share of the action width, the row rests open.
    public static let openShare: CGFloat = 0.45

    /// Where the row rests after a release at `offset` (≤ 0).
    public static func settle(offset: CGFloat, width: CGFloat) -> CGFloat {
        -offset >= width * openShare ? -width : 0
    }

    /// Clamp a dragged offset to 0 … −(width + overdrag).
    public static func clamp(_ offset: CGFloat, width: CGFloat) -> CGFloat {
        min(0, max(offset, -(width + overdrag)))
    }
}

/// Keeps at most one swipe row of a list open (web: opening one closes the other). `HPListGroup` provides one for
/// its rows; rows outside a group are on their own.
@MainActor
@Observable
public final class HPSwipeGroup {
    var openID: UUID?
    public init() {}
}

/// A row that reveals one action when swiped to the left (web `SwipeRow.tsx`): the action runs only on a tap on it,
/// never by pulling through; a tap on the open row closes it. The action is also offered to VoiceOver as a custom
/// action, so the row never depends on the gesture. `disabled` keeps the row closed and drops the action (web
/// `SwipeRow disabled`); `onTap` is the row's own tap, which a tap on the open row replaces by closing it;
/// `children` is `.contain` for rows with their own buttons.
public struct HPSwipeRow<Content: View>: View {
    let actionTitle: String
    let tone: HPSwipeTone
    let width: CGFloat
    let disabled: Bool
    let children: AccessibilityChildBehavior
    let onTap: (() -> Void)?
    let onAction: () -> Void
    let content: Content
    @State private var offset: CGFloat = 0
    @State private var start: CGFloat?
    @State private var id = UUID()
    @Environment(HPSwipeGroup.self) private var group: HPSwipeGroup?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private var settle: Animation? { reduceMotion ? nil : HPMotion.snappy }

    public init(actionTitle: String, tone: HPSwipeTone = .delete, width: CGFloat = 104, disabled: Bool = false,
                children: AccessibilityChildBehavior = .combine, onTap: (() -> Void)? = nil,
                onAction: @escaping () -> Void, @ViewBuilder content: () -> Content) {
        self.actionTitle = actionTitle
        self.tone = tone
        self.width = width
        self.disabled = disabled
        self.children = children
        self.onTap = onTap
        self.onAction = onAction
        self.content = content()
    }

    public var body: some View {
        ZStack(alignment: .trailing) {
            // a plain surface with an explicit Rectangle fill: on iOS 26 `background(style)` here came out rounded
            Text(actionTitle)
                .hpText(.subhead, weight: .semibold)
                .foregroundStyle(.glas(.onBadge))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .padding(.horizontal, 8)
                .frame(width: width)
                .frame(maxWidth: max(-offset, 0), maxHeight: .infinity, alignment: .leading)
                .background { Rectangle().fill(tone.style) }
                .contentShape(Rectangle())
                .onTapGesture {
                    withAnimation(settle) { offset = 0 }
                    onAction()
                }
                .accessibilityHidden(true)
            .opacity(offset < 0 ? 1 : 0)

            content
                .background(.glas(.group))
                // the hit area moves with the row, so the revealed action gets its taps
                .contentShape(Rectangle())
                .offset(x: offset)
                .onTapGesture {
                    if offset != 0 { withAnimation(settle) { offset = 0 } } else { onTap?() }
                }
                // only a sideways drag moves the row; a vertical one keeps scrolling the page
                .hpHorizontalPan(pan)
        }
        .clipped()
        .onChange(of: group?.openID) { _, open in
            // another row of the list opened: close this one
            if open != id, offset != 0 { withAnimation(settle) { offset = 0 } }
        }
        .onChange(of: disabled) { _, off in
            if off, offset != 0 { withAnimation(settle) { offset = 0 } }
        }
        .accessibilityElement(children: children)
        .accessibilityActions {
            if !disabled { Button(actionTitle, action: onAction) }
        }
    }

    private func pan(_ v: HPPanValue) {
        guard !disabled else { start = nil; return }
        switch v.phase {
        case .changed:
            let base = start ?? offset
            start = base
            offset = HPSwipeMath.clamp(base + v.translation, width: width)
        case .ended:
            start = nil
            withAnimation(settle) { offset = HPSwipeMath.settle(offset: offset, width: width) }
            if offset != 0 { group?.openID = id }
        }
    }
}
