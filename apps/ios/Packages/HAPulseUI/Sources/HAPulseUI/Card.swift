import SwiftUI

/// The title row above a card (web `.g-card-head`): at least 44 high, title 600 20/25 `label`, optional icon 18
/// `label2` and a trailing link 15/20 `label2`.
public struct HPCardHead: View {
    let title: String
    let icon: String?
    let link: String?
    let action: (() -> Void)?

    public init(_ title: String, icon: String? = nil, link: String? = nil, action: (() -> Void)? = nil) {
        self.title = title
        self.icon = icon
        self.link = link
        self.action = action
    }

    public var body: some View {
        HStack(spacing: 8) {
            if let icon {
                HPIcon(icon, size: 18, strokeWidth: 2).foregroundStyle(.glas(.label2))
            }
            Text(title)
                .hpText(.title3)
                .foregroundStyle(.glas(.label))
                .accessibilityAddTraits(.isHeader)
            Spacer(minLength: 8)
            if let link, let action {
                Button(action: action) {
                    HStack(spacing: 2) {
                        Text(link).hpText(.subhead)
                        HPIcon("lucide.chevron-right", size: 16, strokeWidth: 2)
                    }
                    .foregroundStyle(.glas(.label2))
                    .frame(minHeight: 44)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .frame(minHeight: 44)
    }
}

/// A head and its card, 6 points apart (web: card surface starts 44 + 6 below the head).
public struct HPSection<Content: View>: View {
    let head: HPCardHead
    let content: Content

    public init(_ head: HPCardHead, @ViewBuilder content: () -> Content) {
        self.head = head
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            head
            HPCard { content }
        }
    }
}

/// An inset grouped list (web `.g-group`): `group` surface, radius 22, rows without padding of their own, a hairline
/// `sep` between rows that starts at `separatorInset` (16 without, 60 with a leading circle) and none after the last.
public struct HPListGroup<Content: View>: View {
    let separatorInset: CGFloat
    let content: Content

    public init(separatorInset: CGFloat = 16, @ViewBuilder content: () -> Content) {
        self.separatorInset = separatorInset
        self.content = content()
    }

    public var body: some View {
        VStack(spacing: 0) {
            Group(subviews: content) { rows in
                ForEach(Array(rows.enumerated()), id: \.offset) { index, row in
                    VStack(spacing: 0) {
                        if index > 0 {
                            Rectangle()
                                .fill(.glas(.sep))
                                .frame(height: 0.5)
                                .padding(.leading, separatorInset)
                                .accessibilityHidden(true)
                        }
                        row
                    }
                }
            }
        }
        .background(.glas(.group), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}

/// A row of an `HPListGroup`: optional leading circle 32 (glyph 18), name 400 17/22 `label`, secondary 13/18 `label2`,
/// a trailing view; at least 44 high, 16 inside.
public struct HPListRow<Trailing: View>: View {
    let icon: String?
    let tone: HPTone?
    let title: String
    let subtitle: String?
    let minHeight: CGFloat
    let trailing: Trailing

    public init(_ title: String, subtitle: String? = nil, icon: String? = nil, tone: HPTone? = nil, minHeight: CGFloat = 44,
                @ViewBuilder trailing: () -> Trailing) {
        self.title = title
        self.subtitle = subtitle
        self.icon = icon
        self.tone = tone
        self.minHeight = minHeight
        self.trailing = trailing()
    }

    public var body: some View {
        HStack(spacing: 12) {
            if let icon {
                ZStack {
                    Circle().fill(tone?.fill ?? AnyShapeStyle(.glas(.fill)))
                    HPIcon(icon, size: 18, strokeWidth: 2)
                        .foregroundStyle(tone?.glyph ?? AnyShapeStyle(.glas(.label2)))
                }
                .frame(width: 32, height: 32)
                .accessibilityHidden(true)
            }
            VStack(alignment: .leading, spacing: 1) {
                Text(title).hpText(.body).foregroundStyle(.glas(.label))
                if let subtitle {
                    Text(subtitle).hpText(.footnote).foregroundStyle(.glas(.label2))
                }
            }
            Spacer(minLength: 8)
            trailing
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 6)
        .frame(minHeight: minHeight)
        .accessibilityElement(children: .combine)
    }
}

extension HPListRow where Trailing == EmptyView {
    public init(_ title: String, subtitle: String? = nil, icon: String? = nil, tone: HPTone? = nil, minHeight: CGFloat = 44) {
        self.init(title, subtitle: subtitle, icon: icon, tone: tone, minHeight: minHeight) { EmptyView() }
    }
}
