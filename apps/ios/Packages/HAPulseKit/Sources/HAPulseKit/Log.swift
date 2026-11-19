import Foundation
#if canImport(os)
import os
#endif

/// App log. On Apple platforms it goes to the unified log (subsystem `de.schleerag.hapulse`), so a device's log can be
/// exported with "Diagnose teilen" later; elsewhere (Linux tests) to standard error. Success paths are logged too:
/// silence in a log was ambiguous more than once in this project.
public struct Log: Sendable {
    public let category: String

    public init(_ category: String) { self.category = category }

    public func info(_ message: String) { write("info", message) }
    public func error(_ message: String) { write("error", message) }

    private func write(_ level: String, _ message: String) {
        #if canImport(os)
        let logger = Logger(subsystem: "de.schleerag.hapulse", category: category)
        if level == "error" { logger.error("\(message, privacy: .public)") } else { logger.info("\(message, privacy: .public)") }
        #else
        FileHandle.standardError.write(Data("[\(category)] \(level): \(message)\n".utf8))
        #endif
    }
}
