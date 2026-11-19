import SwiftUI
import HAPulseKit
import HAPulseUI

/// The frame of a catalogue scene: `bg`, a large title marked `hp.scene.<name>` for the screenshot test, content.
struct CatalogPage<Content: View>: View {
    let scene: String
    let title: String
    let content: Content

    init(scene: String, title: String, @ViewBuilder content: () -> Content) {
        self.scene = scene
        self.title = title
        self.content = content()
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text(title)
                    .hpText(.greetingPhone)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .foregroundStyle(.glas(.label))
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityIdentifier("hp.scene.\(scene)")
                content
            }
            .padding(.horizontal, 16)
            .padding(.top, 24)
            .padding(.bottom, 40)
            .frame(maxWidth: 720)
            .frame(maxWidth: .infinity)
        }
        .background(.glas(.bg))
    }
}

// MARK: - Controls

/// Scene `controls`: segment, switch, sliders, stepper, chips and pills, the light capsule and a swipe row.
struct ControlsScene: View {
    let l: Localizer
    @State private var page = "overview"
    @State private var range = 24
    @State private var quiet = "auto"
    @State private var switches: [String: Bool] = ["a": true, "b": false]
    @State private var brightness = 0.8
    @State private var volume = 0.35
    @State private var target = 21.5
    @State private var level = 62.0
    @State private var pill = 1
    @State private var dismissed = false
    /// Width of the range segment (web 168), grows with the text size.
    @ScaledMetric(relativeTo: .footnote) private var rangeWidth: CGFloat = 168
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        CatalogPage(scene: "controls", title: l.t("nav.quickActions")) {
            HPSection(HPCardHead(l.t("nav.overview"), icon: "lucide.layout-grid")) {
                VStack(spacing: 12) {
                    HPSegment([HPSegmentOption("overview", title: l.t("nav.overview")),
                               HPSegmentOption("rooms", title: l.t("nav.rooms")),
                               HPSegmentOption("energy", title: l.t("nav.energy"))], selection: $page)
                    HPSegment([HPSegmentOption("auto", title: l.t("home.summaryChips.poolRunning")),
                               HPSegmentOption("off", title: l.t("home.summaryChips.poolIdle"))], selection: $quiet, size: .quiet)
                    HPSegment([HPSegmentOption(24, title: "24H"), HPSegmentOption(168, title: "7D"), HPSegmentOption(720, title: "30D")],
                              selection: $range, size: .detail)
                        .frame(width: min(rangeWidth, 240))
                }
            }

            HPListGroup(separatorInset: 60) {
                ForEach(["a", "b"], id: \.self) { key in
                    HPListRow(key == "a" ? "Floor Lamp" : "Shelf Light", subtitle: "Living Room",
                              icon: "lucide.lamp", tone: switches[key] == true ? .yellow : nil, minHeight: 60) {
                        Toggle(key == "a" ? "Floor Lamp" : "Shelf Light", isOn: Binding(get: { switches[key] ?? false },
                                                                                        set: { switches[key] = $0 }))
                            .hpSwitch(showsLabel: false)
                    }
                }
            }

            HPSection(HPCardHead(l.t("cards.light.brightness"), icon: "lucide.sun")) {
                VStack(spacing: 16) {
                    HPTrackSlider(value: $brightness, label: l.t("cards.light.brightness"), valueText: percent)
                    HPTrackSlider(value: $volume, fill: AnyShapeStyle(.glas(.label2)), label: l.t("nav.music"), valueText: percent)
                }
            }

            HPSection(HPCardHead(l.t("cards.climate.target"), icon: "lucide.flame")) {
                HStack(spacing: 12) {
                    HPRoundButton(icon: "lucide.minus", label: l.t("cards.climate.decreaseAria")) { target -= 0.5 }
                    Spacer()
                    HPCapsuleStepper(value: $target, step: 0.5, range: 5...30, label: l.t("cards.climate.target"),
                                     decreaseLabel: l.t("cards.climate.decreaseAria"), increaseLabel: l.t("cards.climate.increaseAria"),
                                     valueText: { l.number($0, maxDecimals: 1, minDecimals: 1) + " °C" })
                    Spacer()
                    HPRoundButton(icon: "lucide.plus", label: l.t("cards.climate.increaseAria")) { target += 0.5 }
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    HPStatusChip(icon: "lucide.lightbulb", text: l.t("home.summaryChips.lightsCount", ["count": 5]), state: .active(.yellow))
                    HPStatusChip(icon: "lucide.lock", text: l.t("home.summaryChips.locksAllLocked"))
                    HPStatusChip(icon: "lucide.blinds", text: l.t("home.summaryChips.openCount", ["count": 2]), state: .alert)
                    HPStatusChip(icon: "lucide.tv", text: l.t("home.summaryChips.mediaCount", ["count": 1]), state: .active(.blue))
                }
            }
            .scrollClipDisabled()

            HStack(spacing: 8) {
                ForEach(0..<3, id: \.self) { i in
                    HPChoicePill([l.t("nav.scenes"), l.t("nav.automations"), l.t("nav.devices")][i], isSelected: pill == i) { pill = i }
                }
            }
            HStack(spacing: 8) {
                HPStatusPill(l.t("home.summaryChips.allClosed"))
                HPStatusPill(l.t("home.summaryChips.openCount", ["count": 1]), kind: .active)
                HPStatusPill(l.t("entityState.unavailable"), kind: .danger)
            }

            HStack(alignment: .center, spacing: 24) {
                HPLightCapsule(level: $level, label: l.t("cards.light.brightness"), valueText: percent100)
                VStack(alignment: .leading, spacing: 4) {
                    Text(percent100(level)).hpText(.largeTitle).foregroundStyle(.glas(.label))
                    Text(l.t("glas.light.onSince", ["time": "18:42"])).hpText(.subhead).foregroundStyle(.glas(.label2))
                }
            }
            .frame(maxWidth: .infinity)

            VStack(alignment: .leading, spacing: 8) {
                HPListGroup {
                    if !dismissed {
                        HPSwipeRow(actionTitle: l.t("glas.swipe.dismiss"), tone: .delete, width: 104, onAction: { dismissed = true }) {
                            HPListRow("Garage Door", subtitle: l.t("home.summaryChips.openCount", ["count": 1]),
                                      icon: "lucide.bell", tone: .orange, minHeight: 60)
                        }
                    }
                    HPSwipeRow(actionTitle: l.t("glas.swipe.off"), tone: .neutral, width: 88, onAction: {}) {
                        HPListRow("Kitchen Ceiling", subtitle: "Kitchen", icon: "lucide.lightbulb", tone: .yellow, minHeight: 60)
                    }
                }
                Text(l.t("glas.swipe.hint")).hpText(.footnote).foregroundStyle(.glas(.label2)).padding(.horizontal, 16)
            }
        }
    }

    private func percent(_ v: Double) -> String { l.number((v * 100).rounded(), maxDecimals: 0) + " %" }
    private func percent100(_ v: Double) -> String { v < 3 ? l.t("cards.sensor.off") : l.number(v.rounded(), maxDecimals: 0) + " %" }
}

// MARK: - Tiles

/// Scene `tiles`: device tiles of the overview (2 columns on the phone) and room tiles, from the demo home.
struct TilesScene: View {
    let l: Localizer
    @State private var devices = DemoDevice.load()

    var body: some View {
        CatalogPage(scene: "tiles", title: l.t("nav.devices")) {
            HPTileGrid {
                ForEach(devices.prefix(10)) { d in
                    HPDeviceTile(icon: d.icon, room: d.room, name: d.name, state: d.stateText(l), isOn: d.isOn, tone: d.tone,
                                 toggleLabel: l.t("home.favorites.toggleAria", ["name": .text(d.name)]),
                                 openLabel: l.t("glas.devices.detailAria", ["name": .text(d.name), "room": .text(d.room ?? ""),
                                                                            "state": .text(d.stateText(l))]),
                                 onToggle: { toggle(d) }, onOpen: {})
                }
            }

            HPSection(HPCardHead(l.t("nav.rooms"), icon: "lucide.sofa", link: l.t("home.climate.seeAll"), action: {})) {
                Text(l.t("nav.systemStatus.healthy")).hpText(.subhead).foregroundStyle(.glas(.label2))
            }

            HPTileGrid {
                HPRoomTile(icon: "lucide.lightbulb", name: "Ceiling Light", state: "78 %", chip: .lit(.yellow)) {}
                HPRoomTile(icon: "lucide.lock", name: "Front Door", state: l.t("home.summaryChips.locksAllLocked"), chip: .soft(.green)) {}
                HPRoomTile(icon: "lucide.blinds", name: "Bedroom Blinds", state: l.t("home.summaryChips.openCount", ["count": 1]), chip: .soft(.red)) {}
                HPRoomTile(icon: "lucide.droplets", name: "Bathroom Humidity", state: l.number(70) + " %", chip: .warn) {}
                HPRoomTile(icon: "lucide.fan", name: "Ceiling Fan", state: l.t("cards.sensor.off")) {}
                HPRoomTile(icon: "lucide.snowflake", name: "Bedroom Thermostat", state: l.number(19.8, minDecimals: 1) + " °C", chip: .lit(.blue)) {}
            }
        }
    }

    private func toggle(_ d: DemoDevice) {
        guard let i = devices.firstIndex(of: d) else { return }
        let on = !d.isOn
        devices[i] = DemoDevice(id: d.id, name: d.name, room: d.room, isOn: on, level: on ? (d.tone == .yellow ? 100 : nil) : nil,
                                icon: d.icon, tone: d.tone)
    }
}

// MARK: - Detail

/// Scene `detail`: the head, big value, range segment, value history and on/off bar of an entity detail. The history
/// is a fixed demo curve (the history API comes with the HA client in stage 1).
struct DetailScene: View {
    let l: Localizer
    @State private var range = 24
    @ScaledMetric(relativeTo: .footnote) private var rangeWidth: CGFloat = 168
    @Environment(\.dynamicTypeSize) private var typeSize

    /// 24 h of a living room temperature, one point per 30 min, ending at the demo clock (09:41 UTC).
    private var points: [HPHistoryPoint] {
        let end = (try? DemoHome.load().now) ?? Date(timeIntervalSince1970: 1_781_516_460)
        let hours = Double(range)
        let count = 48
        return (0...count).map { i in
            let t = end.addingTimeInterval(-hours * 3600 + Double(i) / Double(count) * hours * 3600)
            let phase = Double(i) / Double(count) * .pi * 2 * (hours / 24)
            return HPHistoryPoint(time: t, value: (21.0 + 1.2 * sin(phase - 1.2) + 0.25 * sin(phase * 3)).rounded(toPlaces: 1))
        }
    }

    private var onOff: [HPOnOffSegment] {
        let end = (try? DemoHome.load().now) ?? Date(timeIntervalSince1970: 1_781_516_460)
        let start = end.addingTimeInterval(-24 * 3600)
        func at(_ h: Double) -> Date { start.addingTimeInterval(h * 3600) }
        return [HPOnOffSegment(start: at(0), end: at(6.5), state: .off),
                HPOnOffSegment(start: at(6.5), end: at(8), state: .on),
                HPOnOffSegment(start: at(8), end: at(17), state: .off),
                HPOnOffSegment(start: at(17), end: at(18), state: .unavailable),
                HPOnOffSegment(start: at(18), end: at(23.2), state: .on),
                HPOnOffSegment(start: at(23.2), end: at(24), state: .off)]
    }

    var body: some View {
        CatalogPage(scene: "detail", title: l.t("entityDetail.history")) {
            VStack(spacing: 0) {
                HPDetailHeader(icon: "lucide.thermometer", title: "Living Room Temperature", subtitle: "Living Room",
                               tone: .orange, closeLabel: l.t("common.close"), onClose: {})
                VStack(alignment: .leading, spacing: 24) {
                    HPDetailValue(l.number(21.4, minDecimals: 1) + " °C", when: l.t("common.time.minutesAgo", ["count": 4]))
                    // title and range side by side; stacked with the accessibility text sizes
                    let stacked = typeSize.isAccessibilitySize
                    let layout = stacked ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12)) : AnyLayout(HStackLayout())
                    layout {
                        Text(l.t("entityDetail.history")).hpText(.title3).foregroundStyle(.glas(.label))
                        if !stacked { Spacer() }
                        HPSegment([HPSegmentOption(24, title: "24H"), HPSegmentOption(168, title: "7D"), HPSegmentOption(720, title: "30D")],
                                  selection: $range, size: .detail)
                            .frame(width: stacked ? nil : min(rangeWidth, 240))
                            .frame(maxWidth: stacked ? .infinity : nil)
                    }
                    HPHistoryChart(points: points, tone: .orange, locale: Locale(identifier: l.locale.rawValue),
                                   emptyText: l.t("entityDetail.historyEmpty")) { l.number($0, minDecimals: 1) + " °C" }
                    Text(l.t("entityDetail.activity")).hpText(.title3).foregroundStyle(.glas(.label))
                    HPOnOffBar(segments: onOff, onLabel: l.t("cards.sensor.on"), locale: Locale(identifier: l.locale.rawValue))
                    HPListGroup {
                        HPListRow(l.t("home.activity.lightOn"), subtitle: "18:00", icon: "lucide.lightbulb", tone: .yellow)
                        HPListRow(l.t("entityState.unavailable"), subtitle: "17:00", icon: "lucide.info")
                        HPListRow(l.t("home.activity.lightOff"), subtitle: "08:00", icon: "lucide.lightbulb")
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)
            }
            .background(.glas(.card), in: RoundedRectangle(cornerRadius: 26, style: .continuous))
        }
    }
}

private extension Double {
    func rounded(toPlaces p: Int) -> Double {
        let f = pow(10, Double(p))
        return (self * f).rounded() / f
    }
}
