import SwiftUI

#if os(iOS)
import UIKit

/// An icon of the web's sets as a template `Image`, for places that only take images (tab bar, sidebar, `Label`).
/// Rendered once per name and size; the colour comes from the system (tint, selection).
@MainActor
public enum HPIconImage {
    private static var cache: [String: Image] = [:]

    public static func image(_ name: String, size: CGFloat = 24, strokeWidth: CGFloat = 1.75) -> Image {
        let key = "\(name)|\(size)|\(strokeWidth)"
        if let hit = cache[key] { return hit }
        // the colour only forms the mask: the image is drawn as a template
        let renderer = ImageRenderer(content: HPIcon(name, size: size, strokeWidth: strokeWidth).foregroundStyle(.black))
        renderer.scale = 3
        let image = renderer.uiImage.map { Image(uiImage: $0.withRenderingMode(.alwaysTemplate)) } ?? Image(systemName: "square")
        cache[key] = image
        return image
    }
}
#endif
