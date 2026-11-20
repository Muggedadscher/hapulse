import SwiftUI
import HAPulseKit
import HAPulseUI

/// A room's look in the list: the status symbol (open window, door, gate, water, smoke) replaces the room's own and
/// tints it, else yellow while a visible light is on (web `roomDisplayIcon`, `roomTone`, `roomStatusText`).
struct RoomBadge {
    let icon: String
    let tone: HPTone?
    /// nil: nothing to say (no status, no light on), like the web's rooms menu
    let subtitle: String?

    /// How loud a status is (`STATUS_TONE`): window and door warn, gate, water and smoke alarm.
    private static let alarm: Set<String> = ["car", "droplets", "flame"]

    @MainActor
    init(_ room: Room, session: HomeSession, l: Localizer) {
        let hidden = Set(session.settings.hiddenEntities)
        let entity: (String) -> HAEntity? = { hidden.contains($0) ? nil : session.entities[$0] }
        let lightsOn = (room.domains["light"] ?? []).filter { entity($0)?.state == "on" }.count
        if let status = RoomLook.statusIconName(room, entity: entity) {
            icon = "lucide.\(status)"
            tone = Self.alarm.contains(status) ? .red : .orange
            subtitle = switch status {
            case "grid-2x2": l.t("hints.windowOpen", ["count": .number(1)])
            case "door-open": l.t("hints.doorOpen", ["count": .number(1)])
            case "car": l.t("hints.garageOpen", ["count": .number(1)])
            case "droplets": l.t("hints.leak")
            default: l.t("hints.smoke")
            }
        } else {
            icon = "lucide.\(RoomLook.iconName(name: room.name, icon: room.icon))"
            tone = lightsOn > 0 ? .yellow : nil
            subtitle = lightsOn > 0 ? l.t("glas.hero.lightsOn", ["count": .number(Double(lightsOn))]) : nil
        }
    }
}

/// Rooms: the session's rooms in the user's order (hidden rooms left out), each with its state and temperature;
/// a row pushes the room's page.
struct RoomsPage: View {
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session

    var body: some View {
        let l = model.localizer
        let c = session.settings.customization
        let rooms = Rooms.ordered(session.rooms, roomOrder: session.settings.strings("roomOrder"),
                                  hiddenRooms: session.settings.strings("hiddenRooms"), locale: Locale(identifier: l.locale.rawValue))
        PageScroll {
            if session.registries == nil {
                LoadingCard()
            } else if rooms.isEmpty {
                HPCard {
                    Text(l.t("rooms.empty")).hpText(.body).foregroundStyle(.glas(.label2))
                        .frame(maxWidth: .infinity, minHeight: 120)
                        .multilineTextAlignment(.center)
                }
                .accessibilityIdentifier("hp.scene.rooms")
            } else {
                HPListGroup(separatorInset: 60) {
                    ForEach(rooms) { room in
                        let badge = RoomBadge(room, session: session, l: l)
                        let temperature = RoomClimate.temperature(room, entity: { session.entities[$0] },
                                                                  source: c["roomTemperatureSource"]?[room.id])
                        NavigationLink(value: room.id) {
                            HPListRow(room.name, subtitle: badge.subtitle, icon: badge.icon, tone: badge.tone, minHeight: 60) {
                                HStack(spacing: 6) {
                                    if let temperature {
                                        Text(l.number(temperature.value, maxDecimals: 1) + " " + (temperature.unit ?? "°C"))
                                            .hpText(.subhead).foregroundStyle(.glas(.label2))
                                    }
                                    HPIcon("lucide.chevron-right", size: 16, strokeWidth: 2).foregroundStyle(.glas(.label3))
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
                .accessibilityIdentifier("hp.scene.rooms")
            }
        }
        .navigationDestination(for: String.self) { roomId in
            RoomPage(roomId: roomId)
        }
    }
}

/// One room: its sections in the web's order (`roomSections`: the user's order, hidden entities left out), each a
/// title and its tiles. A tile switches what can be switched, runs a scene or button, else opens the detail; a long
/// press shows the context menu.
struct RoomPage: View {
    let roomId: String
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session

    /// The title keys of the sections (`room.section.label.*`).
    private static func titleKey(_ key: RoomSectionKey) -> String? {
        switch key {
        case .scene: "room.section.label.scene"
        case .light: "room.section.label.light"
        case .climate: "room.section.label.climate"
        case .mediaPlayer: "room.section.label.mediaPlayer"
        case .cover: "room.section.label.cover"
        case .garage: "room.section.label.garage"
        case .switches: "room.section.label.switches"
        case .button: "room.section.label.button"
        case .vacuum: "room.section.label.vacuum"
        case .sensor: "room.section.label.sensor"
        case .other: "room.section.label.misc"
        case .binarySensor, .nvrCameras: nil
        }
    }

    var body: some View {
        let l = model.localizer
        let room = session.rooms.first { $0.id == roomId }
        PageScroll {
            if let room {
                let sections = Rooms.sections(room, entities: session.entities, settings: session.settings).sections
                VStack(alignment: .leading, spacing: 20) {
                    ForEach(sections, id: \.key) { section in
                        if let key = Self.titleKey(section.key) {
                            VStack(alignment: .leading, spacing: 6) {
                                HPCardHead(l.t(key))
                                if section.key == .scene {
                                    // scene tiles like the overview's, name only (web room page)
                                    let scenes = section.ids.compactMap { session.entities[$0] }
                                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                                        ForEach(Array(scenes.enumerated()), id: \.element.entityId) { i, scene in
                                            SceneTileCell(scene: scene, index: i,
                                                          name: RoomSections.stripRoomName(scene.friendlyName ?? scene.entityId, room.name)
                                                              .replacingOccurrences(of: "_", with: " "),
                                                          showsSubtitle: false)
                                        }
                                    }
                                } else {
                                    HPTileGrid {
                                        ForEach(section.ids, id: \.self) { id in
                                            if let e = session.entities[id] {
                                                EntityRoomTile(entity: e, roomName: room.name)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                .accessibilityElement(children: .contain)
                .accessibilityIdentifier("hp.scene.room")
            }
        }
        .navigationTitle(room?.name ?? "")
    }
}

/// A tile of the room page for any entity: its icon, its name without the room's name, its state in words.
struct EntityRoomTile: View {
    let entity: HAEntity
    let roomName: String
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session
    @Environment(WindowNav.self) private var nav

    var body: some View {
        let l = model.localizer
        let e = entity
        let d = ShellDevice.make(e, room: nil)
        // a scene or button tile shows only its name (its state is the time it last ran), like the web's scene tile
        let runs = ShellDevice.runnable.contains(d.domain)
        let stripped = RoomSections.stripRoomName(d.name, roomName)
        let name = d.domain == "scene" ? stripped.replacingOccurrences(of: "_", with: " ") : stripped
        HPRoomTile(icon: d.icon, name: name, state: runs ? "" : d.stateText(l, session), chip: chip(d)) {
            act(d)
        }
        .contextMenu {
            if canSwitch(d) {
                Button {
                    session.toggle(e.entityId)
                } label: {
                    Label { Text(l.t(d.isOn ? "glas.context.turnOff" : "glas.context.turnOn")) } icon: { HPIconImage.image("lucide.power") }
                }
            }
            Button {
                nav.detailID = e.entityId
            } label: {
                Label { Text(l.t("glas.context.details")) } icon: { HPIconImage.image("lucide.info") }
            }
        }
    }

    private func chip(_ d: ShellDevice) -> HPChipTone {
        if d.domain == "binary_sensor" { return d.state == "on" ? .warn : .neutral }
        return d.isOn ? .lit(d.tone) : .neutral
    }

    /// Not while Home Assistant does not reach the device: a tap then opens the detail.
    private func canSwitch(_ d: ShellDevice) -> Bool {
        EntityDisplay.isToggleable(d.domain) && d.state != "unavailable" && d.state != "unknown"
    }

    private func act(_ d: ShellDevice) {
        if canSwitch(d) {
            session.toggle(d.id)
        } else if d.domain == "scene" {
            session.run(d.id, "scene", "turn_on")
        } else if d.domain == "button" || d.domain == "input_button" {
            session.run(d.id, d.domain, "press")
        } else if d.domain == "script" {
            session.run(d.id, "script", "turn_on")
        } else {
            nav.detailID = d.id
        }
    }
}
