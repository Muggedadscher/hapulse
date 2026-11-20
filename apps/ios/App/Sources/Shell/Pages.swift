import SwiftUI
import HAPulseKit
import HAPulseUI

/// A scrolling page on `bg`, at most 720 wide (readable on the iPad), 16 inside.
struct PageScroll<Content: View>: View {
    let content: Content
    init(@ViewBuilder content: () -> Content) { self.content = content() }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) { content }
                .padding(.horizontal, 16)
                .padding(.bottom, 32)
                .frame(maxWidth: 720)
                .frame(maxWidth: .infinity)
        }
        .background(.glas(.bg))
    }
}

/// Overview (stage 5, first part): the summary chips, the notices, then the device tiles of the frame (the overview's
/// cards follow).
/// A tile's circle switches, the rest opens the detail; a long press shows the context menu.
struct OverviewPage: View {
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session

    var body: some View {
        let devices = ShellDevice.list(session)
        PageScroll {
            if session.loaded {
                SummaryChipsRow()
                    .accessibilityIdentifier("hp.scene.shell")
                HintsSection()
                ScenesCard()

                HPTileGrid {
                    ForEach(devices) { d in
                        DeviceTileCell(device: d)
                    }
                }
            } else {
                LoadingCard()
            }
        }
    }
}

/// Shown until the first entity list has arrived.
struct LoadingCard: View {
    var body: some View {
        HPCard {
            ProgressView().frame(maxWidth: .infinity, minHeight: 160)
        }
    }
}

/// A device tile with its context menu (web `useGlasContextMenu`: switch, favourite).
struct DeviceTileCell: View {
    let device: ShellDevice
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session
    @Environment(WindowNav.self) private var nav

    var body: some View {
        let l = model.localizer
        let d = device
        let state = d.stateText(l, session)
        HPDeviceTile(icon: d.icon, room: d.room, name: d.name, state: state, isOn: d.isOn, tone: d.tone,
                     toggleLabel: l.t("home.favorites.toggleAria", ["name": .text(d.name)]),
                     openLabel: l.t("glas.devices.detailAria", ["name": .text(d.name), "room": .text(d.room ?? ""), "state": .text(state)]),
                     onToggle: { session.toggle(d.id) }, onOpen: { nav.detailID = d.id })
            .contextMenu {
                Button {
                    session.toggle(d.id)
                } label: {
                    Label { Text(l.t(d.isOn ? "glas.context.turnOff" : "glas.context.turnOn")) } icon: { HPIconImage.image("lucide.power") }
                }
                Button {
                    model.toggleFavorite(d.id)
                } label: {
                    Label { Text(l.t(model.favorites.contains(d.id) ? "glas.context.favoriteRemove" : "glas.context.favoriteAdd")) }
                        icon: { HPIconImage.image("lucide.star") }
                }
                Button {
                    nav.detailID = d.id
                } label: {
                    Label { Text(l.t("glas.context.details")) } icon: { HPIconImage.image("lucide.info") }
                }
            }
    }
}

/// A page of a later stage: only its title and icon, so the frame can be tried end to end.
struct PlaceholderPage: View {
    let page: NavPage

    var body: some View {
        PageScroll {
            HPCard {
                HPIcon(page.icon, size: 44, strokeWidth: 1.5)
                    .foregroundStyle(.glas(.label3))
                    .frame(maxWidth: .infinity, minHeight: 160)
            }
            .accessibilityIdentifier("hp.scene.page.\(page.rawValue)")
        }
    }
}
