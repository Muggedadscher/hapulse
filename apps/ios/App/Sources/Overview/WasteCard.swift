import SwiftUI
import HAPulseKit
import HAPulseUI

/// The overview's "Waste collection" (web `WasteCard` in Glas, `.g-waste`): one list, a row per bin with its colour
/// dot, the next pickup first and stressed; a tap opens the bin window with its next dates. The page shows the section
/// only while there is a bin (`hasWaste`). The iPad variant of the web (desktop: "Next up" above the first row, the
/// date at the end) is not ported; the app shows the phone rows everywhere.
struct WasteCard: View {
    let bins: [Waste.Bin]
    @Environment(AppModel.self) private var model
    @State private var openBin: Waste.Bin?

    /// `detectWasteBins` over the visible entities, as the web passes the hidden list.
    @MainActor static func bins(_ session: HomeSession, _ l: Localizer, now: Date) -> [Waste.Bin] {
        let visible = session.visibleEntities
        let list = visible.keys.sorted().compactMap { visible[$0] }
        return Waste.bins(list, now: now, locale: Locale(identifier: l.locale.rawValue))
    }

    static func dot(_ tone: Waste.Tone) -> GlasColor {
        switch tone {
        case .info: .binPaper
        case .warning: .binYellow
        case .positive: .binBio
        case .danger: .red
        case .neutral: .binRest
        }
    }

    var body: some View {
        let l = model.localizer
        let locale = Locale(identifier: l.locale.rawValue)
        VStack(alignment: .leading, spacing: 6) {
            HPCardHead(l.t("waste.title"), icon: "lucide.trash-2")
            HPListGroup(separatorInset: 56) {
                ForEach(Array(bins.enumerated()), id: \.element.id) { index, bin in
                    let first = index == 0
                    let date = bin.nextDate.map { HintsCard.wasteDate($0, locale: locale) }
                    let countdown = Waste.countdown(bin.daysTo, l)
                    Button {
                        openBin = bin
                    } label: {
                        HStack(spacing: 0) {
                            Circle()
                                .fill(.glas(Self.dot(Waste.tone(name: bin.name, icon: bin.icon))))
                                .frame(width: 14, height: 14)
                                .overlay(Circle().strokeBorder(.glas(.sep), lineWidth: 0.5))
                                .padding(.leading, 21)
                                .padding(.trailing, 21)
                            HStack(spacing: 8) {
                                VStack(alignment: .leading, spacing: 0) {
                                    Text(verbatim: bin.name).hpText(.body, weight: first ? .semibold : nil)
                                        .foregroundStyle(.glas(.label)).lineLimit(1)
                                    if let date {
                                        Text(verbatim: date).hpText(.subhead).monospacedDigit()
                                            .foregroundStyle(.glas(.label2)).lineLimit(1)
                                    }
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                if let countdown {
                                    Text(verbatim: countdown).hpText(.body, weight: first ? .semibold : nil)
                                        .foregroundStyle(.glas(first ? .label : .label2)).lineLimit(1)
                                        .layoutPriority(1) // web `.g-waste__when`: flex none, the name shrinks
                                }
                                HPIcon("lucide.chevron-right", size: 16, strokeWidth: 2.25).foregroundStyle(.glas(.label3))
                            }
                            .padding(.vertical, 8)
                            .padding(.trailing, 12)
                        }
                        .frame(minHeight: 60)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("hp.waste.\(bin.entityId)")
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("hp.waste")
        .sheet(item: $openBin) { bin in
            WasteBinSheet(bin: bin) { openBin = nil }
        }
    }
}

/// A bin's next dates (web `WasteBinModal` in Glas): the countdown big (warn ink today/tomorrow) with the date, then
/// "Upcoming" as a list of 48 rows; a date's own type only when it differs from the bin ("(verlegt)", warn ink).
struct WasteBinSheet: View {
    let bin: Waste.Bin
    let onClose: () -> Void
    @Environment(AppModel.self) private var model

    static func headerIcon(_ icon: String?) -> String {
        if let icon, icon.hasPrefix("mdi:") {
            let name = ChipWindows.appIcon(mdi: icon)
            if IconLibrary.icon(name) != nil { return name }
        }
        return "lucide.trash-2"
    }

    static func tone(_ t: Waste.Tone) -> HPTone? {
        switch t {
        case .info: .blue
        case .warning: .yellow
        case .positive: .green
        case .danger: .red
        case .neutral: nil
        }
    }

    var body: some View {
        let l = model.localizer
        let locale = Locale(identifier: l.locale.rawValue)
        ScrollView {
            VStack(spacing: 0) {
                HPDetailHeader(icon: Self.headerIcon(bin.icon), title: bin.name, subtitle: nil,
                               tone: Self.tone(Waste.tone(name: bin.name, icon: bin.icon)),
                               closeLabel: l.t("common.close"), onClose: onClose)
                VStack(alignment: .leading, spacing: 0) {
                    if let countdown = Waste.countdown(bin.daysTo, l) {
                        VStack(alignment: .leading, spacing: 0) {
                            Text(verbatim: countdown).hpText(.title1)
                                .foregroundStyle(.glas(Waste.isSoon(bin.daysTo) ? .warnInk : .label))
                            if let next = bin.nextDate {
                                Text(verbatim: HintsCard.wasteDate(next, locale: locale)).hpText(.subhead)
                                    .foregroundStyle(.glas(.label2))
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                        .background(.glas(.group), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                        .accessibilityElement(children: .combine)
                    }
                    Text(l.t("waste.upcoming")).hpText(.subhead, weight: .semibold).foregroundStyle(.glas(.label2))
                        .padding(.horizontal, 4)
                        .padding(.top, 20)
                        .padding(.bottom, 8)
                        .accessibilityAddTraits(.isHeader)
                    if bin.upcoming.isEmpty {
                        Text(l.t("waste.noUpcoming")).hpText(.subhead).foregroundStyle(.glas(.label2))
                            .padding(.horizontal, 4)
                    } else {
                        HPListGroup(separatorInset: 43) {
                            ForEach(Array(bin.upcoming.enumerated()), id: \.offset) { _, c in
                                HStack(spacing: 12) {
                                    HPIcon("lucide.calendar-clock", size: 15, strokeWidth: 1.75).foregroundStyle(.glas(.label2))
                                    Text(verbatim: HintsCard.wasteDate(c.date, locale: locale)).hpText(.body)
                                        .foregroundStyle(.glas(.label))
                                    if let type = Waste.shownType(c, binName: bin.name) {
                                        Text(verbatim: type).hpText(.subhead, weight: .semibold).foregroundStyle(.glas(.warnInk)).lineLimit(1)
                                    }
                                    Spacer(minLength: 0)
                                }
                                .padding(.horizontal, 16)
                                .frame(minHeight: 48)
                                .accessibilityElement(children: .combine)
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
        }
        .background(.glas(.card))
        .presentationDetents([.medium, .large])
    }
}
