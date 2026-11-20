import SwiftUI
import HAPulseKit
import HAPulseUI

extension HomeSession {
    /// Calls a service on several entities at once (one call, like the web's `entity_id: [...]`).
    func run(_ ids: [String], _ domain: String, _ service: String) {
        guard !ids.isEmpty else { return }
        let client = self.client
        Task {
            do { _ = try await client.callService(domain, service, target: ["entity_id": .array(ids.map { .string($0) })]) } catch {
                Log("shell").error("\(domain).\(service) \(ids.count) entities failed: \(error)")
            }
        }
    }
}

/// The chips whose window exists so far (stage 5 part 2): lights, doors and windows. The others follow.
extension SummaryChips.Chip {
    var hasWindow: Bool { self == .lights || self == .doors }
}

/// A chip's window as a sheet (web `LightsModal`/`DoorsModal` in Glas): head with the chip's label as subtitle, then
/// the window's list. It reads the session live, so a switched light updates in place.
struct ChipWindowSheet: View {
    let chip: SummaryChips.Chip
    let onClose: () -> Void
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session

    var body: some View {
        let l = model.localizer
        let c = ChipCounts.count(session.visibleEntities, poolPump: SummaryChips.poolPump, poolRequired: SummaryChips.poolRequired)
        let look = SummaryChipsRow.look(chip, c, l, session.stateTranslations)
        let (icon, titleKey) = chip == .lights ? ("lucide.lightbulb", "home.chipmodals.lights.title")
            : ("lucide.door-open", "home.chipmodals.doors.title")
        ScrollView {
            VStack(spacing: 0) {
                HPDetailHeader(icon: icon, title: l.t(titleKey), subtitle: look.text, tone: nil,
                               closeLabel: l.t("common.close"), onClose: onClose)
                    .accessibilityIdentifier("hp.scene.chip")
                Group {
                    if chip == .lights { LightsWindowBody() } else { DoorsWindowBody() }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
        }
        .background(.glas(.card))
        .presentationDetents([.medium, .large])
    }
}

/// An empty window: icon, title, description (web `EmptyState`).
private struct ChipWindowEmpty: View {
    let icon: String
    let title: String
    let text: String

    var body: some View {
        VStack(spacing: 8) {
            HPIcon(icon, size: 32, strokeWidth: 1.5).foregroundStyle(.glas(.label3))
            Text(title).hpText(.headline).foregroundStyle(.glas(.label))
            Text(text).hpText(.subhead).foregroundStyle(.glas(.label2)).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .accessibilityElement(children: .combine)
    }
}

/// A group title over a list: 15/20 600, `label2`.
private struct ChipWindowGroupTitle<Trailing: View>: View {
    let title: String
    let trailing: Trailing

    init(_ title: String, @ViewBuilder trailing: () -> Trailing = { EmptyView() }) {
        self.title = title
        self.trailing = trailing()
    }

    var body: some View {
        HStack(spacing: 6) {
            Text(title).hpText(.subhead, weight: .semibold).foregroundStyle(.glas(.label2))
            Spacer(minLength: 0)
            trailing
        }
        .padding(.horizontal, 4)
        .padding(.top, 6)
        .accessibilityAddTraits(.isHeader)
    }
}

/// Lights by room in the user's order, then the rest; "turn all off" while one is on; a row's switch (or a tap on
/// the row) toggles the light. Swiping a row off (web Glas `SwipeRow`) is not ported.
private struct LightsWindowBody: View {
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session

    var body: some View {
        let l = model.localizer
        let entities = session.entities.entities
        let hidden = session.settings.hiddenEntities
        let groups = ChipWindows.lightGroups(entities, rooms: session.rooms, roomOrder: session.settings.strings("roomOrder"),
                                             hidden: hidden)
        let on = ChipWindows.lightsOn(entities, hidden: hidden)
        VStack(alignment: .leading, spacing: 18) {
            if groups.isEmpty {
                ChipWindowEmpty(icon: "lucide.lightbulb", title: l.t("home.chipmodals.lights.emptyTitle"),
                                text: l.t("home.chipmodals.lights.emptyDescription"))
            } else {
                if !on.isEmpty {
                    Button {
                        session.run(on, "light", "turn_off")
                    } label: {
                        Text(l.t("home.chipmodals.lights.turnAllOff")).hpText(.headline)
                            .foregroundStyle(.accentPart(.onProminent))
                            .frame(maxWidth: .infinity, minHeight: 48)
                            .background(.accentPart(.prominent), in: Capsule())
                    }
                    .buttonStyle(HPPressButtonStyle())
                }
                ForEach(groups, id: \.key) { group in
                    VStack(alignment: .leading, spacing: 8) {
                        ChipWindowGroupTitle(group.room?.name ?? l.t("home.chipmodals.lights.otherLabel"))
                        HPListGroup(separatorInset: 60) {
                            ForEach(group.ids, id: \.self) { id in
                                if let e = entities[id] { LightRow(entity: e) }
                            }
                        }
                    }
                }
            }
        }
    }
}

private struct LightRow: View {
    let entity: HAEntity
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session

    var body: some View {
        let l = model.localizer
        let isOn = entity.state == "on"
        let name = ChipWindows.name(entity)
        let state: String? = isOn
            ? ChipWindows.brightnessPercent(entity).map { "\($0)%" } // the web writes the bare number
            : l.t("home.chipmodals.lights.offState")
        HPListRow(name, subtitle: state, icon: "lucide.lightbulb", tone: isOn ? .yellow : nil, minHeight: 56) {
            Toggle(l.t("home.chipmodals.lights.toggleAria", ["name": .text(name)]),
                   isOn: Binding(get: { isOn }, set: { _ in toggle(isOn) }))
                .hpSwitch(showsLabel: false)
        }
        .contentShape(Rectangle())
        .onTapGesture { toggle(isOn) }
        // one label for the row, like the web (`rowAriaOn`/`rowAriaOff`); the switch keeps its value and action
        .accessibilityElement(children: .combine)
        .accessibilityLabel(l.t(isOn ? "home.chipmodals.lights.rowAriaOn" : "home.chipmodals.lights.rowAriaOff",
                                ["name": .text(name)]))
    }

    private func toggle(_ isOn: Bool) {
        session.run(entity.entityId, "light", isOn ? "turn_off" : "turn_on")
    }
}

/// Doors (door, garage door, opening) and windows, open ones first, each with "open"/"closed" and the open count.
private struct DoorsWindowBody: View {
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session

    var body: some View {
        let l = model.localizer
        let entities = session.entities.entities
        let o = ChipWindows.openings(entities, hidden: session.settings.hiddenEntities)
        VStack(alignment: .leading, spacing: 10) {
            if o.isEmpty {
                ChipWindowEmpty(icon: "lucide.door-open", title: l.t("home.chipmodals.doors.emptyTitle"),
                                text: l.t("home.chipmodals.doors.emptyDescription"))
            } else {
                if !o.doors.isEmpty { group(l.t("home.chipmodals.doors.doorsLabel"), o.doors, entities, l) }
                if !o.windows.isEmpty { group(l.t("home.chipmodals.doors.windowsLabel"), o.windows, entities, l) }
            }
        }
    }

    private func group(_ title: String, _ ids: [String], _ entities: [String: HAEntity], _ l: Localizer) -> some View {
        let open = ids.filter { entities[$0]?.state == "on" }.count
        return VStack(alignment: .leading, spacing: 8) {
            ChipWindowGroupTitle(title) {
                Text(verbatim: "\(l.number(Double(open), maxDecimals: 0))/\(l.number(Double(ids.count), maxDecimals: 0))")
                    .hpText(.subhead, weight: open > 0 ? .semibold : nil)
                    .foregroundStyle(open > 0 ? AnyShapeStyle(.glas(.redInk)) : AnyShapeStyle(.glas(.label2)))
            }
            HPListGroup {
                ForEach(ids, id: \.self) { id in
                    if let e = entities[id] {
                        let isOpen = e.state == "on"
                        HPListRow(ChipWindows.name(e), minHeight: 54) {
                            HPStatusPill(l.t(isOpen ? "home.chipmodals.doors.open" : "home.chipmodals.doors.closed"),
                                         kind: isOpen ? .danger : .quiet)
                        }
                    }
                }
            }
        }
    }
}
