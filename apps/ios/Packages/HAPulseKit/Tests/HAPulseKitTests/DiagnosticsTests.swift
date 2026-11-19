import Foundation
import Testing
@testable import HAPulseKit

@Suite struct DiagnosticsTests {
    @Test func masksSecrets() {
        #expect(LogBook.mask("GET /public/api/cameras?token=abc123&x=1") == "GET /public/api/cameras?token=•••&x=1")
        #expect(LogBook.mask(#"{"access_token": "secret", "type": "auth"}"#) == #"{"access_token": "•••", "type": "auth"}"#)
        #expect(LogBook.mask("Authorization: Bearer abc.def-ghi") == "Authorization: Bearer •••")
        #expect(LogBook.mask("jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc rest") == "jwt ••• rest")
        #expect(LogBook.mask("nothing secret here, 21,5 °C") == "nothing secret here, 21,5 °C")
    }

    @Test func keepsTheLastLines() {
        let book = LogBook(capacity: 3)
        for i in 0..<5 { book.add(level: "info", category: "t", message: "line \(i)", time: Date(timeIntervalSince1970: Double(i))) }
        #expect(book.snapshot().map(\.message) == ["line 2", "line 3", "line 4"])
        let report = book.report(header: ["app": "1.0 (1)", "url": "https://ha.example?token=x"])
        #expect(report.contains("app: 1.0 (1)"))
        #expect(report.contains("url: https://ha.example?token=•••"))
        #expect(report.contains("1970-01-01T00:00:04Z [t] info: line 4"))
        #expect(!report.contains("line 1"))
    }
}
