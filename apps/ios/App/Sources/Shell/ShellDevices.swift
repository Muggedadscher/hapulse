import Foundation
import HAPulseKit
import HAPulseUI

/// A switchable device of the session (lights, switches, fans, media players) as the frame's tiles show it. This is
/// the frame's stand-in until the real overview and rooms (stages 4 and 5) build on the Kit's rules; the data are
/// already the session's (demo or Home Assistant), and switching goes to Home Assistant.
struct ShellDevice: Identifiable, Hashable {
    let id: String
    let name: String
    let roomId: String?
    let room: String?
    let domain: String
    let state: String
    let isOn: Bool
    /// 0…100, dimmable lights that are on.
    let level: Double?
    /// a light with brightness (a colour mode other than `onoff`)
    let dimmable: Bool
    let icon: String
    let tone: HPTone

    static let domains: Set<String> = ["light", "switch", "fan", "media_player"]

    /// The session's devices, sorted by entity id, each with its room (Home Assistant area). Like the web, only what
    /// a user should see and switch: no hidden or disabled entities and no configuration or diagnostic ones (a
    /// child lock or auto-update switch); in a room, exactly the room's entities (`Room.domains`).
    @MainActor
    static func list(_ session: HomeSession) -> [ShellDevice] {
        var roomOf: [String: Room] = [:]
        for room in session.rooms {
            for (domain, ids) in room.domains where domains.contains(domain) {
                for id in ids { roomOf[id] = room }
            }
        }
        var entries: [String: EntityEntry] = [:]
        for entry in session.registries?.entities ?? [] { entries[entry.entityId] = entry }
        let all = session.entities.entities
        let ids = all.keys.filter { id in
            guard domains.contains(Rooms.domainOf(id)) else { return false }
            if roomOf[id] != nil { return true }
            guard let entry = entries[id] else { return true } // no registry entry (or none loaded): nothing hides it
            return entry.entityCategory == nil && entry.hiddenBy == nil && entry.disabledBy == nil
        }
        return ids.sorted().compactMap { id in all[id].map { make($0, room: roomOf[id]) } }
    }

    /// One entity as a tile shows it: icon and tone by domain, whether it is on, a light's brightness.
    static func make(_ e: HAEntity, room: Room?) -> ShellDevice {
        let id = e.entityId
        // a media player counts as on unless it is off (idle or paused players are on: toggling turns them off)
        let on: Bool = switch e.domain {
        case "media_player": !["off", "standby", "unavailable", "unknown"].contains(e.state)
        // a scene's or button's state is the time it last ran, not "on"
        case "sensor", "number", "input_number", "weather", "sun", "person", "binary_sensor", "scene", "button", "input_button", "script": false
        default: EntityDisplay.isFavoriteRelevant(e)
        }
        let level = e.attributes["brightness"]?.number.map { ($0 / 255 * 100).rounded() }
        let (icon, tone): (String, HPTone) = switch e.domain {
        case "fan": ("lucide.fan", .teal)
        case "media_player": ("lucide.tv", .blue)
        case "switch", "input_boolean": ("lucide.power", .yellow)
        case "light": (id.contains("lamp") || id.contains("nightstand") || id.contains("desk") ? "lucide.lamp" : "lucide.lightbulb", .yellow)
        case "climate": ("lucide.\(EntityDisplay.icon(e))", .orange)
        default: ("lucide.\(EntityDisplay.icon(e))", .accent)
        }
        let modes = e.attributes["supported_color_modes"]?.array?.compactMap(\.string) ?? []
        let dimmable = e.domain == "light" && (modes.contains { $0 != "onoff" } || (e.attributes["brightness"] ?? .null) != .null)
        return ShellDevice(id: id, name: e.friendlyName ?? id, roomId: room?.id, room: room?.name, domain: e.domain,
                           state: e.state, isOn: on, level: on ? level : nil, dimmable: dimmable, icon: icon, tone: tone)
    }

    /// The state line of a tile: "80 %" for a dimmed light, otherwise Home Assistant's word for the state (the app's
    /// own on/off while Home Assistant's words are not loaded, the demo has none).
    @MainActor
    func stateText(_ l: Localizer, _ session: HomeSession) -> String {
        if let level { return l.number(level, maxDecimals: 0) + " %" }
        let res = session.stateTranslations
        let word: EntityDisplay.Label = { domain, state, deviceClass in
            if let ha = EntityDisplay.lookup(res, domain: domain, state: state, deviceClass: deviceClass) { return ha }
            if state == "on" || state == "off" { return l.t(state == "on" ? "cards.sensor.on" : "cards.sensor.off") }
            return EntityDisplay.label(l, res, domain: domain, state: state, deviceClass: deviceClass)
        }
        // values with their unit, numbers and timestamps in the UI language (`formatEntityState`), else the word
        guard let e = session.entities[id] else { return word(domain, state, nil) }
        return EntityDisplay.formatState(e, locale: l.locale.rawValue, label: word)
    }
}

extension HomeSession {
    /// Any entity as the detail shows it, with the room it belongs to.
    func device(_ id: String?) -> ShellDevice? {
        guard let id, let e = entities[id] else { return nil }
        return ShellDevice.make(e, room: rooms.first { $0.domains[e.domain]?.contains(id) == true })
    }

    /// Runs a service on one entity (a scene, a button); the result arrives with the entity subscription.
    func run(_ id: String, _ domain: String, _ service: String) {
        let client = self.client
        Task {
            do { _ = try await client.callService(domain, service, target: ["entity_id": .string(id)]) } catch {
                Log("shell").error("\(domain).\(service) \(id) failed: \(error)")
            }
        }
    }

    /// Switches a device on or off (`<domain>.toggle`); the new state arrives with the entity subscription.
    func toggle(_ id: String) {
        let domain = Rooms.domainOf(id)
        let client = self.client
        Task {
            do { _ = try await client.callService(domain, "toggle", target: ["entity_id": .string(id)]) } catch {
                Log("shell").error("toggle \(id) failed: \(error)")
            }
        }
    }

    /// Sets a light's brightness (0…100); below 3 turns it off, like the web.
    func setLevel(_ id: String, _ level: Double) {
        let client = self.client
        let on = level >= 3
        Task {
            do {
                if on {
                    _ = try await client.callService("light", "turn_on", data: ["brightness": .number((level / 100 * 255).rounded())],
                                                     target: ["entity_id": .string(id)])
                } else {
                    _ = try await client.callService("light", "turn_off", target: ["entity_id": .string(id)])
                }
            } catch {
                Log("shell").error("brightness \(id) failed: \(error)")
            }
        }
    }
}
