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

/// Overview (stage 2 frame; the real overview is stage 5): summary chips and the device tiles of the session.
/// A tile's circle switches, the rest opens the detail; a long press shows the context menu.
struct OverviewPage: View {
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session

    var body: some View {
        let l = model.localizer
        let devices = ShellDevice.list(session)
        let on = devices.filter { $0.isOn && $0.domain == "light" }.count
        PageScroll {
            if session.loaded {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        HPStatusChip(icon: "lucide.lightbulb",
                                     text: on > 0 ? l.t("home.summaryChips.lightsCount", ["count": .number(Double(on))]) : l.t("home.summaryChips.allOff"),
                                     state: on > 0 ? .active(.yellow) : .normal)
                    }
                }
                .scrollClipDisabled()
                .accessibilityIdentifier("hp.scene.shell")

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

/// Rooms (stage 2 frame; the real rooms are stage 4): the session's rooms (Home Assistant areas, sorted like the
/// web) as a list, each pushes its page.
struct RoomsPage: View {
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session

    var body: some View {
        let l = model.localizer
        let rooms = session.rooms
        let devices = ShellDevice.list(session)
        PageScroll {
            if session.registries == nil {
                LoadingCard()
            } else if rooms.isEmpty {
                HPCard {
                    Text(l.t("rooms.empty")).hpText(.body).foregroundStyle(.glas(.label2))
                        .frame(maxWidth: .infinity, minHeight: 120)
                        .multilineTextAlignment(.center)
                }
                .accessibilityIdentifier("hp.scene.rooms")
            } else {
                HPListGroup(separatorInset: 60) {
                    ForEach(rooms) { room in
                        let on = devices.filter { $0.roomId == room.id && $0.isOn && $0.domain == "light" }.count
                        NavigationLink(value: room.id) {
                            HPListRow(room.name, subtitle: on > 0 ? l.t("home.summaryChips.lightsCount", ["count": .number(Double(on))])
                                                                  : l.t("home.summaryChips.allOff"),
                                      icon: "lucide.sofa", tone: on > 0 ? .yellow : nil, minHeight: 60) {
                                HPIcon("lucide.chevron-right", size: 16, strokeWidth: 2).foregroundStyle(.glas(.label3))
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
                .accessibilityIdentifier("hp.scene.rooms")
            }
        }
        .navigationDestination(for: String.self) { roomId in
            RoomPage(roomId: roomId)
        }
    }
}

/// One room: its devices as room tiles; a tap switches, a long press shows the context menu.
struct RoomPage: View {
    let roomId: String
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session
    @Environment(WindowNav.self) private var nav

    var body: some View {
        let l = model.localizer
        let devices = ShellDevice.list(session).filter { $0.roomId == roomId }
        PageScroll {
            HPTileGrid {
                ForEach(devices) { d in
                    HPRoomTile(icon: d.icon, name: d.name, state: d.stateText(l, session), chip: d.isOn ? .lit(d.tone) : .neutral) {
                        session.toggle(d.id)
                    }
                    .contextMenu {
                        Button(l.t("glas.context.details")) { nav.detailID = d.id }
                    }
                }
            }
        }
        .navigationTitle(session.rooms.first { $0.id == roomId }?.name ?? "")
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
