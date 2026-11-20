import SwiftUI

/// One option of an `HPSegment`: a text, an icon or both; `accessibilityLabel` is read for icon-only options.
public struct HPSegmentOption<Value: Hashable>: Identifiable {
    public let value: Value
    public let title: String?
    public let icon: String?
    public let accessibilityLabel: String
    public var id: Value { value }

    public init(_ value: Value, title: String? = nil, icon: String? = nil, accessibilityLabel: String? = nil) {
        self.value = value
        self.title = title
        self.icon = icon
        self.accessibilityLabel = accessibilityLabel ?? title ?? ""
    }
}

/// The sizes of the web's segment (`--g-seg-h` / `--g-seg-pad`).
public enum HPSegmentSize: Sendable {
    /// 36 high, lens 2 inside, 600 13/18 `label` (default).
    case regular
    /// 44 high, lens 2 inside (energy, view, settings).
    case large
    /// 44 high, lens 3 inside, unchosen `label2` 400 15/20, chosen `label` 600 (pool, battery).
    case quiet
    /// 44 high, lens 3 inside, 600 13/18, unchosen `label2` (detail history range).
    case detail

    var height: CGFloat { self == .regular ? 36 : 44 }
    var pad: CGFloat { self == .quiet || self == .detail ? 3 : 2 }
}

/// The segmented control of the style Glas (web `Segment.tsx`): `fill` capsule, a `seg` lens with its shadow slides
/// under the chosen option (snappy). Options share the width. VoiceOver reads each option as a button with the
/// "selected" trait, like the web's radio group.
public struct HPSegment<Value: Hashable>: View {
    let options: [HPSegmentOption<Value>]
    @Binding var selection: Value
    let size: HPSegmentSize
    /// The track grows with the text size (Dynamic Type); 36/44 at the default size.
    @ScaledMetric(relativeTo: .footnote) private var scale: CGFloat = 1

    public init(_ options: [HPSegmentOption<Value>], selection: Binding<Value>, size: HPSegmentSize = .regular) {
        self.options = options
        self._selection = selection
        self.size = size
    }

    private var index: Int { options.firstIndex { $0.value == selection } ?? 0 }

    public var body: some View {
        GeometryReader { geo in
            let pad = size.pad
            let width = (geo.size.width - pad * 2) / CGFloat(max(options.count, 1))
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(.glas(.seg))
                    .hpShadow(.seg)
                    .frame(width: width, height: geo.size.height - pad * 2)
                    .offset(x: pad + width * CGFloat(index))
                    .hpAnimation(HPMotion.snappy, value: index)
                    .accessibilityHidden(true)
                HStack(spacing: 0) {
                    ForEach(options) { option in
                        segmentButton(option, width: width)
                    }
                }
                .padding(.horizontal, pad)
            }
        }
        .frame(height: size.height * max(scale, 1))
        .background(.glas(.fill), in: Capsule())
        .accessibilityElement(children: .contain)
    }

    private func segmentButton(_ option: HPSegmentOption<Value>, width: CGFloat) -> some View {
        let chosen = option.value == selection
        let quietStyle = size == .quiet || size == .detail
        let text: AnyShapeStyle = quietStyle && !chosen ? AnyShapeStyle(.glas(.label2)) : AnyShapeStyle(.glas(.label))
        return Button {
            selection = option.value
        } label: {
            HStack(spacing: 4) {
                if let icon = option.icon {
                    HPIcon(icon, size: 18, strokeWidth: 2)
                }
                if let title = option.title {
                    Group {
                        if size == .quiet {
                            Text(title).hpText(.subhead, weight: chosen ? .semibold : .regular)
                        } else {
                            Text(title).hpText(.footnote, weight: .semibold)
                        }
                    }
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                }
            }
            .foregroundStyle(text)
            .padding(.horizontal, 4)
            .frame(width: width)
            .frame(maxHeight: .infinity)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(option.accessibilityLabel)
        .accessibilityAddTraits(chosen ? .isSelected : [])
    }
}
