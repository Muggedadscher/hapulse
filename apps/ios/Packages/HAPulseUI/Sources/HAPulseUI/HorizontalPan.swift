import SwiftUI

/// The state of a horizontal drag: where the finger is (in the view) and how far it moved sideways.
struct HPPanValue {
    enum Phase { case changed, ended }
    let phase: Phase
    let location: CGPoint
    let translation: CGFloat
}

#if os(iOS)
import UIKit

/// A pan that only starts when the finger moves more sideways than up or down. A SwiftUI `DragGesture` on content of a
/// `ScrollView` takes vertical drags too and stops the page from scrolling (checked on iOS 26.5, also as a
/// simultaneous gesture); this recogniser fails for vertical moves, so the page scrolls as usual.
struct HPHorizontalPan: UIGestureRecognizerRepresentable {
    let action: (HPPanValue) -> Void

    func makeUIGestureRecognizer(context: Context) -> UIPanGestureRecognizer {
        let pan = UIPanGestureRecognizer()
        pan.delegate = context.coordinator
        return pan
    }

    func handleUIGestureRecognizerAction(_ recognizer: UIPanGestureRecognizer, context: Context) {
        let location = recognizer.location(in: recognizer.view)
        let dx = recognizer.translation(in: recognizer.view).x
        switch recognizer.state {
        case .began, .changed: action(HPPanValue(phase: .changed, location: location, translation: dx))
        case .ended, .cancelled, .failed: action(HPPanValue(phase: .ended, location: location, translation: dx))
        default: break
        }
    }

    func makeCoordinator(converter: CoordinateSpaceConverter) -> Coordinator { Coordinator() }

    final class Coordinator: NSObject, UIGestureRecognizerDelegate {
        func gestureRecognizerShouldBegin(_ recognizer: UIGestureRecognizer) -> Bool {
            guard let pan = recognizer as? UIPanGestureRecognizer else { return true }
            let v = pan.velocity(in: pan.view)
            return abs(v.x) > abs(v.y)
        }
    }
}

extension View {
    /// A sideways drag that leaves vertical scrolling alone.
    func hpHorizontalPan(_ action: @escaping (HPPanValue) -> Void) -> some View {
        gesture(HPHorizontalPan(action: action))
    }
}
#else
extension View {
    func hpHorizontalPan(_ action: @escaping (HPPanValue) -> Void) -> some View {
        gesture(DragGesture(minimumDistance: 8).onChanged {
            action(HPPanValue(phase: .changed, location: $0.location, translation: $0.translation.width))
        }.onEnded {
            action(HPPanValue(phase: .ended, location: $0.location, translation: $0.translation.width))
        })
    }
}
#endif
