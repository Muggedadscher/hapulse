import SwiftUI
import HAPulseKit

/// Start arguments for screenshots and UI tests (`-hp-scene catalog -hp-locale de -hp-scheme dark -hp-accent 210`).
/// Without them the app starts normally.
struct LaunchOptions {
    var scene: String?
    var locale: AppLocale
    /// `-hp-locale` was given (it then wins over the stored language).
    var localeGiven = false
    var scheme: ColorScheme?
    var accentHue: Double?

    static var current: LaunchOptions { parse(ProcessInfo.processInfo.arguments) }

    static func parse(_ args: [String]) -> LaunchOptions {
        func value(_ name: String) -> String? {
            guard let i = args.firstIndex(of: name), i + 1 < args.count else { return nil }
            return args[i + 1]
        }
        let device = Locale.preferredLanguages
        let locale = value("-hp-locale").flatMap(AppLocale.init(rawValue:))
            ?? I18n.resolveLanguage(pref: "auto", haLanguage: nil, deviceLanguages: device)
        let scheme: ColorScheme? = switch value("-hp-scheme") {
        case "dark": .dark
        case "light": .light
        default: nil
        }
        return LaunchOptions(scene: value("-hp-scene"), locale: locale, localeGiven: value("-hp-locale").flatMap(AppLocale.init(rawValue:)) != nil,
                             scheme: scheme, accentHue: value("-hp-accent").flatMap(Double.init))
    }
}
