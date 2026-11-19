import Foundation
import Testing
@testable import HAPulseKit

struct EntityStoreTests {
    @Test func matchesTheWebLibrary() throws {
        let cases = try Golden.load("entities", as: [JSONValue].self)
        var store = EntityStore()
        for (i, c) in cases.enumerated() {
            store.apply(c["event"] ?? .null)
            #expect(store.json == c["state"], "step \(i)")
        }
    }

    @Test func isoTimeLikeJavaScript() {
        #expect(ISOTime.string(ms: 0) == "1970-01-01T00:00:00.000Z")
        #expect(ISOTime.string(ms: 1_781_516_460_123) == "2026-06-15T09:41:00.123Z")
        #expect(ISOTime.string(ms: 951_782_400_000) == "2000-02-29T00:00:00.000Z")
        #expect(ISOTime.string(ms: -1) == "1969-12-31T23:59:59.999Z")
    }
}
