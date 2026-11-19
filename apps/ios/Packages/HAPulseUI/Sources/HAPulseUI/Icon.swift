import SwiftUI
import HAPulseKit

/// The path of an icon from the web's icon sets, scaled from the 24 × 24 grid into `rect`.
public struct IconShape: Shape {
    let commands: [PathCommand]

    public init(_ name: String) {
        commands = IconLibrary.commands(name)
    }

    public func path(in rect: CGRect) -> Path {
        let s = min(rect.width, rect.height) / 24
        let ox = rect.minX + (rect.width - 24 * s) / 2, oy = rect.minY + (rect.height - 24 * s) / 2
        func p(_ q: IconPoint) -> CGPoint { CGPoint(x: ox + q.x * s, y: oy + q.y * s) }
        var path = Path()
        for c in commands {
            switch c {
            case .move(let q): path.move(to: p(q))
            case .line(let q): path.addLine(to: p(q))
            case .cubic(let a, let b, let q): path.addCurve(to: p(q), control1: p(a), control2: p(b))
            case .close: path.closeSubpath()
            }
        }
        return path
    }
}

/// An icon as in the web: Lucide outlines with the stroke width the web uses at that place (`strokeWidth={1.75}` …),
/// MDI filled. Colour from `foregroundStyle`.
public struct HPIcon: View {
    let name: String
    let size: CGFloat
    let strokeWidth: CGFloat

    /// - Parameters:
    ///   - name: `lucide.<name>` or `mdi.<mdiName>` (listed in apps/ios/icons.json)
    ///   - strokeWidth: in the 24-unit grid, like Lucide's `strokeWidth`
    public init(_ name: String, size: CGFloat = 24, strokeWidth: CGFloat = 2) {
        self.name = name
        self.size = size
        self.strokeWidth = strokeWidth
    }

    public var body: some View {
        let shape = IconShape(name)
        Group {
            if IconLibrary.icon(name)?.kind == .fill {
                shape.fill(.foreground)
            } else {
                shape.stroke(.foreground, style: StrokeStyle(lineWidth: strokeWidth * size / 24, lineCap: .round, lineJoin: .round))
            }
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}
