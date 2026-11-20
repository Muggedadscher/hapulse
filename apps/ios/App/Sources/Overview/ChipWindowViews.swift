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

/// The chips whose window exists so far (stage 5 part 2): lights, doors and windows, locks. The others follow.
extension SummaryChips.Chip {
    var hasWindow: Bool { [.lights, .doors, .locks].contains(self) }

    /// The window's head: icon and title key.
    var windowHead: (icon: String, title: String) {
        switch self {
        case .lights: ("lucide.lightbulb", "home.chipmodals.lights.title")
        case .locks: ("lucide.lock", "security.locks.title")
        default: ("lucide.door-open", "home.chipmodals.doors.title")
        }
    }
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
        let (icon, titleKey) = chip.windowHead
        ScrollView {
            VStack(spacing: 0) {
                HPDetailHeader(icon: icon, title: l.t(titleKey), subtitle: look.text, tone: nil,
                               closeLabel: l.t("common.close"), onClose: onClose)
                    .accessibilityIdentifier("hp.scene.chip")
                Group {
                    switch chip {
                    case .lights: LightsWindowBody()
                    case .locks: LocksWindowBody()
                    default: DoorsWindowBody()
                    }
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

/// Every visible lock, the ones not locked first (web `LocksModal` with `LocksList` in Glas): circle (locked green,
/// otherwise red), name, room, state under the name, one button: "Unlock" while locked, else "Lock", disabled while
/// the lock moves, is jammed or unreachable. Unlocking always asks; locking asks only for a code. Swiping a row to
/// lock (web Glas `SwipeRow`) is not ported. The question is a system alert: it closes on confirm, and a refused call
/// (wrong code) opens it again with an empty field (the web keeps its dialog open and shows a toast). Names sort in
/// the UI language (the web: the browser's language).
private struct LocksWindowBody: View {
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session
    /// The last request; kept while the alert closes, so its title and buttons stay.
    @State private var pending: LockRequest?
    @State private var asking = false
    @State private var code = ""

    struct LockRequest: Identifiable {
        let service: Locks.Service
        let entity: HAEntity
        var id: String { entity.entityId + service.rawValue }
    }

    var body: some View {
        let l = model.localizer
        let entities = session.entities.entities
        let ids = ChipWindows.locks(entities, hidden: session.settings.hiddenEntities,
                                    locale: Locale(identifier: l.locale.rawValue))
        VStack(alignment: .leading, spacing: 10) {
            if ids.isEmpty {
                ChipWindowEmpty(icon: "lucide.lock", title: l.t("locks.emptyTitle"), text: l.t("locks.emptyDescription"))
            } else {
                HPListGroup(separatorInset: 66) {
                    ForEach(ids, id: \.self) { id in
                        if let e = entities[id] { row(e, l) }
                    }
                }
            }
        }
        .alert(pending.map { l.t($0.service == .unlock ? "security.locks.unlock" : "security.locks.lock") } ?? "",
               isPresented: $asking, presenting: pending) { request in
            if Locks.needsCode(request.entity) {
                SecureField(l.t("security.locks.codePlaceholder"), text: $code)
                    .keyboardType(Locks.codeIsNumeric(request.entity) ? .numberPad : .default)
            }
            Button(l.t("security.locks.cancel"), role: .cancel) {}
            Button(l.t(request.service == .unlock ? "security.locks.unlock" : "security.locks.lock"),
                   role: request.service == .unlock ? .destructive : nil) {
                run(request.service, request.entity, code: code)
            }
            .disabled(Locks.needsCode(request.entity) && code.isEmpty)
        } message: { request in
            Text(l.t(request.service == .unlock ? "security.locks.confirmUnlockOne" : "security.locks.confirmLockOne",
                     ["name": .text(request.entity.friendlyName ?? request.entity.entityId)]))
        }
    }

    private func row(_ e: HAEntity, _ l: Localizer) -> some View {
        let locked = e.state == "locked"
        let busy = Locks.busy(e.state)
        let service: Locks.Service = locked ? .unlock : .lock
        let name = e.friendlyName ?? e.entityId
        let room = ChipWindows.roomName(e.entityId, rooms: session.rooms)
        let state = EntityDisplay.label(l, session.stateTranslations, domain: "lock", state: e.state)
        let tone: HPTone = locked ? .green : .red
        return HStack(spacing: 12) {
            HPIcon(locked ? "lucide.lock" : "lucide.lock-open", size: 18, strokeWidth: 1.75)
                .foregroundStyle(tone.ink)
                .frame(width: 40, height: 40)
                .background(tone.soft, in: Circle())
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 0) {
                Text(name).hpText(.body, weight: .semibold).foregroundStyle(.glas(.label)).lineLimit(2)
                if let room {
                    Text(room).hpText(.footnote).foregroundStyle(.glas(.label2)).lineLimit(1)
                }
                Text(state).hpText(.footnote, weight: locked ? nil : .semibold)
                    .foregroundStyle(locked ? AnyShapeStyle(.glas(.label2)) : AnyShapeStyle(.glas(.redInk)))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
            Button {
                request(service, e)
            } label: {
                Text(l.t(locked ? "security.locks.unlock" : "security.locks.lock")).hpText(.subhead, weight: .semibold)
                    .foregroundStyle(.glas(.label))
                    .padding(.horizontal, 14)
                    .frame(minHeight: 40)
                    .background(.glas(.fill), in: Capsule())
            }
            .buttonStyle(HPPressButtonStyle())
            .disabled(busy)
            .opacity(busy ? 0.4 : 1)
            .accessibilityLabel(Text(verbatim: "\(l.t(locked ? "security.locks.unlock" : "security.locks.lock")), \(name)"))
        }
        .padding(.vertical, 12)
        .padding(.leading, 14)
        .padding(.trailing, 12)
    }

    private func request(_ service: Locks.Service, _ e: HAEntity) {
        if Locks.needsDialog(service, [e]) {
            ask(LockRequest(service: service, entity: e))
        } else {
            run(service, e, code: "")
        }
    }

    private func ask(_ request: LockRequest) {
        code = ""
        pending = request
        asking = true
    }

    /// Sends the call; refused (wrong code, Home Assistant error) → the question again with an empty field.
    private func run(_ service: Locks.Service, _ e: HAEntity, code: String) {
        let client = session.client
        let data: [String: JSONValue]? = Locks.needsCode(e) ? ["code": .string(code)] : nil
        let again = Locks.needsDialog(service, [e]) ? LockRequest(service: service, entity: e) : nil
        Task { @MainActor in
            do { _ = try await client.callService("lock", service.rawValue, data: data, target: ["entity_id": .string(e.entityId)]) } catch {
                Log("shell").error("lock.\(service.rawValue) \(e.entityId) failed: \(error)")
                // a quick refusal can land while the alert still closes; wait for that first
                if let again {
                    try? await Task.sleep(for: .milliseconds(400))
                    ask(again)
                }
            }
        }
    }
}
