import SwiftUI
import HAPulseKit

/// The colour of a scene tile (web `.scene-tile[data-tone]`): the full colour of the active circle and ring, the ink of
/// the glyph while inactive, the glyph on the full colour.
public enum HPSceneTone: String, Sendable, CaseIterable {
    case yellow, orange, teal, purple, indigo, blue

    var full: GlasColor {
        switch self {
        case .yellow: .yellow
        case .orange: .orange
        case .teal: .teal
        case .purple: .purple
        case .indigo: .indigo
        case .blue: .blue
        }
    }

    var ink: GlasColor {
        switch self {
        case .yellow: .yellowInk
        case .orange: .orangeInk
        case .teal: .tealInk
        case .purple: .purpleInk
        case .indigo: .indigoInk
        case .blue: .blueInk
        }
    }

    var glyph: GlasColor {
        switch self {
        case .yellow, .orange, .teal: .glyphDark
        case .purple, .indigo, .blue: .onBadge
        }
    }
}

/// A scene tile (web `.scene-tile` in Glas, overview, room and scenes page): at least 64 high, radius 22, `tileOff`;
/// active on `tileOn` with the lift shadow, the circle in the tone's colour and a ring around it. Circle 36 (glyph 20),
/// name 600 15/20 `label`, optional line 13/18 `label2` ("Active", "3 devices"). A tap runs the scene.
public struct HPSceneTile: View {
    let icon: String
    let name: String
    let subtitle: String?
    let tone: HPSceneTone
    let isActive: Bool
    let label: String
    let action: () -> Void

    public init(icon: String, name: String, subtitle: String? = nil, tone: HPSceneTone, isActive: Bool, label: String,
                action: @escaping () -> Void) {
        self.icon = icon
        self.name = name
        self.subtitle = subtitle
        self.tone = tone
        self.isActive = isActive
        self.label = label
        self.action = action
    }

    public var body: some View {
        let shape = RoundedRectangle(cornerRadius: 22, style: .continuous)
        Button(action: action) {
            HStack(spacing: 10) {
                ZStack {
                    Circle().fill(isActive ? AnyShapeStyle(.glas(tone.full)) : AnyShapeStyle(.glas(.fill)))
                    HPIcon(icon, size: 20, strokeWidth: 2)
                        .foregroundStyle(.glas(isActive ? tone.glyph : tone.ink))
                    if isActive {
                        Circle().stroke(.glas(tone.full), lineWidth: 2.5).frame(width: 46, height: 46)
                    }
                }
                .frame(width: 36, height: 36)
                VStack(alignment: .leading, spacing: 0) {
                    Text(name).hpText(.subhead, weight: .semibold).foregroundStyle(.glas(.label)).lineLimit(1)
                    if let subtitle {
                        Text(subtitle).hpText(.footnote).foregroundStyle(.glas(.label2)).lineLimit(1)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(.leading, 14)
            .padding(.trailing, 10)
            .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
            .background(isActive ? AnyShapeStyle(.glas(.tileOn)) : AnyShapeStyle(.glas(.tileOff)), in: shape)
            .hpShadow(isActive ? .tileLift : nil)
            .contentShape(shape)
        }
        .buttonStyle(HPPressButtonStyle())
        .accessibilityLabel(label)
        .accessibilityValue(subtitle ?? "")
    }
}
