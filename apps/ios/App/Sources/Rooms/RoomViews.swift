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

    @MainActor
    init(_ room: Room, session: HomeSession, l: Localizer) {
        let look = RoomTileLook(room, session: session)
        icon = "lucide.\(look.iconName)"
        tone = look.tone.map(\.hpTone)
        subtitle = RoomTile.statusText(l, iconName: look.iconName, isStatus: look.isStatus)
            ?? (look.lightsOn > 0 ? l.t("glas.hero.lightsOn", ["count": .number(Double(look.lightsOn))]) : nil)
    }
}

/// What the room tiles and the rooms list read from a room: its symbol (status or own), its visible lights, its
/// temperature and humidity (the chosen temperature source), its device count.
struct RoomTileLook {
    let iconName: String
    let isStatus: Bool
    let lights: Int
    let lightsOn: Int
    let devices: Int
    let temperature: Double?
    let humidity: Double?
    var tone: RoomTile.Tone? { RoomTile.tone(iconName: iconName, isStatus: isStatus, lightsOn: lightsOn) }

    @MainActor
    init(_ room: Room, session: HomeSession) {
        let hidden = Set(session.settings.hiddenEntities)
        let entity: (String) -> HAEntity? = { session.entities[$0] }
        let visible: (String) -> HAEntity? = { hidden.contains($0) ? nil : session.entities[$0] }
        if let status = RoomLook.statusIconName(room, entity: visible) {
            iconName = status
            isStatus = true
        } else {
            iconName = RoomLook.iconName(name: room.name, icon: room.icon)
            isStatus = false
        }
        let visibleLights = (room.domains["light"] ?? []).filter { !hidden.contains($0) }
        lights = visibleLights.count
        lightsOn = visibleLights.filter { session.entities[$0]?.state == "on" }.count
        devices = room.domains.values.reduce(0) { $0 + $1.count }
        let source = session.settings.customization["roomTemperatureSource"]?[room.id]
        let summary = RoomClimate.withTemperature(Rooms.summary(room, entity: entity), room, entity: entity, source: source)
        temperature = summary.temperature
        humidity = summary.humidity
    }
}

extension RoomTile.Tone {
    /// The circle's colour: yellow while a light is on; a status warns (orange) or alarms (red).
    var hpTone: HPTone {
        switch self {
        case .on: .yellow
        case .warn: .orange
        case .alarm: .red
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
