import Foundation

/// A Home Assistant inside the app for the demo mode and the screenshots: the demo home of the web
/// (`DemoHome`), the WebSocket commands the app uses, and simple reactions to service calls (switching, opening,
/// locking, temperatures). It sits behind `HATransport`, so the demo runs through exactly the same client code as a
/// real Home Assistant.
public actor DemoHA: HATransport {
    public static let token = "demo"

    private var states: [String: JSONValue]
    private let registries: JSONValue
    private let now: Date
    private var box: Mailbox?
    private var entitySubs: [Int] = []
    private var dataSubs: [(id: Int, scope: String, key: String)] = []
    private var systemData: [String: JSONValue] = [:]
    private var userData: [String: JSONValue] = [:]
    public private(set) var calls: [JSONValue] = []

    public init(home: DemoHome) {
        states = home.entities
        registries = home.registries
        now = home.now
    }

    /// Settings documents, e.g. `hapulse:global` for a "managed" demo.
    public func setSystemData(_ key: String, _ value: JSONValue) async {
        systemData[key] = value
        for s in dataSubs where s.scope == "system" && s.key == key { await send(["id": .number(Double(s.id)), "type": "event", "event": .object(["value": value])]) }
    }

    public func setUserData(_ key: String, _ value: JSONValue) async {
        userData[key] = value
        for s in dataSubs where s.scope == "user" && s.key == key { await send(["id": .number(Double(s.id)), "type": "event", "event": .object(["value": value])]) }
    }

    public nonisolated func open(_ url: URL) async throws -> any HASocket {
        let box = await connect()
        return DemoSocket(server: self, box: box)
    }

    private func connect() async -> Mailbox {
        await box?.put(nil)
        let b = Mailbox()
        box = b
        entitySubs = []
        dataSubs = []
        await b.put(#"{"type":"auth_required","ha_version":"2026.11.2"}"#)
        return b
    }

    fileprivate func close(_ b: Mailbox) async {
        if box === b { box = nil }
        await b.put(nil)
    }

    private func send(_ m: JSONObject) async {
        guard let box, let text = try? HAClient.encode(m) else { return }
        await box.put(text)
    }

    private var seconds: Double { now.timeIntervalSince1970 }

    private func compressed(_ e: JSONValue) -> JSONValue {
        let lc = e["last_changed"]?.string.flatMap(ISO8601.parse)?.timeIntervalSince1970 ?? seconds
        let lu = e["last_updated"]?.string.flatMap(ISO8601.parse)?.timeIntervalSince1970 ?? lc
        var o: JSONObject = ["s": e["state"] ?? "", "a": e["attributes"] ?? .object([:]), "c": e["context"]?["id"] ?? "demo", "lc": .number(lc)]
        if lu != lc { o["lu"] = .number(lu) }
        return .object(o)
    }

    fileprivate func receive(_ text: String) async {
        guard let m = try? HAClient.decode(text) else { return }
        let id = m["id"] ?? .null
        func ok(_ result: JSONValue = .null) async { await send(["id": id, "type": "result", "success": true, "result": result]) }
        switch m["type"]?.string {
        case "auth":
            if m["access_token"]?.string == Self.token {
                await send(["type": "auth_ok", "ha_version": "2026.11.2"])
            } else {
                await send(["type": "auth_invalid", "message": "Invalid access token or password"])
            }
        case "ping":
            await send(["id": id, "type": "pong"])
        case "auth/current_user":
            await ok(.object(["id": "demo-user", "name": "Demo", "is_admin": true, "is_owner": true]))
        case "subscribe_entities":
            entitySubs.append(Int(id.number ?? 0))
            await ok()
            await send(["id": id, "type": "event", "event": .object(["a": .object(states.mapValues(compressed))])])
        case "config/area_registry/list":
            await ok(registries["areas"] ?? .array([]))
        case "config/device_registry/list":
            await ok(registries["devices"] ?? .array([]))
        case "config/entity_registry/list":
            await ok(registries["entities"] ?? .array([]))
        case "frontend/subscribe_system_data", "frontend/subscribe_user_data":
            let scope = m["type"]?.string == "frontend/subscribe_system_data" ? "system" : "user"
            let key = m["key"]?.string ?? ""
            dataSubs.append((Int(id.number ?? 0), scope, key))
            await ok()
            let value = (scope == "system" ? systemData[key] : userData[key]) ?? .null
            await send(["id": id, "type": "event", "event": .object(["value": value])])
        case "frontend/get_system_data":
            await ok(.object(["value": systemData[m["key"]?.string ?? ""] ?? .null]))
        case "frontend/get_user_data":
            await ok(.object(["value": userData[m["key"]?.string ?? ""] ?? .null]))
        case "unsubscribe_events":
            let sub = Int(m["subscription"]?.number ?? -1)
            entitySubs.removeAll { $0 == sub }
            dataSubs.removeAll { $0.id == sub }
            await ok()
        case "call_service":
            calls.append(m)
            await ok(.object(["context": .object(["id": "demo"])]))
            await serviceCall(m)
        default:
            await send(["id": id, "type": "result", "success": false,
                        "error": .object(["code": "unknown_command", "message": "Not available in the demo."])])
        }
    }

    private func targets(_ m: JSONValue) -> [String] {
        let t = m["target"]?["entity_id"] ?? m["service_data"]?["entity_id"]
        switch t {
        case .string(let s)?: return [s]
        case .array(let a)?: return a.compactMap(\.string)
        default: return []
        }
    }

    /// The few reactions the demo needs to feel alive; everything else is accepted and changes nothing.
    private func serviceCall(_ m: JSONValue) async {
        let service = m["service"]?.string ?? ""
        let data = m["service_data"]?.object ?? [:]
        var changes: JSONObject = [:]
        for id in targets(m) {
            guard var e = states[id]?.object else { continue }
            let domain = id.split(separator: ".").first.map(String.init) ?? ""
            var attrs = e["attributes"]?.object ?? [:]
            let old = e["state"]?.string ?? ""
            var state = old
            switch (domain, service) {
            case (_, "turn_on"): state = "on"
            case (_, "turn_off"): state = "off"
            case (_, "toggle"): state = old == "on" ? "off" : "on"
            case ("cover", "open_cover"): state = "open"; attrs["current_position"] = 100
            case ("cover", "close_cover"): state = "closed"; attrs["current_position"] = 0
            case ("cover", "set_cover_position"):
                let p = data["position"]?.number ?? 0
                attrs["current_position"] = .number(p)
                state = p > 0 ? "open" : "closed"
            case ("lock", "lock"): state = "locked"
            case ("lock", "unlock"): state = "unlocked"
            case ("climate", "set_temperature"): if let t = data["temperature"] { attrs["temperature"] = t }
            case ("climate", "set_hvac_mode"): if let mode = data["hvac_mode"]?.string { state = mode }
            case ("alarm_control_panel", let s) where s.hasPrefix("alarm_"):
                state = s == "alarm_disarm" ? "disarmed" : "armed_" + s.dropFirst("alarm_arm_".count)
            case ("input_number", "set_value"), ("number", "set_value"): if let v = data["value"] { state = v.number.map(HANumber.stateText) ?? state }
            case ("input_select", "select_option"), ("select", "select_option"): state = data["option"]?.string ?? state
            default: continue
            }
            if domain == "light", service != "turn_off", let b = data["brightness"] { attrs["brightness"] = b }
            if domain == "light", state == "off" { attrs["brightness"] = .null }
            e["state"] = .string(state)
            e["attributes"] = .object(attrs)
            states[id] = .object(e)
            var plus: JSONObject = ["s": .string(state), "a": .object(attrs), "lu": .number(seconds)]
            if state != old { plus["lc"] = .number(seconds) }
            changes[id] = .object(["+": .object(plus)])
        }
        guard !changes.isEmpty else { return }
        for sub in entitySubs { await send(["id": .number(Double(sub)), "type": "event", "event": .object(["c": .object(changes)])]) }
    }
}

enum HANumber {
    /// Number as Home Assistant states show it (integers without `.0`).
    static func stateText(_ d: Double) -> String { d == d.rounded() && abs(d) < 1e15 ? String(Int64(d)) : String(d) }
}

struct DemoSocket: HASocket {
    let server: DemoHA
    let box: Mailbox

    func send(_ text: String) async throws { await server.receive(text) }

    func receive() async throws -> String {
        guard let s = await box.take() else { throw HAError("closed", "demo connection closed") }
        return s
    }

    func close() async { await server.close(box) }
}
