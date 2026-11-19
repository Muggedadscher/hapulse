import SwiftUI
import HAPulseKit
import HAPulseUI

@main
struct HAPulseApp: App {
    private let options = LaunchOptions.current

    var body: some Scene {
        WindowGroup {
            RootView(options: options)
                .preferredColorScheme(options.scheme)
                .environment(\.glasAccentHue, options.accentHue)
        }
    }
}
