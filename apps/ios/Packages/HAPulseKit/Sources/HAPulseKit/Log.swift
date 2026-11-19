import Foundation
#if canImport(os)
import os
#endif

/// App log. On Apple platforms it goes to the unified log (subsystem `de.schleerag.hapulse`), elsewhere (Linux tests) to
/// standard error, and always into `LogBook`, from which "Diagnose teilen" builds its report. Success paths are logged
/// too: silence in a log was ambiguous more than once in this project.
public struct Log: Sendable {
    public let category: String

    public init(_ category: String) { self.category = category }

    public func info(_ message: String) { write("info", message) }
    public func error(_ message: String) { write("error", message) }

    private func write(_ level: String, _ message: String) {
        LogBook.shared.add(level: level, category: category, message: message)
        #if canImport(os)
        let logger = Logger(subsystem: "de.schleerag.hapulse", category: category)
        if level == "error" { logger.error("\(message, privacy: .public)") } else { logger.info("\(message, privacy: .public)") }
        #else
        FileHandle.standardError.write(Data("[\(category)] \(level): \(message)\n".utf8))
        #endif
    }
}

/// The last log lines of this app run, for the diagnostics report. Secrets are masked when a line is stored, so a
/// report can be shared as it is.
public final class LogBook: @unchecked Sendable {
    public static let shared = LogBook()

    public struct Entry: Sendable, Equatable {
        public let time: Date
        public let level: String
        public let category: String
        public let message: String
    }

    private let lock = NSLock()
    private var entries: [Entry] = []
    public let capacity: Int

    public init(capacity: Int = 2000) { self.capacity = capacity }

    public func add(level: String, category: String, message: String, time: Date = Date()) {
        let e = Entry(time: time, level: level, category: category, message: Self.mask(message))
        lock.lock(); defer { lock.unlock() }
        entries.append(e)
        if entries.count > capacity { entries.removeFirst(entries.count - capacity) }
    }

    public func snapshot() -> [Entry] {
        lock.lock(); defer { lock.unlock() }
        return entries
    }

    /// Plain-text report: a header (app, system, whatever the caller adds) and the log lines in UTC.
    public func report(header: [String: String]) -> String {
        let f = ISO8601DateFormatter()
        var out = "HAPulse Diagnose\n"
        for k in header.keys.sorted() { out += "\(k): \(Self.mask(header[k] ?? ""))\n" }
        out += "\n"
        for e in snapshot() { out += "\(f.string(from: e.time)) [\(e.category)] \(e.level): \(e.message)\n" }
        return out
    }

    /// Hides access tokens: `token=…` / `access_token=…` in URLs and JSON, `Bearer …`, and long opaque strings (JWTs).
    public static func mask(_ s: String) -> String {
        var out = s
        let patterns = [
            #"((?:access_|refresh_)?token["']?\s*[=:]\s*["']?)[^\s&"',}]+"#,
            #"(Bearer\s+)[A-Za-z0-9._~+/=-]+"#,
            #"()\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+"#,
        ]
        for p in patterns {
            guard let re = try? NSRegularExpression(pattern: p, options: [.caseInsensitive]) else { continue }
            out = re.stringByReplacingMatches(in: out, range: NSRange(out.startIndex..., in: out), withTemplate: "$1•••")
        }
        return out
    }
}
