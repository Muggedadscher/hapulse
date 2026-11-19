import SwiftUI
import HAPulseKit
import HAPulseUI

/// Stage 0: the app shows the catalogue of the building blocks (colours, type, icons, glass). The real pages follow
/// stage by stage (plan /mnt/project-files/ios-app/PLAN-NATIV-2026-11-19.md).
struct RootView: View {
    let options: LaunchOptions
    /// Loaded once (four JSON files), not on every `body`.
    @State private var localizer: Localizer

    init(options: LaunchOptions) {
        self.options = options
        _localizer = State(initialValue: Localizer(locale: options.locale))
    }

    var body: some View {
        CatalogView(localizer: localizer)
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("hp.root")
    }
}

/// Catalogue of the building blocks, also the scene `catalog` of the screenshot test.
struct CatalogView: View {
    let localizer: Localizer

    private let swatches: [GlasColor] = [.bg, .card, .label, .label2, .yellow, .orange, .teal, .green, .red, .blue, .purple, .indigo]
    private let icons = ["lucide.house", "lucide.door-open", "lucide.lightbulb", "lucide.thermometer", "lucide.shield",
                         "lucide.cctv", "lucide.zap", "lucide.settings", "mdi.mdiLightbulb", "mdi.mdiThermostat", "mdi.mdiGarage"]

    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text(localizer.t("home.greeting.morning"))
                        .hpText(.greetingPhone)
                        .foregroundStyle(.glas(.label))
                        .accessibilityIdentifier("hp.greeting")
                    Text(localizer.t("nav.overview") + " · " + localizer.number(1250.5) + " kWh · " + localizer.number(21, minDecimals: 1) + " °C")
                        .hpText(.subhead)
                        .foregroundStyle(.glas(.label2))

                    sectionTitle(localizer.t("nav.rooms"))
                    HPCard {
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 4), spacing: 16) {
                            ForEach(icons, id: \.self) { name in
                                HPIcon(name, size: 28, strokeWidth: 1.75)
                                    .foregroundStyle(.glas(.label))
                            }
                        }
                    }

                    sectionTitle(localizer.t("nav.energy"))
                    HPCard {
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 6), spacing: 8) {
                            ForEach(swatches, id: \.self) { key in
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .fill(.glas(key))
                                    .frame(height: 40)
                                    .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).stroke(.glas(.sep), lineWidth: 0.5))
                            }
                        }
                    }

                    sectionTitle(localizer.t("nav.settings"))
                    HPCard {
                        VStack(alignment: .leading, spacing: 6) {
                            ForEach([HPText.title2, .headline, .body, .footnote, .caption1], id: \.self) { style in
                                Text(localizer.t("nav.security")).hpText(style).foregroundStyle(.glas(.label))
                            }
                            Text(localizer.t("nav.devices")).hpText(.subhead, weight: .semibold).foregroundStyle(.accentPart(.accentInk))
                        }
                    }
                    Color.clear.frame(height: 120)
                }
                .padding(.horizontal, 16)
                .padding(.top, 24)
            }
            .background(.glas(.bg))

            // a floating glass capsule like the tab bar, over content
            HStack(spacing: 28) {
                ForEach(["lucide.house", "lucide.door-open", "lucide.shield", "lucide.zap"], id: \.self) { name in
                    HPIcon(name, size: 24, strokeWidth: 1.75).foregroundStyle(.glas(.label))
                }
            }
            .padding(.horizontal, 28)
            .padding(.vertical, 16)
            .hpGlass(in: Capsule())
            .padding(.bottom, 24)
            .accessibilityIdentifier("hp.tabbar")
        }
    }

    private func sectionTitle(_ text: String) -> some View {
        Text(text).hpText(.title3).foregroundStyle(.glas(.label)).padding(.top, 4)
    }
}
