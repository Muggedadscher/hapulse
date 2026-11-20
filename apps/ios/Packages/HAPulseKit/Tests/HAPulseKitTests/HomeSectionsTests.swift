import Foundation
import Testing
@testable import HAPulseKit

/// The overview's sections (`Home.tsx`) and its room tiles (`GlasRoomTile.tsx`, `roomTone.ts`).
@Suite struct HomeSectionsTests {
    @Test func defaultOrderAndConditions() {
        let all = HomeSections.visible(order: [], hidden: [], mobileHidden: [], compact: true,
                                       hasRooms: true, hasWaste: true, hasNvr: true, hasHints: true)
        #expect(all == HomeSections.ids)
        let none = HomeSections.visible(order: [], hidden: [], mobileHidden: [], compact: true,
                                        hasRooms: false, hasWaste: false, hasNvr: false, hasHints: false)
        #expect(none == ["scenes", "hero", "energy", "devices", "climate", "blinds", "security", "activity"])
    }

    @Test func storedOrderHiddenAndMobileHidden() {
        let ids = HomeSections.visible(order: ["rooms", "scenes"], hidden: ["energy"], mobileHidden: ["activity"], compact: false,
                                       hasRooms: true, hasWaste: false, hasNvr: false, hasHints: false)
        #expect(ids == ["rooms", "scenes", "hero", "devices", "climate", "blinds", "security", "activity"])
        let phone = HomeSections.visible(order: ["rooms", "scenes"], hidden: ["energy"], mobileHidden: ["activity"], compact: true,
                                         hasRooms: true, hasWaste: false, hasNvr: false, hasHints: false)
        #expect(!phone.contains("activity"))
    }

    @Test func roomTone() {
        #expect(RoomTile.tone(iconName: "grid-2x2", isStatus: true, lightsOn: 3) == .warn)
        #expect(RoomTile.tone(iconName: "flame", isStatus: true, lightsOn: 0) == .alarm)
        #expect(RoomTile.tone(iconName: "something", isStatus: true, lightsOn: 0) == .warn)
        #expect(RoomTile.tone(iconName: "sofa", isStatus: false, lightsOn: 1) == .on)
        #expect(RoomTile.tone(iconName: "sofa", isStatus: false, lightsOn: 0) == nil)
    }

    @Test func lines() {
        let de = Localizer(locale: .de), en = Localizer(locale: .en)
        let a = RoomTile.lines(en, name: "Kitchen", iconName: "utensils", isStatus: false, temperature: 21.46, humidity: 45.4,
                               lights: 2, lightsOn: 1, devices: 7)
        #expect(a.line1 == "21.5° · 45%")
        #expect(a.line2 == "1 light on")
        #expect(a.isStatus == false)
        let b = RoomTile.lines(de, name: "Bad", iconName: "grid-2x2", isStatus: true, temperature: 20, humidity: nil,
                               lights: 1, lightsOn: 1, devices: 3)
        #expect(b.line1 == "20,0°")
        #expect(b.line2 == de.t("hints.windowOpen", ["count": 1]))
        #expect(b.isStatus)
        // no climate: the devices, and only the lights below
        let c = RoomTile.lines(en, name: "Hall", iconName: "door-open", isStatus: false, temperature: nil, humidity: nil,
                               lights: 0, lightsOn: 0, devices: 1)
        #expect(c.line1 == "1 device")
        #expect(c.line2 == nil)
        // climate and no lights: the devices below
        let d = RoomTile.lines(en, name: "Cellar", iconName: "box", isStatus: false, temperature: nil, humidity: 60,
                               lights: 0, lightsOn: 0, devices: 2)
        #expect(d.line2 == "2 devices")
        #expect(d.accessibilityLabel == en.t("home.roomsQuickAccess.roomAria", ["name": "Cellar"]) + ", 60%, 2 devices")
    }

    @Test func percentLikeIntl() {
        // The space before "%" depends on the ICU data (Node 22 and swift-foundation write U+00A0, newer CLDR
        // has U+202F in some languages), so both count as the same no-break space here.
        func p(_ v: Double, _ locale: String) -> String {
            RoomTile.percent(v, locale: locale).replacingOccurrences(of: "\u{202F}", with: "\u{00A0}")
        }
        #expect(p(45, "en") == "45%")
        #expect(p(45, "de") == "45\u{00A0}%")
        #expect(p(45.6, "en") == "46%")
        // half away from zero, like Intl
        #expect(p(44.5, "en") == "45%")
        #expect(p(45.5, "en") == "46%")
        #expect(p(46, "fr") == "46\u{00A0}%")
        #expect(p(46, "sv") == "46\u{00A0}%")
        #expect(p(46, "es") == "46\u{00A0}%")
        #expect(p(46, "it") == "46%")
        #expect(p(46, "pt") == "46%")
    }
}
