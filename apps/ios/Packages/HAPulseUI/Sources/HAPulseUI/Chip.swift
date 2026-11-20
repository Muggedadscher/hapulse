import SwiftUI

/// How a status chip shows its state (web `.summary-chip`).
public enum HPChipState: Sendable, Hashable {
    /// Neutral: icon `label2`.
    case normal
    /// Something is on: icon (and only the icon) in the tone's ink, e.g. lights yellow.
    case active(HPTone)
    /// Needs attention: text and icon `warnInk`, count 600.
    case alert
    /// Danger: text and icon `redInk`, count 600.
    case danger
}

/// A status chip of the overview's summary row: 44 high capsule on `card`, icon 18, text 15/20.
public struct HPStatusChip: View {
    let icon: String
    let text: String
    let state: HPChipState
    let action: (() -> Void)?

    public init(icon: String, text: String, state: HPChipState = .normal, action: (() -> Void)? = nil) {
        self.icon = icon
        self.text = text
        self.state = state
        self.action = action
    }

    private var iconStyle: AnyShapeStyle {
        switch state {
        case .normal: AnyShapeStyle(.glas(.label2))
        case .active(let tone): tone.ink
        case .alert: AnyShapeStyle(.glas(.warnInk))
        case .danger: AnyShapeStyle(.glas(.redInk))
        }
    }

    private var textStyle: AnyShapeStyle {
        switch state {
        case .normal, .active: AnyShapeStyle(.glas(.label))
        case .alert: AnyShapeStyle(.glas(.warnInk))
        case .danger: AnyShapeStyle(.glas(.redInk))
        }
    }

    private var emphasised: Bool {
        switch state {
        case .alert, .danger: true
        default: false
        }
    }

    public var body: some View {
        let label = HStack(spacing: 8) {
            HPIcon(icon, size: 18, strokeWidth: 2).foregroundStyle(iconStyle)
            Text(text)
                .hpText(.subhead, weight: emphasised ? .semibold : nil)
                .foregroundStyle(textStyle)
                .lineLimit(1)
        }
        .padding(.leading, 13)
        .padding(.trailing, 16)
        .frame(minHeight: 44)
        .background(.glas(.card), in: Capsule())
        .contentShape(Capsule())

        if let action {
            Button(action: action) { label }.buttonStyle(HPPressButtonStyle())
        } else {
            label.accessibilityElement(children: .combine)
        }
    }
}

/// A choice pill (web `.climate-card__mode-pill`): at least 36 high, `fill`; chosen = `accentSoft` with a 1.5 accent
/// ring and `accentInk` text. Selected state is announced to VoiceOver.
public struct HPChoicePill: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    public init(_ title: String, isSelected: Bool, action: @escaping () -> Void) {
        self.title = title
        self.isSelected = isSelected
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Text(title)
                .hpText(.subhead, weight: isSelected ? .semibold : nil)
                .foregroundStyle(isSelected ? AnyShapeStyle(.accentPart(.accentInk)) : AnyShapeStyle(.glas(.label)))
                .padding(.horizontal, 14)
                .frame(minHeight: 36)
                .background(isSelected ? AnyShapeStyle(.accentPart(.accentSoft)) : AnyShapeStyle(.glas(.fill)), in: Capsule())
                .overlay {
                    if isSelected { Capsule().strokeBorder(.accentPart(.accent), lineWidth: 1.5) }
                }
                .frame(minHeight: 44)
                .contentShape(Capsule())
        }
        .buttonStyle(HPPressButtonStyle())
        .hpAnimation(.easeOut(duration: 0.2), value: isSelected)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

/// How loud a status pill is (web `.motion-list__pill`).
public enum HPPillKind: Sendable, Hashable {
    /// `fill`, `label2` text, green dot.
    case quiet
    /// `warnSoft` / `warnInk`, 600.
    case active
    /// `redSoft` / `redInk`, 600.
    case danger
}

/// A small status pill: 26 high, 13/18 text, a 7 dot.
public struct HPStatusPill: View {
    let text: String
    let kind: HPPillKind

    public init(_ text: String, kind: HPPillKind = .quiet) {
        self.text = text
        self.kind = kind
    }

    public var body: some View {
        let (bg, fg, dot): (AnyShapeStyle, AnyShapeStyle, AnyShapeStyle) = switch kind {
        case .quiet: (AnyShapeStyle(.glas(.fill)), AnyShapeStyle(.glas(.label2)), AnyShapeStyle(.glas(.green)))
        case .active: (AnyShapeStyle(.glas(.warnSoft)), AnyShapeStyle(.glas(.warnInk)), AnyShapeStyle(.glas(.warnInk)))
        case .danger: (AnyShapeStyle(.glas(.redSoft)), AnyShapeStyle(.glas(.redInk)), AnyShapeStyle(.glas(.redInk)))
        }
        HStack(spacing: 5) {
            Circle().fill(dot).frame(width: 7, height: 7).accessibilityHidden(true)
            Text(text).hpText(.footnote, weight: kind == .quiet ? nil : .semibold).lineLimit(1)
        }
        .foregroundStyle(fg)
        .padding(.horizontal, 10)
        .frame(minHeight: 26)
        .background(bg, in: Capsule())
        .accessibilityElement(children: .combine)
    }
}
