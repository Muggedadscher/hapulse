import SwiftUI
import HAPulseKit
import HAPulseUI

/// The frame of the app (stage 2) as Apple intends it: a `TabView` in the style `sidebarAdaptable` (tab bar on the
/// phone, sidebar on the iPad), one `NavigationStack` per page, the entity detail as an inspector (a sheet on the
/// phone). The system draws the Liquid Glass of tab bar and sidebar; the tab bar shrinks while scrolling down.
struct AppShell: View {
    @Environment(AppModel.self) private var model
    @Environment(WindowNav.self) private var nav
    @Environment(\.horizontalSizeClass) private var sizeClass

    /// Compact (phone, narrow iPad window): the first four pages and "More", like the web. Regular: all pages in the
    /// sidebar. (Hiding tabs with `defaultVisibility` does not hold in compact width: the system then builds its own
    /// English "More" list.)
    private var compact: Bool { sizeClass == .compact }

    var body: some View {
        @Bindable var nav = nav
        let l = model.localizer
        let pages = compact ? Array(NavPage.allCases.prefix(NavPage.tabBarCount)) : NavPage.allCases
        TabView(selection: $nav.selection) {
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
        // another page closes the detail, as navigating does in the web
        .onChange(of: nav.selection) { nav.detailID = nil }
        .onChange(of: compact) { _, isCompact in
            // keep the page when the width class changes (iPad split view, rotation)
            if isCompact, let page = NavPage(rawValue: nav.selection) {
                nav.open(page, compact: true)
            } else if !isCompact, nav.selection == moreTabID {
                nav.selection = (nav.morePath.last ?? .overview).rawValue
                nav.morePath = []
            }
        }
        .tabViewStyle(.sidebarAdaptable)
        .tabBarMinimizeBehavior(.onScrollDown)
        .tint(AccentStyle(.tabInk))
    }
}

/// One page with its own navigation stack.
struct PageStack: View {
    let page: NavPage
    @Environment(WindowNav.self) private var nav

    var body: some View {
        NavigationStack {
            PageContent(page: page)
        }
        .detailInspector(active: nav.selection == page.rawValue)
    }
}

extension View {
    /// The entity detail as an inspector beside the page's navigation stack (a sheet on the phone). Only the visible
    /// tab presents it: tabs stay loaded, and two presentations of one detail would clash. Checked on the iPad: on the
    /// `TabView` the sidebar was pushed off screen in landscape; inside the stack the large title disappeared.
    func detailInspector(active: Bool) -> some View {
        modifier(DetailInspector(active: active))
    }
}

struct DetailInspector: ViewModifier {
    let active: Bool
    @Environment(HomeSession.self) private var session
    @Environment(WindowNav.self) private var nav

    func body(content: Content) -> some View {
        // only the visible tab looks the device up; an id without a device (entity gone) presents nothing
        let device = active ? session.device(nav.detailID) : nil
        content.inspector(isPresented: Binding(get: { device != nil }, set: { if !$0 { nav.detailID = nil } })) {
            if let device {
                DeviceDetail(device: device)
                    .presentationDetents([.medium, .large])
                    .inspectorColumnWidth(min: 320, ideal: 380, max: 440)
            }
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
    @Environment(WindowNav.self) private var nav

    var body: some View {
        @Bindable var nav = nav
        NavigationStack(path: $nav.morePath) { MorePage() }
            .detailInspector(active: nav.selection == moreTabID)
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
