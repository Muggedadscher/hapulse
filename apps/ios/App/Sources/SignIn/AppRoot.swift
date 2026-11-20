import SwiftUI
import HAPulseKit
import HAPulseUI

/// The real app: start → sign-in → the frame on the connected (or demo) session. The decisions live in
/// `AppController` (HAPulseKit, tested on Linux; one for all windows, held by `HAPulseApp`); this file only renders
/// them.
struct AppRoot: View {
    let localizer: Localizer
    /// screenshot scene (`-hp-scene`); the frame scenes start straight in the demo home
    let scene: String?
    @Environment(AppController.self) private var app

    /// Scenes that show the frame on the demo home (`signin` and no scene start normally).
    static let demoScenes: Set<String> = ["demo", "shell", "rooms", "room", "settings", "sheet"]

    var body: some View {
        Group {
            switch app.phase {
            case .starting:
                waiting
            case .signedOut:
                SignInView(app: app, localizer: localizer)
            case .signedIn:
                if let session = app.session {
                    ShellRoot(scene: scene)
                        .environment(session)
                        // a new session (sign-in again, demo) starts with a fresh navigation
                        .id(ObjectIdentifier(session))
                } else {
                    // signing out: the session is closed, the sign-in page follows once Home Assistant was told
                    waiting
                }
            }
        }
        .task {
            await app.launchIfNeeded(demo: scene.map(Self.demoScenes.contains) ?? false)
        }
    }

    private var waiting: some View {
        ProgressView()
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.glas(.bg))
    }
}

/// The frame of one window on the session, with this window's own navigation. A screenshot scene puts it on its
/// page once the entities are in.
struct ShellRoot: View {
    let scene: String?
    @Environment(HomeSession.self) private var session
    @Environment(AppModel.self) private var model
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
            .onChange(of: session.rooms.isEmpty) { _, empty in
                if !empty, sceneApplied { pushSceneRoom() }
            }
            // Home Assistant's words for states in the UI language, once connected (none in the demo: the app's own
            // words stand in)
            .task(id: "\(model.localizer.locale.rawValue)|\(session.loaded)") {
                guard session.loaded else { return }
                await session.loadStateTranslations(language: model.localizer.locale.rawValue)
            }
    }

    /// Scene "room": the first room (in the user's order) with a light on. The rooms come with the registries, which
    /// may arrive after the first entities; then this runs again when they are there.
    private func pushSceneRoom() {
        guard scene == "room", nav.roomsPath.isEmpty else { return }
        let rooms = Rooms.ordered(session.rooms, roomOrder: session.settings.strings("roomOrder"),
                                  hiddenRooms: session.settings.strings("hiddenRooms"),
                                  locale: Locale(identifier: model.localizer.locale.rawValue))
        if let room = rooms.first(where: { r in (r.domains["light"] ?? []).contains { session.entities[$0]?.state == "on" } }) ?? rooms.first {
            nav.roomsPath = [room.id]
        }
    }

    /// Puts the frame on the page a screenshot scene asks for.
    private func applyScene() {
        switch scene {
        case "rooms": nav.open(.rooms, compact: sizeClass == .compact)
        case "room":
            nav.open(.rooms, compact: sizeClass == .compact)
            pushSceneRoom()
        case "settings": nav.open(.settings, compact: sizeClass == .compact)
        case "sheet": nav.detailID = ShellDevice.list(session).first { $0.isOn }?.id
        default: break
        }
    }
}
