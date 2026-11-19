import Foundation
import Testing
@testable import HAPulseKit

/// Collects values from @Sendable callbacks.
final class Bag<T: Sendable>: @unchecked Sendable {
    private let lock = NSLock()
    private var items: [T] = []
    func add(_ v: T) { lock.lock(); items.append(v); lock.unlock() }
    var all: [T] { lock.lock(); defer { lock.unlock() }; return items }
}

func eventually(_ what: String = "", timeout: Duration = .seconds(3), _ check: () async -> Bool) async throws {
    let clock = ContinuousClock()
    let end = clock.now.advanced(by: timeout)
    while clock.now < end {
        if await check() { return }
        try await Task.sleep(for: .milliseconds(5))
    }
    Issue.record("timed out waiting: \(what)")
}

@Suite(.serialized)
struct HAClientTests {
    func makeClient(_ ha: FakeHA, token: String = "good") throws -> HAClient {
        var o = HAClient.Options()
        o.retryDelays = [.milliseconds(10), .milliseconds(20)]
        o.commandTimeout = .milliseconds(300)
        o.pingInterval = .seconds(3600)
        return try HAClient(baseURL: URL(string: "https://ha.example:8123/")!, transport: ha, token: { token }, options: o)
    }

    func connected(_ c: HAClient) async -> Bool {
        if case .connected = await c.status { return true }
        return false
    }

    @Test func websocketURL() {
        #expect(HAURL.websocket(URL(string: "https://ha.example:8123/")!)?.absoluteString == "wss://ha.example:8123/api/websocket")
        #expect(HAURL.websocket(URL(string: "http://192.168.2.10:8123")!)?.absoluteString == "ws://192.168.2.10:8123/api/websocket")
        #expect(HAURL.websocket(URL(string: "https://x.de/ha/?a=1")!)?.absoluteString == "wss://x.de/ha/api/websocket")
        #expect(HAURL.websocket(URL(string: "ftp://x.de")!) == nil)
    }

    @Test func signsInAndCallsServices() async throws {
        let ha = FakeHA()
        let c = try makeClient(ha)
        await c.start()
        try await eventually("connected") { await connected(c) }
        #expect(await c.haVersion == "2026.11.2")
        let r = try await c.callService("light", "turn_on", data: ["brightness": 128], target: ["entity_id": "light.kitchen"])
        #expect(r["context"]?["id"] == "c1")
        let sent = await ha.received.last
        #expect(sent?["service_data"]?["brightness"] == 128)
        #expect(sent?["target"]?["entity_id"] == "light.kitchen")
        await #expect(throws: HAError("service_not_found", "Service nope.x not found.")) {
            try await c.callService("nope", "x")
        }
        await #expect(throws: HAError.timeout) { try await c.command(["type": "slow"]) }
        await c.stop()
    }

    @Test func wrongTokenStopsRetrying() async throws {
        let ha = FakeHA()
        let c = try makeClient(ha, token: "bad")
        await c.start()
        try await eventually("authFailed") {
            if case .authFailed = await c.status { return true }
            return false
        }
        try await Task.sleep(for: .milliseconds(80))
        #expect(await ha.connections == 1)
        await #expect(throws: HAError.notConnected) { try await c.command(["type": "ping"]) }
    }

    @Test func subscriptionsSurviveAReconnect() async throws {
        let ha = FakeHA()
        let c = try makeClient(ha)
        let events = Bag<JSONValue>()
        _ = try await c.subscribe(["type": "subscribe_entities"]) { events.add($0) }
        await c.start()
        try await eventually("subscribed") { await ha.subscriptions["subscribe_entities"] != nil }
        await ha.push("subscribe_entities", .object(["a": .object([:])]))
        try await eventually("first event") { events.all.count == 1 }

        await ha.dropCurrent()
        try await eventually("reconnected") { await ha.connections == 2 }
        try await eventually("subscribed again") { await ha.subscriptions["subscribe_entities"] != nil }
        try await eventually("connected") { await connected(c) }
        await ha.push("subscribe_entities", .object(["r": .array(["x.y"])]))
        try await eventually("second event") { events.all.count == 2 }
        #expect(events.all.last?["r"] == .array(["x.y"]))
        await c.stop()
    }

    @Test func unsubscribeStopsEvents() async throws {
        let ha = FakeHA()
        let c = try makeClient(ha)
        await c.start()
        try await eventually("connected") { await connected(c) }
        let events = Bag<JSONValue>()
        let sub = try await c.subscribe(["type": "subscribe_events", "event_type": "state_changed"]) { events.add($0) }
        await ha.push("subscribe_events", .object(["n": 1]))
        try await eventually("event") { events.all.count == 1 }
        await c.unsubscribe(sub)
        #expect(await ha.subscriptions["subscribe_events"] == nil)
        #expect(await ha.received.last?["type"] == "unsubscribe_events")
        await c.stop()
    }

    @Test func missingPongReconnects() async throws {
        let ha = FakeHA()
        await ha.setAnswerPings(false)
        var o = HAClient.Options()
        o.retryDelays = [.milliseconds(10)]
        o.commandTimeout = .milliseconds(50)
        o.pingInterval = .milliseconds(30)
        let c = try HAClient(baseURL: URL(string: "http://ha.local:8123")!, transport: ha, token: { "good" }, options: o)
        let statuses = Bag<HAConnectionStatus>()
        let watch = Task { for await s in await c.statusUpdates() { statuses.add(s) } }
        await c.start()
        try await eventually("reconnect after missing pong") { await ha.connections >= 2 }
        #expect(statuses.all.contains { if case .disconnected = $0 { return true }; return false })
        await c.stop()
        watch.cancel()
    }
}

@MainActor
func eventuallyMain(_ what: String = "", timeout: Duration = .seconds(3), _ check: @MainActor () -> Bool) async throws {
    let clock = ContinuousClock()
    let end = clock.now.advanced(by: timeout)
    while clock.now < end {
        if check() { return }
        try await Task.sleep(for: .milliseconds(5))
    }
    Issue.record("timed out waiting: \(what)")
}
