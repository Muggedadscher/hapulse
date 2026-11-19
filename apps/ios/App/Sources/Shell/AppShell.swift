import SwiftUI
import HAPulseKit
import HAPulseUI

/// The frame of the app (stage 2) as Apple intends it: a `TabView` in the style `sidebarAdaptable` (tab bar on the
/// phone, sidebar on the iPad), one `NavigationStack` per page, the entity detail as an inspector (a sheet on the
/// phone). The system draws the Liquid Glass of tab bar and sidebar; the tab bar shrinks while scrolling down.
struct AppShell: View {
    @Environment(AppModel.self) private var model
    @Environment(\.horizontalSizeClass) private var sizeClass

    /// Compact (phone, narrow iPad window): the first four pages and "More", like the web. Regular: all pages in the
    /// sidebar. (Hiding tabs with `defaultVisibility` does not hold in compact width: the system then builds its own
    /// English "More" list.)
    private var compact: Bool { sizeClass == .compact }

    var body: some View {
        @Bindable var model = model
        let l = model.localizer
        let pages = compact ? Array(NavPage.allCases.prefix(NavPage.tabBarCount)) : NavPage.allCases
        TabView(selection: $model.selection) {
            ForEach(pages) { page in
                Tab(value: page.rawValue) {
                    PageStack(page: page)
                } label: {
                    Label { Text(l.t(page.labelKey)) } icon: { HPIconImage.image(page.icon) }
                }
                .accessibilityIdentifier("hp.tab.\(page.rawValue)")
            }
            if compact {
                Tab(value: moreTabID) {
                    MoreStack()
                } label: {
                    Label { Text(l.t("nav.more")) } icon: { HPIconImage.image("lucide.ellipsis") }
                }
                .accessibilityIdentifier("hp.tab.more")
            }
        }
        .onChange(of: compact) { _, isCompact in
            // keep the page when the width class changes (iPad split view, rotation)
            if isCompact, let page = NavPage(rawValue: model.selection) {
                model.open(page, compact: true)
            } else if !isCompact, model.selection == moreTabID {
                model.selection = (model.morePath.last ?? .overview).rawValue
                model.morePath = []
            }
        }
        .tabViewStyle(.sidebarAdaptable)
        .tabBarMinimizeBehavior(.onScrollDown)
        .tint(AccentStyle(.tabInk))
        .inspector(isPresented: Binding(get: { model.detail != nil }, set: { if !$0 { model.detail = nil } })) {
            if let device = model.detail {
                DeviceDetail(device: device)
                    .presentationDetents([.medium, .large])
                    .inspectorColumnWidth(min: 320, ideal: 380, max: 440)
            }
        }
    }
}

/// One page with its own navigation stack.
struct PageStack: View {
    let page: NavPage

    var body: some View {
        NavigationStack {
            PageContent(page: page)
        }
    }
}

/// The content of a page; pages of later stages are placeholders until then.
struct PageContent: View {
    let page: NavPage
    @Environment(AppModel.self) private var model

    var body: some View {
        let l = model.localizer
        Group {
            switch page {
            case .overview: OverviewPage()
            case .rooms: RoomsPage()
            case .settings: SettingsPage()
            default: PlaceholderPage(page: page)
            }
        }
        .navigationTitle(l.t(page.labelKey))
        .navigationBarTitleDisplayMode(.large)
    }
}

/// The "More" tab's stack. A page that is no tab in compact width (selected from a link or a start option) opens
/// pushed onto it.
struct MoreStack: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model
        NavigationStack(path: $model.morePath) { MorePage() }
    }
}

/// The phone's "More" page: the pages that do not fit the tab bar, as an inset grouped list (web: more sheet).
struct MorePage: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let l = model.localizer
        ScrollView {
            HPListGroup(separatorInset: 60) {
                ForEach(NavPage.allCases.dropFirst(NavPage.tabBarCount)) { page in
                    NavigationLink(value: page) {
                        HPListRow(l.t(page.labelKey), icon: page.icon, minHeight: 52) {
                            HPIcon("lucide.chevron-right", size: 16, strokeWidth: 2).foregroundStyle(.glas(.label3))
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(16)
            .accessibilityIdentifier("hp.scene.more")
        }
        .background(.glas(.bg))
        .navigationTitle(l.t("nav.more"))
        .navigationDestination(for: NavPage.self) { page in
            PageContent(page: page)
        }
    }
}
