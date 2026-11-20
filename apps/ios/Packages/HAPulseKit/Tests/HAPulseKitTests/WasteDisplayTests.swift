import Foundation
import Testing
@testable import HAPulseKit

/// The waste card's display rules against `wasteDisplay.ts` (expected tones taken from the web function).
@Suite struct WasteDisplayTests {
    @Test func toneLikeTheWeb() {
        let cases: [(String, String?, Waste.Tone)] = [
            ("Papiertonne", nil, .info), ("Gelber Sack", nil, .warning), ("Biotonne", nil, .positive),
            ("Restmüll", "mdi:trash-can", .neutral), ("Schadstoffmobil", nil, .danger), ("GRÜNSCHNITT", nil, .positive),
            ("Restabfall", "mdi:recycle", .warning), ("Altpapier (verlegt)", nil, .info), ("Elektroschrott", "mdi:bio", .danger),
            ("Garden waste", nil, .positive), ("Residual", nil, .neutral), ("Wertstofftonne", nil, .warning),
        ]
        for (name, icon, tone) in cases {
            #expect(Waste.tone(name: name, icon: icon) == tone, "\(name)")
        }
    }

    @Test func countdown() {
        let de = Localizer(locale: .de)
        #expect(Waste.countdown(nil, de) == nil)
        #expect(Waste.countdown(-1, de) == "Heute")
        #expect(Waste.countdown(0, de) == "Heute")
        #expect(Waste.countdown(1, de) == "Morgen")
        #expect(Waste.countdown(4, de) == "In 4 Tagen")
        let en = Localizer(locale: .en)
        #expect(Waste.countdown(2, en) == "In 2 days")
        #expect(Waste.isSoon(1) && Waste.isSoon(0) && !Waste.isSoon(2) && !Waste.isSoon(nil))
    }

    @Test func shownType() {
        let bin = "Graue Tonne"
        #expect(Waste.shownType(.init(date: "2026-11-21", type: "Graue Tonne"), binName: bin) == nil)
        #expect(Waste.shownType(.init(date: "2026-11-21", type: " Graue Tonne "), binName: bin) == nil)
        #expect(Waste.shownType(.init(date: "2026-11-21", type: nil), binName: bin) == nil)
        #expect(Waste.shownType(.init(date: "2026-11-21", type: "Graue Tonne (verlegt)"), binName: bin) == "Graue Tonne (verlegt)")
    }
}
