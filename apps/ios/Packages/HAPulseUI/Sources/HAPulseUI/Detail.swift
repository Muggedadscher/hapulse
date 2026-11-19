import SwiftUI
import Charts

// MARK: - Header

/// The head of an entity detail (web `GlasDetailHead`): 44 | title | 44. Left the state tile 40 (radius 12), centre
/// title 600 17/22 and subtitle 13/18 `label2`, right a close button (32 circle in `fill`, hit area 44).
public struct HPDetailHeader: View {
    let icon: String
    let title: String
    let subtitle: String?
    let tone: HPTone?
    let closeLabel: String
    let onClose: () -> Void

    /// - Parameter tone: lit state colour; nil = off (`fill` / `label2`)
    public init(icon: String, title: String, subtitle: String? = nil, tone: HPTone?, closeLabel: String, onClose: @escaping () -> Void) {
        self.icon = icon
        self.title = title
        self.subtitle = subtitle
        self.tone = tone
        self.closeLabel = closeLabel
        self.onClose = onClose
    }

    public var body: some View {
        HStack(spacing: 0) {
            HPIcon(icon, size: 22, strokeWidth: 1.75)
                .foregroundStyle(tone?.glyph ?? AnyShapeStyle(.glas(.label2)))
                .frame(width: 40, height: 40)
                .background(tone?.fill ?? AnyShapeStyle(.glas(.fill)), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .frame(width: 44, height: 44)
                .accessibilityHidden(true)
            VStack(spacing: 0) {
                Text(title).hpText(.headline).foregroundStyle(.glas(.label)).lineLimit(1)
                if let subtitle {
                    Text(subtitle).hpText(.footnote).foregroundStyle(.glas(.label2)).lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity)
            .accessibilityElement(children: .combine)
            .accessibilityAddTraits(.isHeader)
            Button(action: onClose) {
                HPIcon("lucide.x", size: 18, strokeWidth: 2.25)
                    .foregroundStyle(.glas(.label2))
                    .frame(width: 32, height: 32)
                    .background(.glas(.fill), in: Circle())
                    .frame(width: 44, height: 44)
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(closeLabel)
        }
        .padding(.top, 16)
        .padding(.horizontal, 14)
        .padding(.bottom, 6)
    }
}

/// The big value of a detail (web `.g-detail-state__value`): 700 22/28 `label`, the "when" 13/18 `label2` on the right.
public struct HPDetailValue: View {
    let value: String
    let when: String?

    public init(_ value: String, when: String? = nil) {
        self.value = value
        self.when = when
    }

    public var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(value).hpText(.title2).foregroundStyle(.glas(.label))
            Spacer(minLength: 8)
            if let when {
                Text(when).hpText(.footnote).foregroundStyle(.glas(.label2))
            }
        }
        .accessibilityElement(children: .combine)
    }
}

// MARK: - History chart

/// A measured value at a time.
public struct HPHistoryPoint: Identifiable, Sendable, Hashable {
    public let time: Date
    public let value: Double
    public var id: Date { time }
    public init(time: Date, value: Double) {
        self.time = time
        self.value = value
    }
}

/// The value history of a detail (web line chart): the area in the tone at 22 %, the line 2.5 in the tone's ink, the
/// y range min…max with 10 % padding, max and min written on the right (12/16 `label2`), 5 time ticks below
/// (HH:MM, short weekday beyond 48 h). Sits on a `group` surface, radius 22, padding 14 14 10. Swift Charts brings
/// the audio graph for VoiceOver.
public struct HPHistoryChart: View {
    let points: [HPHistoryPoint]
    let tone: HPTone
    let height: CGFloat
    let valueText: (Double) -> String
    let emptyText: String
    let locale: Locale

    public init(points: [HPHistoryPoint], tone: HPTone = .accent, height: CGFloat = 120, locale: Locale,
                emptyText: String, valueText: @escaping (Double) -> String) {
        self.points = points
        self.tone = tone
        self.height = height
        self.locale = locale
        self.emptyText = emptyText
        self.valueText = valueText
    }

    private var domain: ClosedRange<Double> {
        let values = points.map(\.value)
        guard let lo = values.min(), let hi = values.max() else { return 0...1 }
        let pad = max((hi - lo) * 0.1, 0.5)
        return (lo - pad)...(hi + pad)
    }

    /// 5 ticks spread evenly over the shown time (web: 5 ticks).
    private var ticks: [Date] {
        guard let a = points.first?.time else { return [] }
        return (0...4).map { a.addingTimeInterval(span * Double($0) / 4) }
    }

    private var span: TimeInterval {
        guard let a = points.first?.time, let b = points.last?.time else { return 0 }
        return b.timeIntervalSince(a)
    }

    public var body: some View {
        Group {
            if points.count < 2 {
                Text(emptyText)
                    .hpText(.subhead)
                    .foregroundStyle(.glas(.label2))
                    .frame(maxWidth: .infinity, minHeight: height)
            } else {
                chart
            }
        }
        .padding(.top, 14)
        .padding(.horizontal, 14)
        .padding(.bottom, 10)
        .background(.glas(.group), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
    }

    private var chart: some View {
        let lo = domain.lowerBound
        let values = points.map(\.value)
        return HStack(alignment: .top, spacing: 8) {
            Chart(points) { p in
                AreaMark(x: .value("t", p.time), yStart: .value("v", lo), yEnd: .value("v", p.value))
                    .foregroundStyle(tone.fill)
                    .opacity(0.22)
                    .interpolationMethod(.monotone)
                LineMark(x: .value("t", p.time), y: .value("v", p.value))
                    .foregroundStyle(tone.ink)
                    .lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
                    .interpolationMethod(.monotone)
            }
            .chartYScale(domain: domain)
            .chartYAxis(.hidden)
            .chartXScale(domain: (points.first?.time ?? .now)...(points.last?.time ?? .now))
            .chartXAxis {
                AxisMarks(values: ticks) { v in
                    let i = v.index
                    AxisValueLabel(anchor: i == 0 ? .topLeading : i == v.count - 1 ? .topTrailing : .top) {
                        if let d = v.as(Date.self) {
                            Text(span > 48 * 3600 ? d.formatted(.dateTime.weekday(.abbreviated).locale(locale))
                                                  : d.formatted(.dateTime.hour(.twoDigits(amPM: .omitted)).minute(.twoDigits).locale(locale)))
                                .hpText(.caption1)
                                .foregroundStyle(.glas(.label2))
                                .fixedSize()
                        }
                    }
                }
            }
            .frame(height: height + 24)
            VStack(alignment: .trailing) {
                Text(valueText(values.max() ?? 0))
                Spacer()
                Text(valueText(values.min() ?? 0))
            }
            .hpText(.caption1)
            .foregroundStyle(.glas(.label2))
            .frame(height: height)
            .accessibilityHidden(true)
        }
    }
}

// MARK: - On/off bar

/// A stretch of an on/off history.
public struct HPOnOffSegment: Identifiable, Sendable, Hashable {
    public enum State: Sendable { case on, off, unavailable }
    public let start: Date
    public let end: Date
    public let state: State
    public var id: Date { start }
    public init(start: Date, end: Date, state: State) {
        self.start = start
        self.end = end
        self.state = state
    }
}

/// The on/off history of a switchable entity (web: not a bar chart but one bar): 36 high, radius 10, `fill`; on
/// stretches yellow, unavailable ones `fill2`. The on label sits on the longest on stretch if it covers more than 18 %.
public struct HPOnOffBar: View {
    let segments: [HPOnOffSegment]
    let onLabel: String
    let tone: HPTone
    let locale: Locale

    /// - Parameter locale: for the times VoiceOver reads ("On: 07:00–08:30, 18:00–23:00")
    public init(segments: [HPOnOffSegment], onLabel: String, tone: HPTone = .yellow, locale: Locale = .current) {
        self.segments = segments
        self.onLabel = onLabel
        self.tone = tone
        self.locale = locale
    }

    /// The on stretches as times, for VoiceOver; empty when it was never on.
    private var onRanges: String {
        let time = Date.FormatStyle.dateTime.hour(.twoDigits(amPM: .omitted)).minute(.twoDigits).locale(locale)
        return segments.filter { $0.state == .on }
            .map { "\($0.start.formatted(time))–\($0.end.formatted(time))" }
            .joined(separator: ", ")
    }

    public var body: some View {
        GeometryReader { geo in
            let start = segments.first?.start ?? .now
            let total = max((segments.last?.end ?? .now).timeIntervalSince(start), 1)
            let longest = segments.filter { $0.state == .on }.max { $0.end.timeIntervalSince($0.start) < $1.end.timeIntervalSince($1.start) }
            ZStack(alignment: .leading) {
                Rectangle().fill(.glas(.fill))
                ForEach(segments.filter { $0.state != .off }) { s in
                    let x = s.start.timeIntervalSince(start) / total * geo.size.width
                    let w = s.end.timeIntervalSince(s.start) / total * geo.size.width
                    Rectangle()
                        .fill(s.state == .on ? tone.fill : AnyShapeStyle(.glas(.fill2)))
                        .frame(width: max(w, 1))
                        .overlay {
                            if s == longest, w / geo.size.width > 0.18 {
                                Text(onLabel).hpText(.footnote, weight: .semibold).foregroundStyle(tone.glyph).lineLimit(1)
                            }
                        }
                        .offset(x: x)
                }
            }
        }
        .frame(height: 36)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(onLabel)
        .accessibilityValue(onRanges.isEmpty ? "0" : onRanges)
    }
}
