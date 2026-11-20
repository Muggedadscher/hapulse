import SwiftUI
import HAPulseKit
import HAPulseUI

/// Settings, stage 2 part: appearance (auto/light/dark), accent, language and the connection (who is connected,
/// sign out). Further sections follow with their stages.
struct SettingsPage: View {
    @Environment(AppModel.self) private var model
    @Environment(AppController.self) private var app
    @Environment(HomeSession.self) private var session

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

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(l.t("settings.appearance.accent.label")).hpText(.body).foregroundStyle(.glas(.label))
                    Circle().fill(.accentPart(.accent)).frame(width: 12, height: 12).accessibilityHidden(true)
                    Spacer()
                    if model.accentHue != nil {
                        Button(l.t("settings.appearance.accent.reset")) { model.accentHue = nil }
                            .hpText(.subhead)
                            .foregroundStyle(.accentPart(.accentInk))
                            .frame(minHeight: 44)
                    }
                }
                HPHueSlider(hue: Binding(get: { model.accentHue ?? 35 }, set: { model.accentHue = $0 }),
                            label: l.t("settings.appearance.accent.hueAria"))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(.glas(.group), in: RoundedRectangle(cornerRadius: 22, style: .continuous))

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

            VStack(alignment: .leading, spacing: 8) {
                Text(l.t("settings.section.connection")).hpText(.subhead, weight: .semibold).foregroundStyle(.glas(.label2))
                    .padding(.horizontal, 16)
                    .accessibilityAddTraits(.isHeader)
                HPListGroup {
                    HPListRow(app.isDemo ? l.t("settings.connection.demoHome") : (session.user?.name ?? "Home Assistant"),
                              subtitle: statusText(l))
                        .accessibilityIdentifier("hp.session.status")
                    Button(role: .destructive) {
                        Task { await app.signOut() }
                    } label: {
                        Text(l.t("settings.connection.signOut"))
                            .hpText(.body)
                            .foregroundStyle(.glas(.redInk))
                            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                            .padding(.horizontal, 16)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("hp.session.signout")
                }
            }
        }
    }

    private func statusText(_ l: Localizer) -> String {
        switch session.status {
        case .idle, .connecting: l.t("onboarding.connecting")
        case .connected(let version): app.isDemo ? l.t("settings.status.demo") : "Home Assistant \(version)"
        case .disconnected: l.t("banner.reconnecting")
        case .authFailed: l.t("onboarding.signInFailed")
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
