import SwiftUI
import HAPulseKit
import HAPulseUI

@main
struct HAPulseApp: App {
    private let options = LaunchOptions.current
    @State private var model: AppModel

    init() {
        let options = LaunchOptions.current
        _model = State(initialValue: AppModel(options: options))
    }

    var body: some Scene {
        WindowGroup {
            RootView(options: options)
                .environment(model)
                .preferredColorScheme(model.appearance.scheme)
                .environment(\.glasAccentHue, model.accentHue)
        }
    }
}
