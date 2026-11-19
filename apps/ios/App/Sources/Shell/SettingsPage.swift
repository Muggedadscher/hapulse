import SwiftUI
import HAPulseKit
import HAPulseUI

/// Settings, stage 2 part: appearance (auto/light/dark) and language. Further sections follow with their stages.
struct SettingsPage: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model
        let l = model.localizer
        PageScroll {
            VStack(alignment: .leading, spacing: 8) {
                Text(l.t("settings.appearance.mode.label")).hpText(.subhead, weight: .semibold).foregroundStyle(.glas(.label2))
                    .padding(.horizontal, 16)
                    .accessibilityAddTraits(.isHeader)
                HPSegment([HPSegmentOption(AppearanceMode.auto, title: l.t("settings.appearance.mode.auto")),
                           HPSegmentOption(AppearanceMode.light, title: l.t("settings.appearance.mode.light")),
                           HPSegmentOption(AppearanceMode.dark, title: l.t("settings.appearance.mode.dark"))],
                          selection: $model.appearance, size: .large)
                    .accessibilityLabel(l.t("settings.appearance.mode.groupAria"))
            }
            .accessibilityIdentifier("hp.scene.settings")

            VStack(alignment: .leading, spacing: 8) {
                Text(l.t("settings.language.label")).hpText(.subhead, weight: .semibold).foregroundStyle(.glas(.label2))
                    .padding(.horizontal, 16)
                    .accessibilityAddTraits(.isHeader)
                HPListGroup {
                    languageRow("auto", title: l.t("settings.language.auto"))
                    ForEach(AppLocale.allCases, id: \.self) { locale in
                        languageRow(locale.rawValue, title: locale.label)
                    }
                }
            }
        }
    }

    private func languageRow(_ value: String, title: String) -> some View {
        let chosen = model.languagePref == value
        return Button {
            model.languagePref = value
        } label: {
            HPListRow(title) {
                if chosen {
                    HPIcon("lucide.check", size: 18, strokeWidth: 2.25).foregroundStyle(.accentPart(.accentInk))
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(chosen ? .isSelected : [])
    }
}
