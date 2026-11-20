import Foundation

/// How a scene tile looks (web `sceneIcon` of `ScenesCard.tsx` and `glasSceneTone`): the icon by keywords in the name,
/// the Glas colour by that icon, the plain sparkles by position.
public enum SceneLook {
    /// The lucide icon for a scene name.
    public static func icon(_ name: String) -> String {
        let n = name.lowercased()
        func has(_ words: String...) -> Bool { words.contains { n.contains($0) } }
        if has("morning", "sunrise", "wake") { return "sun" }
        if has("night", "sleep", "bed") { return "moon" }
        if has("relax", "chill", "calm") { return "sunset" }
        if has("movie", "cinema", "tv") { return "tv" }
        if has("music", "party") { return "party-popper" }
        if has("read", "study", "focus") { return "book-open" }
        if has("coffee", "breakfast") { return "coffee" }
        if has("concert", "audio", "sound") { return "music-2" }
        return "sparkles"
    }

    /// The Glas tone (`yellow`, `orange`, `teal`, `purple`, `indigo`, `blue`) of a scene at `index` in its list.
    public static func tone(_ name: String, index: Int) -> String {
        switch icon(name) {
        case "sun": "yellow"
        case "moon": "indigo"
        case "sunset", "coffee": "orange"
        case "tv", "party-popper": "purple"
        case "book-open": "blue"
        case "music-2": "teal"
        default: ["yellow", "purple", "orange", "indigo"][((index % 4) + 4) % 4]
        }
    }

    /// The name a scene tile shows: the friendly name (else the object id) with `_` as spaces.
    public static func name(_ scene: HAEntity) -> String {
        (scene.friendlyName ?? String(scene.entityId.split(separator: ".", maxSplits: 1).last ?? "")).replacingOccurrences(of: "_", with: " ")
    }
}
