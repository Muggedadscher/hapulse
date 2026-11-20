import SwiftUI
import HAPulseKit
import HAPulseUI

@main
struct HAPulseApp: App {
    private let options = LaunchOptions.current
    @State private var model: AppModel
    /// One sign-in and one connection for the whole app; every window (iPad) shows the same session.
    @State private var app: AppController
    @Environment(\.scenePhase) private var scenePhase

    init() {
        let options = LaunchOptions.current
        _model = State(initialValue: AppModel(options: options))
        // screenshot scenes never read or write the real sign-in in the Keychain
        let store: any HATokenStore = options.scene == nil ? KeychainTokenStore() : MemoryTokenStore()
        _app = State(initialValue: AppController(auth: HAAuth(store: store), transport: URLSessionHATransport()))
    }

    var body: some Scene {
        WindowGroup {
            RootView(options: options)
                .environment(model)
                .environment(app)
                .preferredColorScheme(model.appearance.scheme)
                .environment(\.glasAccentHue, model.accentHue)
        }
        // the app's phase (all windows), not one window's: a window in the background must not cut the connection
        // of the visible one
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .background: Task { await app.pause() }
            case .active: Task { await app.resume() }
            default: break
            }
        }
    }
}
