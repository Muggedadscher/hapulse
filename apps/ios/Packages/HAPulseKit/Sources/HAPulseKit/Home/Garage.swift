import Foundation

/// Garage doors and gates (port of `garage.ts` in `@hapulse/core`, the parts the app uses so far).
public enum Garage {
    public static let deviceClasses: Set<String> = ["garage", "gate"]

    /// A `cover.*` with device class garage or gate: handled like a lock, not like a blind.
    public static func isGarageDoor(_ e: HAEntity?) -> Bool {
        guard let e, e.entityId.hasPrefix("cover."), let dc = e.attributes["device_class"]?.string else { return false }
        return deviceClasses.contains(dc)
    }
}
