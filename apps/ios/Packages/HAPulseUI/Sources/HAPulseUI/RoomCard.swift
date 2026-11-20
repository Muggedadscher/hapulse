import SwiftUI
import HAPulseKit

/// The tone of a room card (web `.g-room[data-tone]`).
public enum HPRoomCardTone: Sendable, Hashable {
    /// a light is on: yellow circle, dark glyph
    case on
    /// open window or door: `warnSoft` circle with `warnInk`, a 1.5 ring in `warnSoft`
    case warn
    /// open gate, water, smoke: `redSoft` circle with `redInk`, a 1.5 ring in `redSoft`
    case alarm
}

/// A room card of the overview (web `.g-room` in Glas, phone): at least 96 high, radius 22, on `card` with its shadow;
/// on top the name 600 17/22, below a circle 26 (glyph 15) and two lines 13/18 `label2` (a status in line 2: `label`,
/// 600). A tap opens the room.
public struct HPRoomCard: View {
    let name: String
    let icon: String
    let line1: String
    let line2: String?
    let line2IsStatus: Bool
    let tone: HPRoomCardTone?
    let label: String
    let action: () -> Void

    public init(name: String, icon: String, line1: String, line2: String?, line2IsStatus: Bool, tone: HPRoomCardTone?,
                label: String, action: @escaping () -> Void) {
        self.name = name
        self.icon = icon
        self.line1 = line1
        self.line2 = line2
        self.line2IsStatus = line2IsStatus
        self.tone = tone
        self.label = label
        self.action = action
    }

    private var circle: (AnyShapeStyle, AnyShapeStyle) {
        switch tone {
        case .on: (AnyShapeStyle(.glas(.yellow)), AnyShapeStyle(.glas(.glyphDark)))
        case .warn: (AnyShapeStyle(.glas(.warnSoft)), AnyShapeStyle(.glas(.warnInk)))
        case .alarm: (AnyShapeStyle(.glas(.redSoft)), AnyShapeStyle(.glas(.redInk)))
        case nil: (AnyShapeStyle(.glas(.fill)), AnyShapeStyle(.glas(.label2)))
        }
    }

    public var body: some View {
        let shape = RoundedRectangle(cornerRadius: 22, style: .continuous)
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                Text(name).hpText(.headline).foregroundStyle(.glas(.label)).lineLimit(1)
                Spacer(minLength: 0)
                HStack(spacing: 8) {
                    ZStack {
                        Circle().fill(circle.0)
                        HPIcon(icon, size: 15, strokeWidth: 2).foregroundStyle(circle.1)
                    }
                    .frame(width: 26, height: 26)
                    VStack(alignment: .leading, spacing: 0) {
                        Text(line1).hpText(.footnote).foregroundStyle(.glas(.label2)).monospacedDigit().lineLimit(1)
                        if let line2 {
                            Text(line2)
                                .hpText(.footnote, weight: line2IsStatus ? .semibold : nil)
                                .foregroundStyle(line2IsStatus ? AnyShapeStyle(.glas(.label)) : AnyShapeStyle(.glas(.label2)))
                                .monospacedDigit()
                                .lineLimit(1)
                        }
                    }
                }
            }
            .padding(EdgeInsets(top: 13, leading: 16, bottom: 12, trailing: 12))
            .frame(maxWidth: .infinity, minHeight: 96, alignment: .leading)
            .background(.glas(.card), in: shape)
            .overlay {
                switch tone {
                case .warn: shape.strokeBorder(.glas(.warnSoft), lineWidth: 1.5)
                case .alarm: shape.strokeBorder(.glas(.redSoft), lineWidth: 1.5)
                default: EmptyView()
                }
            }
            .hpShadow(.card)
            .contentShape(shape)
        }
        .buttonStyle(HPPressButtonStyle())
        .accessibilityLabel(label)
    }
}
