import SwiftUI

// MARK: - Switch

/// The Glas switch as a `ToggleStyle` (web `.g-switch`): track 51 × 31 in `switchOff`/`switchOn`, knob 27 in `knob`
/// with the knob shadow, moves 20 with the snappy spring; hit area at least 64 × 44. Being a `Toggle`, VoiceOver
/// announces it as a switch with its value.
public struct HPSwitchStyle: ToggleStyle {
    let showsLabel: Bool
    nonisolated public init(showsLabel: Bool = true) { self.showsLabel = showsLabel }

    public func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 12) {
            if showsLabel {
                configuration.label
                Spacer(minLength: 8)
            }
            HPSwitchTrack(isOn: configuration.isOn)
                .frame(width: 64, height: 44)
                .contentShape(Rectangle())
                .onTapGesture { configuration.isOn.toggle() }
        }
    }
}

struct HPSwitchTrack: View {
    let isOn: Bool

    var body: some View {
        ZStack(alignment: .leading) {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(isOn ? AnyShapeStyle(.glas(.switchOn)) : AnyShapeStyle(.glas(.switchOff)))
                .hpAnimation(.easeInOut(duration: 0.25), value: isOn)
            Circle()
                .fill(.glas(.knob))
                .hpShadow(.knob)
                .frame(width: 27, height: 27)
                .offset(x: isOn ? 22 : 2)
                .hpAnimation(HPMotion.snappy, value: isOn)
        }
        .frame(width: 51, height: 31)
    }
}

extension Toggle {
    /// `Toggle` in the Glas look.
    public func hpSwitch(showsLabel: Bool = true) -> some View {
        toggleStyle(HPSwitchStyle(showsLabel: showsLabel))
    }
}

// MARK: - Horizontal slider

/// A horizontal slider track (web `.light-card__track`): `fill2` capsule, the value filled in a tone (brightness
/// yellow, volume `label2`), 28 high on cards, 32 in the detail. Drag anywhere; VoiceOver adjusts in steps of 10 %.
public struct HPTrackSlider: View {
    @Binding var value: Double
    let fill: AnyShapeStyle
    let height: CGFloat
    let label: String
    let valueText: (Double) -> String
    let onCommit: ((Double) -> Void)?
    @State private var dragging = false

    /// - Parameters:
    ///   - value: 0…1
    ///   - valueText: what VoiceOver reads for a value, e.g. "80 %"
    public init(value: Binding<Double>, fill: AnyShapeStyle = HPTone.yellow.fill, height: CGFloat = 28, label: String,
                valueText: @escaping (Double) -> String, onCommit: ((Double) -> Void)? = nil) {
        self._value = value
        self.fill = fill
        self.height = height
        self.label = label
        self.valueText = valueText
        self.onCommit = onCommit
    }

    public var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(.glas(.fill2))
                Rectangle()
                    .fill(fill)
                    .frame(width: geo.size.width * min(max(value, 0), 1))
            }
            .clipShape(Capsule())
            .contentShape(Capsule())
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { g in
                        dragging = true
                        value = min(max(g.location.x / max(geo.size.width, 1), 0), 1)
                    }
                    .onEnded { _ in
                        dragging = false
                        onCommit?(value)
                    }
            )
        }
        .frame(height: height)
        .scaleEffect(y: dragging ? 1.04 : 1)
        .hpAnimation(HPMotion.snappy, value: dragging)
        .accessibilityElement()
        .accessibilityLabel(label)
        .accessibilityValue(valueText(value))
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: value = min(value + 0.1, 1)
            case .decrement: value = max(value - 0.1, 0)
            @unknown default: break
            }
            onCommit?(value)
        }
    }
}

// MARK: - Vertical light capsule

/// The big brightness capsule of the light detail (web `.g-light__cap`): 120 × 280, radius 32, `fill2` track, the
/// level filled from below in yellow, a sun 20 near the bottom that turns `glyphDark` from 14 %. Below 3 % counts as off.
/// The value is committed when the finger lifts (the web sends it to Home Assistant then).
public struct HPLightCapsule: View {
    @Binding var level: Double
    let label: String
    let valueText: (Double) -> String
    let onCommit: ((Double) -> Void)?
    @State private var startLevel: Double?

    /// - Parameter level: 0…100
    public init(level: Binding<Double>, label: String, valueText: @escaping (Double) -> String, onCommit: ((Double) -> Void)? = nil) {
        self._level = level
        self.label = label
        self.valueText = valueText
        self.onCommit = onCommit
    }

    public var body: some View {
        let shape = RoundedRectangle(cornerRadius: 32, style: .continuous)
        GeometryReader { geo in
            ZStack(alignment: .bottom) {
                shape.fill(.glas(.fill2))
                Rectangle()
                    .fill(.glas(.yellow))
                    .frame(height: geo.size.height * level / 100)
                    .hpAnimation(startLevel == nil ? HPMotion.snappy : .linear(duration: 0), value: level)
                HPIcon("lucide.sun", size: 20, strokeWidth: 2)
                    .foregroundStyle(level >= 14 ? AnyShapeStyle(.glas(.glyphDark)) : AnyShapeStyle(.glas(.label2)))
                    .padding(.bottom, 20)
            }
            .clipShape(shape)
            .contentShape(shape)
            .gesture(
                DragGesture(minimumDistance: 3)
                    .onChanged { g in
                        let start = startLevel ?? level
                        startLevel = start
                        let next = start - g.translation.height / max(geo.size.height, 1) * 100
                        level = min(max(next, 0), 100).rounded()
                    }
                    .onEnded { _ in
                        startLevel = nil
                        if level < 3 { level = 0 }
                        onCommit?(level)
                    }
            )
        }
        .frame(width: 120, height: 280)
        .scaleEffect(startLevel != nil ? 1.04 : 1)
        .hpAnimation(HPMotion.smooth, value: startLevel != nil)
        .accessibilityElement()
        .accessibilityLabel(label)
        .accessibilityValue(valueText(level))
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: level = min(level + 10, 100)
            case .decrement: level = max(level - 10, 0)
            @unknown default: break
            }
            onCommit?(level)
        }
    }
}

// MARK: - Stepper

/// A round button (web `.climate-card__step-btn`): 44 circle in `fill`, glyph `label`.
public struct HPRoundButton: View {
    let icon: String
    let label: String
    let action: () -> Void

    public init(icon: String, label: String, action: @escaping () -> Void) {
        self.icon = icon
        self.label = label
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HPIcon(icon, size: 20, strokeWidth: 2)
                .foregroundStyle(.glas(.label))
                .frame(width: 44, height: 44)
                .background(.glas(.fill), in: Circle())
                .contentShape(Circle())
        }
        .buttonStyle(HPPressButtonStyle(scale: 0.9))
        .accessibilityLabel(label)
    }
}

/// The capsule stepper of the climate card (web `.climate-card__target-control`): 40 high `fill` capsule, − and +
/// 40 wide (hit area 44), the value 600 17/22 in between (at least 56 wide). VoiceOver: one adjustable element.
public struct HPCapsuleStepper: View {
    @Binding var value: Double
    let step: Double
    let range: ClosedRange<Double>
    let label: String
    let decreaseLabel: String
    let increaseLabel: String
    let valueText: (Double) -> String

    public init(value: Binding<Double>, step: Double = 0.5, range: ClosedRange<Double>, label: String,
                decreaseLabel: String, increaseLabel: String, valueText: @escaping (Double) -> String) {
        self._value = value
        self.step = step
        self.range = range
        self.label = label
        self.decreaseLabel = decreaseLabel
        self.increaseLabel = increaseLabel
        self.valueText = valueText
    }

    private func change(_ delta: Double) {
        value = min(max(value + delta, range.lowerBound), range.upperBound)
    }

    public var body: some View {
        HStack(spacing: 0) {
            stepButton("lucide.minus", decreaseLabel, enabled: value > range.lowerBound) { change(-step) }
            Text(valueText(value))
                .hpText(.headline)
                .foregroundStyle(.glas(.label))
                .frame(minWidth: 56)
                .contentTransition(.numericText(value: value))
                .hpAnimation(HPMotion.snappy, value: value)
            stepButton("lucide.plus", increaseLabel, enabled: value < range.upperBound) { change(step) }
        }
        .frame(height: 40)
        .background(.glas(.fill), in: Capsule())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label)
        .accessibilityValue(valueText(value))
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: change(step)
            case .decrement: change(-step)
            @unknown default: break
            }
        }
    }

    private func stepButton(_ icon: String, _ label: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HPIcon(icon, size: 20, strokeWidth: 2)
                .foregroundStyle(.glas(.label))
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(HPPressButtonStyle(scale: 0.9))
        .frame(width: 40)
        .disabled(!enabled)
        .opacity(enabled ? 1 : 0.4)
        .accessibilityLabel(label)
    }
}
