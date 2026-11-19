import SwiftUI
import HAPulseKit
import HAPulseUI

/// A page of the main navigation, in the web's order (`NAV_CONFIG` in apps/dashboard/src/app/AppLayout.tsx). The phone
/// tab bar shows the first four and "More", like the web; the iPad sidebar shows all.
enum NavPage: String, CaseIterable, Identifiable, Hashable {
    case overview, rooms, nvr, pool, devices, automations, energy, security, music, scenes, system, settings

    var id: String { rawValue }
    var labelKey: String { "nav.\(rawValue)" }

    var icon: String {
        switch self {
        case .overview: "lucide.house"
        case .rooms: "lucide.layout-grid"
        case .nvr: "lucide.cctv"
        case .pool: "lucide.waves-horizontal"
        case .devices: "lucide.cpu"
        case .automations: "lucide.workflow"
        case .energy: "lucide.activity"
        case .security: "lucide.shield-check"
        case .music: "lucide.music"
        case .scenes: "lucide.sparkles"
        case .system: "lucide.monitor"
        case .settings: "lucide.settings"
        }
    }

    /// How many pages the phone tab bar shows before "More" (web: `allVisibleIds.slice(4)`).
    static let tabBarCount = 4
}

/// The tab of the phone's "More" page; it is not a page of its own in the sidebar.
let moreTabID = "more"

/// Light, dark or follow the system (setting `settings.appearance.mode`).
enum AppearanceMode: String, CaseIterable, Hashable {
    case auto, light, dark

    var scheme: ColorScheme? {
        switch self {
        case .auto: nil
        case .light: .light
        case .dark: .dark
        }
    }
}

/// The app's state for the frame (stage 2): navigation, appearance, language and the demo home. The live data come
/// with the entity store of HAPulseKit (stage 1); until then the demo home stands in.
@MainActor
@Observable
final class AppModel {
    var selection: String = NavPage.overview.rawValue
    /// The pages pushed in the "More" tab (compact width).
    var morePath: [NavPage] = []

    /// Opens a page: as its tab where it is one, otherwise pushed in "More" (compact width).
    func open(_ page: NavPage, compact: Bool) {
        if compact, NavPage.allCases.firstIndex(of: page)! >= NavPage.tabBarCount {
            selection = moreTabID
            morePath = [page]
        } else {
            selection = page.rawValue
        }
    }
    var appearance: AppearanceMode {
        didSet { UserDefaults.standard.set(appearance.rawValue, forKey: "hp.appearance") }
    }
    /// "auto" or an `AppLocale` raw value.
    var languagePref: String {
        didSet {
            UserDefaults.standard.set(languagePref, forKey: "hp.language")
            localizer = Localizer(locale: Self.resolve(languagePref))
        }
    }
    private(set) var localizer: Localizer
    var devices: [DemoDevice] = DemoDevice.load()
    /// The device whose detail is open (inspector on iPad, sheet on iPhone).
    var detail: DemoDevice?
    var favorites: Set<String> = []

    init(options: LaunchOptions) {
        let storedAppearance = UserDefaults.standard.string(forKey: "hp.appearance").flatMap(AppearanceMode.init(rawValue:)) ?? .auto
        appearance = options.scheme.map { $0 == .dark ? .dark : .light } ?? storedAppearance
        let storedLanguage = UserDefaults.standard.string(forKey: "hp.language") ?? "auto"
        if options.localeGiven {
            languagePref = options.locale.rawValue
            localizer = Localizer(locale: options.locale)
        } else {
            languagePref = storedLanguage
            localizer = Localizer(locale: Self.resolve(storedLanguage))
        }
    }

    static func resolve(_ pref: String) -> AppLocale {
        I18n.resolveLanguage(pref: pref, haLanguage: nil, deviceLanguages: Locale.preferredLanguages)
    }

    var rooms: [String] {
        Array(Set(devices.compactMap(\.room))).sorted()
    }

    func toggle(_ id: String) {
        guard let i = devices.firstIndex(where: { $0.id == id }) else { return }
        let d = devices[i]
        let on = !d.isOn
        devices[i] = DemoDevice(id: d.id, name: d.name, room: d.room, isOn: on,
                                level: on ? (d.tone == .yellow ? 100 : nil) : nil, icon: d.icon, tone: d.tone)
        if detail?.id == id { detail = devices[i] }
    }

    func toggleFavorite(_ id: String) {
        if favorites.contains(id) { favorites.remove(id) } else { favorites.insert(id) }
    }
}
