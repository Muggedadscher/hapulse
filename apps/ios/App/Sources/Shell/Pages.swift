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

/// Overview (stage 2 frame; the real overview is stage 5): summary chips and the device tiles of the demo home.
/// A tile's circle switches, the rest opens the detail; a long press shows the context menu.
struct OverviewPage: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let l = model.localizer
        let on = model.devices.filter { $0.isOn && $0.id.hasPrefix("light.") }.count
        PageScroll {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    HPStatusChip(icon: "lucide.lightbulb",
                                 text: on > 0 ? l.t("home.summaryChips.lightsCount", ["count": .number(Double(on))]) : l.t("home.summaryChips.allOff"),
                                 state: on > 0 ? .active(.yellow) : .normal)
                    HPStatusChip(icon: "lucide.lock", text: l.t("home.summaryChips.locksAllLocked"))
                }
            }
            .scrollClipDisabled()
            .accessibilityIdentifier("hp.scene.shell")

            HPTileGrid {
                ForEach(model.devices) { d in
                    DeviceTileCell(device: d)
                }
            }
        }
    }
}

/// A device tile with its context menu (web `useGlasContextMenu`: switch, favourite).
struct DeviceTileCell: View {
    let device: DemoDevice
    @Environment(AppModel.self) private var model
    @Environment(WindowNav.self) private var nav

    var body: some View {
        let l = model.localizer
        let d = device
        HPDeviceTile(icon: d.icon, room: d.room, name: d.name, state: d.stateText(l), isOn: d.isOn, tone: d.tone,
                     toggleLabel: l.t("home.favorites.toggleAria", ["name": .text(d.name)]),
                     openLabel: l.t("glas.devices.detailAria", ["name": .text(d.name), "room": .text(d.room ?? ""), "state": .text(d.stateText(l))]),
                     onToggle: { model.toggle(d.id) }, onOpen: { nav.detailID = d.id })
            .contextMenu {
                Button {
                    model.toggle(d.id)
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
                    Label { Text(l.t("home.favorites.detailsAria", ["name": .text(d.name)])) } icon: { HPIconImage.image("lucide.info") }
                }
            }
    }
}

/// Rooms (stage 2 frame; the real rooms are stage 4): the rooms of the demo home as a list, each pushes its page.
struct RoomsPage: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let l = model.localizer
        PageScroll {
            HPListGroup(separatorInset: 60) {
                ForEach(model.rooms, id: \.self) { room in
                    let devices = model.devices.filter { $0.room == room }
                    let on = devices.filter(\.isOn).count
                    NavigationLink(value: room) {
                        HPListRow(room, subtitle: on > 0 ? l.t("home.summaryChips.lightsCount", ["count": .number(Double(on))])
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
        .navigationDestination(for: String.self) { room in
            RoomPage(room: room)
        }
    }
}

/// One room: its devices as room tiles; a tap switches, a long press shows the context menu.
struct RoomPage: View {
    let room: String
    @Environment(AppModel.self) private var model
    @Environment(WindowNav.self) private var nav

    var body: some View {
        let l = model.localizer
        PageScroll {
            HPTileGrid {
                ForEach(model.devices.filter { $0.room == room }) { d in
                    HPRoomTile(icon: d.icon, name: d.name, state: d.stateText(l), chip: d.isOn ? .lit(d.tone) : .neutral) {
                        model.toggle(d.id)
                    }
                    .contextMenu {
                        Button(l.t("home.favorites.detailsAria", ["name": .text(d.name)])) { nav.detailID = d.id }
                    }
                }
            }
        }
        .navigationTitle(room)
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
