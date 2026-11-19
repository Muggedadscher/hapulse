import Foundation

/// Area, device and entity registry of Home Assistant (`config/*_registry/list`), the fields `@hapulse/core` uses.
public struct AreaEntry: Equatable, Sendable {
    public var areaId: String
    public var name: String
    public var icon: String?
    public var picture: String?
}

public struct DeviceEntry: Equatable, Sendable {
    public var id: String
    public var areaId: String?
    public var name: String?
    public var nameByUser: String?
    public var manufacturer: String?
    public var model: String?
}

public struct EntityEntry: Equatable, Sendable {
    public var entityId: String
    public var areaId: String?
    public var deviceId: String?
    public var entityCategory: String?
    public var hiddenBy: String?
    public var disabledBy: String?
    public var originalName: String?
    public var icon: String?
    public var platform: String?
    public var translationKey: String?
    public var labels: [String]
}

public struct Registries: Equatable, Sendable {
    public var areas: [AreaEntry]
    public var devices: [DeviceEntry]
    public var entities: [EntityEntry]

    public init(areas: [AreaEntry] = [], devices: [DeviceEntry] = [], entities: [EntityEntry] = []) {
        self.areas = areas
        self.devices = devices
        self.entities = entities
    }

    /// From the three list answers. A missing or `null` field is nil (older Home Assistant leaves fields out).
    public init(areas: JSONValue, devices: JSONValue, entities: JSONValue) {
        func str(_ o: [String: JSONValue], _ k: String) -> String? { o[k]?.string }
        self.areas = (areas.array ?? []).compactMap { v in
            guard let o = v.object, let id = str(o, "area_id") else { return nil }
            return AreaEntry(areaId: id, name: str(o, "name") ?? id, icon: str(o, "icon"), picture: str(o, "picture"))
        }
        self.devices = (devices.array ?? []).compactMap { v in
            guard let o = v.object, let id = str(o, "id") else { return nil }
            return DeviceEntry(id: id, areaId: str(o, "area_id"), name: str(o, "name"), nameByUser: str(o, "name_by_user"),
                               manufacturer: str(o, "manufacturer"), model: str(o, "model"))
        }
        self.entities = (entities.array ?? []).compactMap { v in
            guard let o = v.object, let id = str(o, "entity_id") else { return nil }
            return EntityEntry(entityId: id, areaId: str(o, "area_id"), deviceId: str(o, "device_id"),
                               entityCategory: str(o, "entity_category"), hiddenBy: str(o, "hidden_by"),
                               disabledBy: str(o, "disabled_by"), originalName: str(o, "original_name"), icon: str(o, "icon"),
                               platform: str(o, "platform"), translationKey: str(o, "translation_key"),
                               labels: (o["labels"]?.array ?? []).compactMap(\.string))
        }
    }
}
