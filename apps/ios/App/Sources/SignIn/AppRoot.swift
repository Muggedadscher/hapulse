import SwiftUI
import HAPulseKit
import HAPulseUI

/// The real app: start → sign-in → connected (or demo) session. The decisions live in `AppController`
/// (HAPulseKit, tested on Linux); this file only renders them.
struct AppRoot: View {
    let localizer: Localizer
    /// screenshot scene `demo`: straight into the demo home
    var startDemo = false
    @State private var app: AppController
    @Environment(\.scenePhase) private var scenePhase

    init(localizer: Localizer, startDemo: Bool = false, controller: AppController? = nil) {
        self.localizer = localizer
        self.startDemo = startDemo
        _app = State(initialValue: controller ?? AppController(auth: HAAuth(store: KeychainTokenStore()), transport: URLSessionHATransport()))
    }

    var body: some View {
        Group {
            switch app.phase {
            case .starting:
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(.glas(.bg))
            case .signedOut:
                SignInView(app: app, localizer: localizer)
            case .signedIn:
                if let session = app.session {
                    SessionView(app: app, session: session, localizer: localizer)
                }
            }
        }
        .task {
            if startDemo { await app.startDemo() } else { await app.launch() }
        }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .background: Task { await app.pause() }
            case .active: Task { await app.resume() }
            default: break
            }
        }
    }
}
