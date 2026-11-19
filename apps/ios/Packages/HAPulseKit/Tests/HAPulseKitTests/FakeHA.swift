import Foundation
@testable import HAPulseKit

struct FakeSocket: HASocket {
    let inbox: Mailbox
    let server: FakeHA
    let connection: Int

    func send(_ text: String) async throws {
        guard await server.isOpen(connection) else { throw HAError("closed", "socket closed") }
        await server.receive(text, connection: connection)
    }

    func receive() async throws -> String {
        guard let s = await inbox.take() else { throw HAError("closed", "socket closed") }
        return s
    }

    func close() async { await server.drop(connection) }
}

/// A small Home Assistant: sign-in, ping, call_service, subscriptions. Tests can push events and drop the line.
actor FakeHA: HATransport {
    var token = "good"
    var answerPings = true
    private(set) var connections = 0
    private(set) var received: [JSONValue] = []
    private var boxes: [Int: Mailbox] = [:]
    /// subscription type → HA ids of the current connection
    private(set) var subscriptions: [String: Int] = [:]

    func setToken(_ t: String) { token = t }
    func setAnswerPings(_ on: Bool) { answerPings = on }
    /// Accepts the socket but never says `auth_required` (a hanging proxy).
    var silent = false
    func setSilent(_ on: Bool) { silent = on }
    func pushRaw(_ text: String) async { await boxes[connections]?.put(text) }

    nonisolated func open(_ url: URL) async throws -> any HASocket {
        let (n, box) = await connect()
        return FakeSocket(inbox: box, server: self, connection: n)
    }

    private func connect() async -> (Int, Mailbox) {
        connections += 1
        let box = Mailbox()
        boxes[connections] = box
        subscriptions = [:]
        if !silent { await box.put(#"{"type":"auth_required","ha_version":"2026.11.2"}"#) }
        return (connections, box)
    }

    func isOpen(_ n: Int) -> Bool { boxes[n] != nil }

    func drop(_ n: Int) async {
        guard let box = boxes.removeValue(forKey: n) else { return }
        await box.put(nil)
    }

    /// Drops the current connection like a lost network.
    func dropCurrent() async { await drop(connections) }

    func push(_ type: String, _ event: JSONValue) async {
        guard let id = subscriptions[type], let box = boxes[connections] else { return }
        await box.put(try! HAClient.encode(["id": .number(Double(id)), "type": "event", "event": event]))
    }

    func receive(_ text: String, connection n: Int) async {
        let m = try! HAClient.decode(text)
        received.append(m)
        guard let box = boxes[n] else { return }
        let id = m["id"] ?? .null
        func reply(_ r: [String: JSONValue]) async { await box.put(try! HAClient.encode(r)) }
        switch m["type"]?.string {
        case "auth":
            if m["access_token"]?.string == token {
                await reply(["type": "auth_ok", "ha_version": "2026.11.2"])
            } else {
                await reply(["type": "auth_invalid", "message": "Invalid access token or password"])
                await drop(n)
            }
        case "ping":
            if answerPings { await reply(["id": id, "type": "pong"]) }
        case "call_service":
            if m["domain"]?.string == "nope" {
                await reply(["id": id, "type": "result", "success": false,
                             "error": .object(["code": "service_not_found", "message": "Service nope.x not found."])])
            } else {
                await reply(["id": id, "type": "result", "success": true, "result": .object(["context": .object(["id": "c1"])])])
            }
        case "subscribe_entities", "subscribe_events":
            subscriptions[m["type"]!.string!] = Int(id.number!)
            await reply(["id": id, "type": "result", "success": true, "result": .null])
        case "unsubscribe_events":
            subscriptions = subscriptions.filter { Double($0.value) != m["subscription"]?.number }
            await reply(["id": id, "type": "result", "success": true, "result": .null])
        case "slow":
            break // never answers
        default:
            await reply(["id": id, "type": "result", "success": false,
                         "error": .object(["code": "unknown_command", "message": "Unknown command."])])
        }
    }
}
