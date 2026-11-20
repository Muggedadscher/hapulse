import SwiftUI
import HAPulseKit
import HAPulseUI

/// Until the pages arrive (stage 4 onwards): who is connected, how many entities came in, sign out.
struct SessionView: View {
    let app: AppController
    let session: HomeSession
    let localizer: Localizer

    private func t(_ key: String) -> String { localizer.t(key) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(app.isDemo ? t("settings.connection.demoHome") : (session.user?.name ?? "HAPulse"))
                    .hpText(.greetingPhone)
                    .foregroundStyle(.glas(.label))
                    .accessibilityIdentifier(app.isDemo ? "hp.scene.demo" : "hp.session.title")
                HPCard {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(statusText)
                            .hpText(.subhead)
                            .foregroundStyle(.glas(.label2))
                            .accessibilityIdentifier("hp.session.status")
                        if session.loaded {
                            Text(localizer.number(Double(session.entities.entities.count)) + " " + t("settings.connection.entities"))
                                .hpText(.headline)
                                .foregroundStyle(.glas(.label))
                                .accessibilityIdentifier("hp.session.entities")
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                Button(role: .destructive) {
                    Task { await app.signOut() }
                } label: {
                    Text(t("settings.connection.signOut")).frame(maxWidth: .infinity)
                }
                .buttonStyle(.glass)
                .accessibilityIdentifier("hp.session.signout")
            }
            .padding(.horizontal, 20)
            .padding(.top, 24)
        }
        .background(.glas(.bg))
    }

    private var statusText: String {
        switch session.status {
        case .idle, .connecting: t("onboarding.connecting")
        case .connected(let version): app.isDemo ? t("settings.status.demo") : "Home Assistant \(version)"
        case .disconnected: t("banner.reconnecting")
        case .authFailed: t("onboarding.signInFailed")
        }
    }
}
