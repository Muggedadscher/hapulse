import Foundation
import HAPulseKit
import HAPulseUI

/// A device of the demo home, mapped for the catalogue's tiles. Only the App reads demo data; the building blocks in
/// HAPulseUI take plain values. The real mapping (state labels from Home Assistant, areas, icons) comes with the
/// entity store in HAPulseKit (stage 1); this is the stand-in until then.
struct DemoDevice: Identifiable, Hashable {
    let id: String
    let name: String
    let room: String?
    let isOn: Bool
    /// 0…100, lights only.
    let level: Double?
    let icon: String
    let tone: HPTone

    static func load() -> [DemoDevice] {
        guard let home = try? DemoHome.load() else { return [] }
        var areaNames: [String: String] = [:]
        for a in home.registries["areas"]?.array ?? [] {
            if let id = a["area_id"]?.string, let name = a["name"]?.string { areaNames[id] = name }
        }
        var deviceArea: [String: String] = [:]
        for d in home.registries["devices"]?.array ?? [] {
            if let id = d["id"]?.string, let area = d["area_id"]?.string { deviceArea[id] = area }
        }
        var entityArea: [String: String] = [:]
        for e in home.registries["entities"]?.array ?? [] {
            guard let id = e["entity_id"]?.string else { continue }
            if let area = e["area_id"]?.string ?? e["device_id"]?.string.flatMap({ deviceArea[$0] }) { entityArea[id] = area }
        }
        let wanted = ["light", "switch", "fan", "media_player"]
        return home.entities.keys.sorted().compactMap { id -> DemoDevice? in
            let domain = String(id.prefix { $0 != "." })
            guard wanted.contains(domain), let e = home.entities[id] else { return nil }
            let state = e["state"]?.string ?? "off"
            let attrs = e["attributes"]
            let on = state == "on" || state == "playing"
            let level = attrs?["brightness"]?.number.map { ($0 / 255 * 100).rounded() }
            let (icon, tone): (String, HPTone) = switch domain {
            case "fan": ("lucide.fan", .teal)
            case "media_player": ("lucide.tv", .blue)
            case "switch": ("lucide.power", .yellow)
            default: (id.contains("lamp") || id.contains("nightstand") || id.contains("desk") ? "lucide.lamp" : "lucide.lightbulb", .yellow)
            }
            return DemoDevice(id: id, name: attrs?["friendly_name"]?.string ?? id,
                              room: entityArea[id].flatMap { areaNames[$0] }, isOn: on, level: on ? level : nil, icon: icon, tone: tone)
        }
    }

    /// The state line of a tile: "80 %" for a dimmed light, otherwise on/off.
    func stateText(_ l: Localizer) -> String {
        if let level { return l.number(level, maxDecimals: 0) + " %" }
        return l.t(isOn ? "cards.sensor.on" : "cards.sensor.off")
    }
}
