import Foundation

/// The sections of a room page (port of `roomSections.ts` in `@hapulse/core`).
public enum RoomSectionKey: String, CaseIterable, Sendable {
    case scene, light, climate
    case mediaPlayer = "media_player"
    case cover, garage, switches, button, vacuum, sensor
    case binarySensor = "binary_sensor"
    case other, nvrCameras
}

public struct RoomSection: Equatable, Sendable {
    public var key: RoomSectionKey
    public var ids: [String]
    /// sensor tiles instead of entity cards
    public var isSensor: Bool
}

public enum RoomSections {
    /// The order the room page stores its entity order in (`ROOM_SECTION_ORDER`).
    public static let storageOrder: [RoomSectionKey] = RoomSectionKey.allCases
    /// Without a stored order.
    static let displayOrder: [RoomSectionKey] = [.scene, .nvrCameras, .light, .climate, .mediaPlayer, .cover, .garage,
                                                 .switches, .button, .vacuum, .sensor, .other]
    private static let switchDomains: Set<String> = ["switch", "fan", "input_boolean"]
    private static let coreDomains: Set<String> = [
        "scene", "light", "climate", "media_player", "cover", "switch", "fan", "input_boolean", "button", "vacuum",
        "sensor", "binary_sensor", "humidifier",
    ]

    public struct Input {
        /// `Room.domains`; `domainOrder` is the order the web's object keeps its keys in (insertion order)
        public var domains: [String: [String]]
        public var domainOrder: [String]
        public var entity: (String) -> HAEntity?
        public var hiddenEntities: [String]
        public var editMode: Bool
        public var sentinel: Bool
        public var cameraIds: [String]
        public var storedEntityOrder: [String]?
        public var storedSectionOrder: [String]?
        public var heatingPlan: Bool

        public init(domains: [String: [String]], domainOrder: [String], entity: @escaping (String) -> HAEntity?,
                    hiddenEntities: [String] = [], editMode: Bool = false, sentinel: Bool = false, cameraIds: [String] = [],
                    storedEntityOrder: [String]? = nil, storedSectionOrder: [String]? = nil, heatingPlan: Bool = false) {
            self.domains = domains
            self.domainOrder = domainOrder
            self.entity = entity
            self.hiddenEntities = hiddenEntities
            self.editMode = editMode
            self.sentinel = sentinel
            self.cameraIds = cameraIds
            self.storedEntityOrder = storedEntityOrder
            self.storedSectionOrder = storedSectionOrder
            self.heatingPlan = heatingPlan
        }
    }

    public static func build(_ input: Input) -> (sections: [RoomSection], snapshot: [RoomSectionKey: [String]]) {
        let hidden = Set(input.hiddenEntities)
        var domainMap: [String: [String]] = [:]
        var order: [String] = []
        for domain in input.domainOrder {
            guard let ids = input.domains[domain] else { continue }
            let filtered = ids.filter { input.entity($0) != nil && (input.editMode || !hidden.contains($0)) }
            if !filtered.isEmpty {
                domainMap[domain] = filtered
                order.append(domain)
            }
        }
        if input.sentinel {
            domainMap["camera"] = nil
            order.removeAll { $0 == "camera" }
        }
        var switchIds: [String] = [], otherIds: [String] = []
        for domain in order {
            if switchDomains.contains(domain) { switchIds += domainMap[domain] ?? [] }
            else if !coreDomains.contains(domain) { otherIds += domainMap[domain] ?? [] }
        }
        let stored = input.storedEntityOrder
        func ordered(_ raw: [String]) -> [String] {
            let set = Set(raw)
            return applyStoredOrder(raw, stored?.filter { set.contains($0) })
        }
        func d(_ k: String) -> [String] { domainMap[k] ?? [] }
        let covers = d("cover")
        let isGarage = { (id: String) in Garage.isGarageDoor(input.entity(id)) }
        let snapshot: [RoomSectionKey: [String]] = [
            .scene: ordered(d("scene")),
            .light: ordered(d("light")),
            .climate: ordered(d("climate") + d("humidifier")),
            .mediaPlayer: ordered(d("media_player")),
            .cover: ordered(covers.filter { !isGarage($0) }),
            .garage: ordered(covers.filter(isGarage)),
            .switches: ordered(switchIds),
            .button: ordered(d("button")),
            .vacuum: ordered(d("vacuum")),
            .sensor: ordered(d("sensor") + d("binary_sensor")),
            .binarySensor: [],
            .other: ordered(otherIds),
        ]
        let all = displayOrder.map { key in
            RoomSection(key: key, ids: key == .nvrCameras ? (input.sentinel ? input.cameraIds : []) : snapshot[key] ?? [],
                        isSensor: key == .sensor)
        }
        let active = all.filter { !$0.ids.isEmpty || ($0.key == .climate && input.heatingPlan) }
        let storedSections = withDefaultSlot(input.storedSectionOrder, id: RoomSectionKey.garage.rawValue,
                                             anchor: RoomSectionKey.cover.rawValue)
        let sections = applyStoredOrder(active.map(\.key.rawValue), storedSections)
            .compactMap { k in active.first { $0.key.rawValue == k } }
        return (sections, snapshot)
    }

    /// `combinedEntityOrder`: the room's new entity order after one section was rearranged.
    public static func combinedEntityOrder(_ sectionKey: String, _ newIds: [String], _ snapshot: [RoomSectionKey: [String]]) -> [String] {
        var combined: [String] = []
        for key in storageOrder {
            if key.rawValue == sectionKey { combined += newIds } else if let ids = snapshot[key] { combined += ids }
        }
        return combined
    }

    /// `applyStoredOrder`: the stored ids first (in stored order), then the rest in their own order.
    public static func applyStoredOrder(_ ids: [String], _ stored: [String]?) -> [String] {
        guard let stored, !stored.isEmpty else { return ids }
        var left = Set(ids)
        var out: [String] = []
        for id in stored where left.contains(id) {
            out.append(id)
            left.remove(id)
        }
        for id in ids where left.contains(id) { out.append(id) }
        return out
    }

    /// `withDefaultSlot`: a section newer than a stored order goes right after `anchor`.
    public static func withDefaultSlot(_ stored: [String]?, id: String, anchor: String) -> [String]? {
        guard let stored, !stored.isEmpty, !stored.contains(id), let at = stored.firstIndex(of: anchor) else { return stored }
        var s = stored
        s.insert(id, at: at + 1)
        return s
    }

    /// `stripRoomName`, with JavaScript's regular expression rules (`\b` knows only ASCII letters, digits and `_`;
    /// case-insensitive per UTF-16 unit; `\s` and `trim()` with JavaScript's white space).
    public static func stripRoomName(_ name: String, _ roomName: String) -> String {
        guard !roomName.isEmpty else { return name }
        let n = Array(name.utf16), r = Array(roomName.utf16).map(JSText.canonicalize)
        func word(_ i: Int) -> Bool { i >= 0 && i < n.count && JSText.isWordUnit(n[i]) }
        func boundary(_ i: Int) -> Bool { word(i - 1) != word(i) }
        var out: [UInt16] = []
        var i = 0
        while i < n.count {
            if i + r.count <= n.count, boundary(i), boundary(i + r.count),
               (0..<r.count).allSatisfy({ JSText.canonicalize(n[i + $0]) == r[$0] }) {
                out.append(0x20)
                i += r.count
            } else {
                out.append(n[i])
                i += 1
            }
        }
        // .replace(/\s{2,}/g, ' ').trim()
        var collapsed: [UInt16] = []
        var j = 0
        while j < out.count {
            if JSText.isSpace(out[j]) {
                var k = j
                while k < out.count, JSText.isSpace(out[k]) { k += 1 }
                if k - j >= 2 { collapsed.append(0x20) } else { collapsed.append(out[j]) }
                j = k
            } else {
                collapsed.append(out[j])
                j += 1
            }
        }
        let start = collapsed.firstIndex { !JSText.isSpace($0) } ?? collapsed.count
        let end = (collapsed.lastIndex { !JSText.isSpace($0) }).map { $0 + 1 } ?? start
        let stripped = start < end ? Array(collapsed[start..<end]) : []
        return stripped.isEmpty ? name : String(decoding: stripped, as: UTF16.self)
    }
}

/// JavaScript string rules on UTF-16 units.
enum JSText {
    static func isWordUnit(_ u: UInt16) -> Bool {
        (u >= 0x30 && u <= 0x39) || (u >= 0x41 && u <= 0x5A) || (u >= 0x61 && u <= 0x7A) || u == 0x5F
    }

    /// `\s` / `String.prototype.trim` white space and line terminators.
    static func isSpace(_ u: UInt16) -> Bool {
        switch u {
        case 0x09...0x0D, 0x20, 0xA0, 0x1680, 0x2000...0x200A, 0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF: true
        default: false
        }
    }

    /// Canonicalize of a non-Unicode case-insensitive RegExp: the unit's upper case when that is one unit and does
    /// not turn a non-ASCII unit into an ASCII one.
    static func canonicalize(_ u: UInt16) -> UInt16 {
        guard !(0xD800...0xDFFF).contains(u), let scalar = Unicode.Scalar(u) else { return u }
        let upper = Array(String(Character(scalar)).uppercased().utf16)
        guard upper.count == 1, let cu = upper.first else { return u }
        if u >= 128 && cu < 128 { return u }
        return cu
    }
}
