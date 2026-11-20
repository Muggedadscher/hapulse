import SwiftUI
import HAPulseKit
import HAPulseUI

/// The real app: start → sign-in → the frame on the connected (or demo) session. The decisions live in
/// `AppController` (HAPulseKit, tested on Linux); this file only renders them.
struct AppRoot: View {
    let localizer: Localizer
    /// screenshot scene (`-hp-scene`); the frame scenes start straight in the demo home
    let scene: String?
    @State private var app: AppController
    @Environment(\.scenePhase) private var scenePhase

    /// Scenes that show the frame on the demo home (`signin` and no scene start normally).
    static let demoScenes: Set<String> = ["demo", "shell", "rooms", "settings", "sheet"]

    init(localizer: Localizer, scene: String? = nil, controller: AppController? = nil) {
        self.localizer = localizer
        self.scene = scene
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
                    ShellRoot(scene: scene)
                        .environment(app)
                        .environment(session)
                        // a new session (sign-in again, demo) starts with a fresh navigation
                        .id(ObjectIdentifier(session))
                }
            }
        }
        .task {
            if let scene, Self.demoScenes.contains(scene) { await app.startDemo() } else { await app.launch() }
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

/// The frame of one window on the session, with this window's own navigation. A screenshot scene puts it on its
/// page once the entities are in.
struct ShellRoot: View {
    let scene: String?
    @Environment(HomeSession.self) private var session
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var nav = WindowNav()
    @State private var sceneApplied = false

    var body: some View {
        AppShell()
            .environment(nav)
            .onChange(of: session.loaded, initial: true) { _, loaded in
                guard loaded, !sceneApplied else { return }
                sceneApplied = true
                applyScene()
            }
    }

    /// Puts the frame on the page a screenshot scene asks for.
    private func applyScene() {
        switch scene {
        case "rooms": nav.open(.rooms, compact: sizeClass == .compact)
        case "settings": nav.open(.settings, compact: sizeClass == .compact)
        case "sheet": nav.detailID = ShellDevice.list(session).first { $0.isOn }?.id
        default: break
        }
    }
}
