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

/// A row that reveals one action when swiped to the left (web `SwipeRow.tsx`): the action runs only on a tap on it,
/// never by pulling through; a tap on the open row closes it. The action is also offered to VoiceOver as a custom
/// action, so the row never depends on the gesture.
public struct HPSwipeRow<Content: View>: View {
    let actionTitle: String
    let tone: HPSwipeTone
    let width: CGFloat
    let onAction: () -> Void
    let content: Content
    @State private var offset: CGFloat = 0
    @State private var start: CGFloat?
    @State private var horizontal: Bool?

    public init(actionTitle: String, tone: HPSwipeTone = .delete, width: CGFloat = 104, onAction: @escaping () -> Void,
                @ViewBuilder content: () -> Content) {
        self.actionTitle = actionTitle
        self.tone = tone
        self.width = width
        self.onAction = onAction
        self.content = content()
    }

    public var body: some View {
        ZStack(alignment: .trailing) {
            Button {
                withAnimation(HPMotion.snappy) { offset = 0 }
                onAction()
            } label: {
                Text(actionTitle)
                    .hpText(.subhead, weight: .semibold)
                    .foregroundStyle(.glas(.onBadge))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .padding(.horizontal, 8)
                    .frame(width: width)
                    .frame(maxWidth: max(-offset, 0), maxHeight: .infinity, alignment: .leading)
                    .background(tone.style)
            }
            .buttonStyle(.plain)
            .accessibilityHidden(true)
            .opacity(offset < 0 ? 1 : 0)

            content
                .background(.glas(.group))
                .offset(x: offset)
                .contentShape(Rectangle())
                .onTapGesture {
                    if offset != 0 { withAnimation(HPMotion.snappy) { offset = 0 } }
                }
                .gesture(drag)
        }
        .clipped()
        .accessibilityElement(children: .combine)
        .accessibilityAction(named: actionTitle, onAction)
    }

    private var drag: some Gesture {
        DragGesture(minimumDistance: HPSwipeMath.decide)
            .onChanged { g in
                if horizontal == nil {
                    horizontal = abs(g.translation.width) > abs(g.translation.height)
                }
                guard horizontal == true else { return }
                let base = start ?? offset
                start = base
                offset = HPSwipeMath.clamp(base + g.translation.width, width: width)
            }
            .onEnded { _ in
                defer { start = nil; horizontal = nil }
                guard horizontal == true else { return }
                withAnimation(HPMotion.snappy) { offset = HPSwipeMath.settle(offset: offset, width: width) }
            }
    }
}
