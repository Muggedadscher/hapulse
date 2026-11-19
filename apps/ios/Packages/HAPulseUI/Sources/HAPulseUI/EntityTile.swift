import SwiftUI

/// A device tile of the overview (web `.g-device`, phone): 76 high, radius 22; off on `tileOff` without shadow, on on
/// `tileOn` with the lift shadow. Left the 36 circle (hit area 44) that switches; the rest opens the detail.
/// Texts: room 12/16 `label2`, name 600 15/20 (off `tileOffLabel`), state 13/18 `label2`.
public struct HPDeviceTile: View {
    let icon: String
    let room: String?
    let name: String
    let state: String
    let isOn: Bool
    let tone: HPTone
    let toggleLabel: String
    let openLabel: String
    let onToggle: () -> Void
    let onOpen: () -> Void
    @State private var pulse = false

    /// - Parameters:
    ///   - toggleLabel: VoiceOver name of the switch circle (web `home.favorites.toggleAria`)
    ///   - openLabel: VoiceOver name of the open button (web `glas.devices.detailAria`)
    public init(icon: String, room: String? = nil, name: String, state: String, isOn: Bool, tone: HPTone = .yellow,
                toggleLabel: String, openLabel: String, onToggle: @escaping () -> Void, onOpen: @escaping () -> Void) {
        self.icon = icon
        self.room = room
        self.name = name
        self.state = state
        self.isOn = isOn
        self.tone = tone
        self.toggleLabel = toggleLabel
        self.openLabel = openLabel
        self.onToggle = onToggle
        self.onOpen = onOpen
    }

    public var body: some View {
        let shape = RoundedRectangle(cornerRadius: 22, style: .continuous)
        HStack(spacing: 0) {
            Button {
                pulse.toggle()
                onToggle()
            } label: {
                ZStack {
                    Circle().fill(isOn ? tone.fill : AnyShapeStyle(.glas(.fill)))
                    HPIcon(icon, size: 20, strokeWidth: 1.75)
                        .foregroundStyle(isOn ? tone.glyph : AnyShapeStyle(.glas(.label2)))
                }
                .frame(width: 36, height: 36)
                .phaseAnimator([1.0, 1.12, 1.0], trigger: pulse) { view, scale in
                    view.scaleEffect(scale)
                } animation: { _ in .timingCurve(0.3, 0, 0.2, 1, duration: 0.35) }
                .frame(width: 44, height: 44)
                .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .hpAnimation(.easeInOut(duration: 0.3), value: isOn)
            .accessibilityLabel(toggleLabel)
            .accessibilityAddTraits(isOn ? [.isToggle, .isSelected] : .isToggle)

            Button(action: onOpen) {
                VStack(alignment: .leading, spacing: 0) {
                    if let room {
                        Text(room).hpText(.caption1).foregroundStyle(.glas(.label2)).lineLimit(1)
                    }
                    Text(name)
                        .hpText(.subhead, weight: .semibold)
                        .foregroundStyle(isOn ? AnyShapeStyle(.glas(.label)) : AnyShapeStyle(.glas(.tileOffLabel)))
                        .lineLimit(1)
                    Text(state).hpText(.footnote).foregroundStyle(.glas(.label2)).lineLimit(1)
                }
                .padding(.leading, 6)
                .padding(.trailing, 10)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(openLabel)
        }
        .padding(.leading, 6)
        .frame(minHeight: 76)
        .background(isOn ? AnyShapeStyle(.glas(.tileOn)) : AnyShapeStyle(.glas(.tileOff)), in: shape)
        .hpShadow(isOn ? .tileLift : nil)
        .hpAnimation(.easeInOut(duration: 0.35), value: isOn)
        .accessibilityElement(children: .contain)
    }
}

/// How the icon chip of a room tile is coloured (web `--g-chip` / `--g-chip-glyph`).
public enum HPChipTone: Sendable, Hashable {
    /// `fill` / `label2`.
    case neutral
    /// The tone's full colour with its glyph (light on: yellow / glyphDark).
    case lit(HPTone)
    /// The tone's soft background with its ink (locked: green; open: red; info: warn).
    case soft(HPTone)
    /// `warnSoft` / `warnInk`.
    case warn
}

/// A tile of the room page (web `.room-page .card`): `card`, radius 22, icon chip 36 with a 20 glyph, name 600 15/20,
/// state 13/18 `label2`; 70 high. Tapping it runs `action` (switch or open).
public struct HPRoomTile: View {
    let icon: String
    let name: String
    let state: String
    let chip: HPChipTone
    let action: () -> Void

    public init(icon: String, name: String, state: String, chip: HPChipTone = .neutral, action: @escaping () -> Void) {
        self.icon = icon
        self.name = name
        self.state = state
        self.chip = chip
        self.action = action
    }

    private var chipColors: (AnyShapeStyle, AnyShapeStyle) {
        switch chip {
        case .neutral: (AnyShapeStyle(.glas(.fill)), AnyShapeStyle(.glas(.label2)))
        case .lit(let t): (t.fill, t.glyph)
        case .soft(let t): (t.soft, t.ink)
        case .warn: (AnyShapeStyle(.glas(.warnSoft)), AnyShapeStyle(.glas(.warnInk)))
        }
    }

    public var body: some View {
        let (bg, fg) = chipColors
        Button(action: action) {
            HStack(spacing: 12) {
                HPIcon(icon, size: 20, strokeWidth: 1.75)
                    .foregroundStyle(fg)
                    .frame(width: 36, height: 36)
                    .background(bg, in: Circle())
                VStack(alignment: .leading, spacing: 0) {
                    Text(name).hpText(.subhead, weight: .semibold).foregroundStyle(.glas(.label)).lineLimit(1)
                    Text(state).hpText(.footnote).foregroundStyle(.glas(.label2)).lineLimit(1)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16)
            .frame(maxWidth: .infinity, minHeight: 70, alignment: .leading)
            .background(.glas(.card), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
            .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        }
        .buttonStyle(HPPressButtonStyle())
        .accessibilityElement(children: .combine)
    }
}
