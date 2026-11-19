import SwiftUI
import AuthenticationServices
import HAPulseKit
import HAPulseUI

/// Sign-in like the web's onboarding page: Home Assistant's own sign-in page (the password never reaches HAPulse),
/// the long-lived token as the advanced way, and the demo home.
struct SignInView: View {
    let app: AppController
    let localizer: Localizer
    @Environment(\.webAuthenticationSession) private var webAuth
    @State private var address = ""
    @State private var token = ""
    @State private var advanced = false

    private func t(_ key: String, _ vars: [String: I18nArg]? = nil) -> String { localizer.t(key, vars) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("HAPulse")
                        .hpText(.largeTitle)
                        .foregroundStyle(.glas(.label))
                        .accessibilityIdentifier("hp.scene.signin")
                    Text(t("onboarding.tagline"))
                        .hpText(.subhead)
                        .foregroundStyle(.glas(.label2))
                }
                .padding(.top, 40)

                HPCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(t("onboarding.urlLabel"))
                            .hpText(.footnote, weight: .semibold)
                            .foregroundStyle(.glas(.label2))
                        TextField(t("onboarding.urlPlaceholder"), text: $address)
                            .textContentType(.URL)
                            .keyboardType(.URL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .submitLabel(.go)
                            .onSubmit { Task { await signIn() } }
                            .padding(12)
                            .background(.glas(.fill), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .accessibilityIdentifier("hp.signin.url")
                        Button {
                            Task { await signIn() }
                        } label: {
                            Text(app.busy ? t("onboarding.oauthSubmitLoading") : t("onboarding.oauthSubmit"))
                                .hpText(.headline)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 6)
                        }
                        .buttonStyle(.glassProminent)
                        .disabled(app.busy)
                        .accessibilityIdentifier("hp.signin.submit")
                        Text(t("onboarding.oauthHint"))
                            .hpText(.caption1)
                            .foregroundStyle(.glas(.label2))
                    }
                }

                if let problem = app.problem {
                    Label(text(for: problem), systemImage: "exclamationmark.triangle.fill")
                        .hpText(.footnote)
                        .foregroundStyle(.glas(.red))
                        .accessibilityIdentifier("hp.signin.problem")
                }

                DisclosureGroup(t("onboarding.advancedToggle"), isExpanded: $advanced) {
                    VStack(alignment: .leading, spacing: 12) {
                        SecureField(t("onboarding.tokenLabel"), text: $token)
                            .textContentType(.password)
                            .padding(12)
                            .background(.glas(.fill), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        Button {
                            Task { await app.signInWithToken(address: address, token: token) }
                        } label: {
                            Text(t("onboarding.tokenSubmit")).frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.glass)
                        .disabled(app.busy)
                    }
                    .padding(.top, 8)
                }
                .hpText(.subhead)
                .foregroundStyle(.glas(.label))

                Text(t("onboarding.divider"))
                    .hpText(.footnote)
                    .foregroundStyle(.glas(.label2))
                    .frame(maxWidth: .infinity)

                Button {
                    Task { await app.startDemo() }
                } label: {
                    Text(t("onboarding.demoButton")).hpText(.headline).frame(maxWidth: .infinity).padding(.vertical, 6)
                }
                .buttonStyle(.glass)
                .accessibilityIdentifier("hp.signin.demo")
            }
            .padding(.horizontal, 20)
            .frame(maxWidth: 520)
            .frame(maxWidth: .infinity)
        }
        .background(.glas(.bg))
    }

    private func text(for problem: AppController.Problem) -> String {
        switch problem {
        case .missingURL: t("onboarding.errorMissingUrl")
        case .missingToken: t("onboarding.errorMissingToken")
        case .signInFailed: t("onboarding.signInFailed")
        case .tokenRejected: t("onboarding.tokenRejected")
        case .connection(let message): t("onboarding.connectionError", ["message": .text(message)])
        }
    }

    private func signIn() async {
        guard let page = await app.beginSignIn(address: address) else { return }
        do {
            let callback = try await webAuth.authenticate(using: page, callbackURLScheme: "hapulse", preferredBrowserSession: nil)
            await app.finishSignIn(callback: callback)
        } catch let e as ASWebAuthenticationSessionError where e.code == .canceledLogin {
            app.cancelSignIn()
        } catch {
            app.signInWindowFailed(error.localizedDescription)
        }
    }
}
