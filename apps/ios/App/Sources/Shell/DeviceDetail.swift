import SwiftUI
import HAPulseKit
import HAPulseUI

/// The detail of a device in the inspector (iPad) or sheet (iPhone): head, state, switch and brightness, the day's
/// on/off history. Stage 2 shows the frame; the full detail with real history follows with the HA client.
struct DeviceDetail: View {
    let device: ShellDevice
    @Environment(AppModel.self) private var model
    @Environment(HomeSession.self) private var session
    @Environment(AppController.self) private var app
    @Environment(WindowNav.self) private var nav
    /// The level while the finger is on the slider; committed to the model on release.
    @State private var dragLevel: Double?
    /// Gives the slider back to the device's state if Home Assistant does not answer.
    @State private var holdTask: Task<Void, Never>?
    /// The finger is on the slider: a report from Home Assistant does not move it then.
    @State private var dragging = false

    var body: some View {
        let l = model.localizer
        let d = device
        ScrollView {
            VStack(spacing: 0) {
                HPDetailHeader(icon: d.icon, title: d.name, subtitle: d.room, tone: d.isOn ? d.tone : nil,
                               closeLabel: l.t("common.close")) { nav.detailID = nil }
                    .accessibilityIdentifier("hp.scene.sheet")
                VStack(alignment: .leading, spacing: 24) {
                    if !ShellDevice.runnable.contains(d.domain) {
                        HPDetailValue(d.stateText(l, session))
                    }
                    if EntityDisplay.isToggleable(d.domain) {
                        HPListGroup {
                            HPListRow(d.name, subtitle: d.room) {
                                Toggle(d.name, isOn: Binding(get: { d.isOn }, set: { _ in session.toggle(d.id) })).hpSwitch(showsLabel: false)
                            }
                        }
                    }
                    if d.dimmable {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(l.t("cards.light.brightness")).hpText(.title3).foregroundStyle(.glas(.label))
                            HPTrackSlider(value: Binding(get: { (dragLevel ?? d.level ?? 0) / 100 }, set: { dragging = true; dragLevel = ($0 * 100).rounded() }),
                                          height: 32, label: l.t("cards.light.brightness"),
                                          valueText: { l.number(($0 * 100).rounded(), maxDecimals: 0) + " %" },
                                          onCommit: { v in
                                              // the slider keeps the new value until Home Assistant reports it
                                              dragging = false
                                              session.setLevel(d.id, (v * 100).rounded())
                                              holdTask?.cancel()
                                              holdTask = Task {
                                                  try? await Task.sleep(for: .seconds(4))
                                                  if !Task.isCancelled { dragLevel = nil }
                                              }
                                          })
                        }
                    }
                    // the day's history needs Home Assistant's history API (detail stage); until then only the demo
                    // shows a fixed day, a real device shows none rather than a made-up one
                    if app.isDemo, EntityDisplay.isToggleable(d.domain) {
                        Text(l.t("entityDetail.activity")).hpText(.title3).foregroundStyle(.glas(.label))
                        HPOnOffBar(segments: demoDay, onLabel: l.t("cards.sensor.on"), tone: d.tone, locale: Locale(identifier: l.locale.rawValue))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
        }
        .background(.glas(.card))
        .onChange(of: device.level) {
            guard !dragging else { return }
            holdTask?.cancel()
            dragLevel = nil
        }
    }

    /// A fixed day of the demo home.
    private static let demoNow = (try? DemoHome.load().now) ?? .now

    private var demoDay: [HPOnOffSegment] {
        let end = Self.demoNow
        let start = end.addingTimeInterval(-24 * 3600)
        func at(_ h: Double) -> Date { start.addingTimeInterval(h * 3600) }
        return [HPOnOffSegment(start: at(0), end: at(7), state: .off),
                HPOnOffSegment(start: at(7), end: at(8.5), state: .on),
                HPOnOffSegment(start: at(8.5), end: at(18), state: .off),
                HPOnOffSegment(start: at(18), end: at(23), state: .on),
                HPOnOffSegment(start: at(23), end: at(24), state: device.isOn ? .on : .off)]
    }
}
