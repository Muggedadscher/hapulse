import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
import Testing
@testable import HAPulseKit
@testable import SentinelKit

actor FakeSentinel: SentinelHTTP {
    private(set) var requests: [URLRequest] = []
    var answers: [String: (Int, String, String)] = [:] // path suffix → status, content type, body

    func set(_ path: String, _ status: Int, _ body: String, type: String = "application/json") { answers[path] = (status, type, body) }

    func send(_ request: URLRequest) async throws -> (status: Int, contentType: String?, body: Data) {
        requests.append(request)
        let path = request.url?.path ?? ""
        for (k, v) in answers where path.hasSuffix(k) { return (v.0, v.1, Data(v.2.utf8)) }
        throw URLError(.cannotConnectToHost)
    }
}

struct SentinelTests {
    let g: JSONValue
    init() throws { g = try Golden.load("sentinel", as: JSONValue.self) }

    @Test func setupLikeThePackage() {
        for c in g["setup"]?.array ?? [] {
            let out = SentinelSetup.parse(c["input"]?.string).map {
                JSONValue.object(["origin": .string($0.origin), "prefix": .string($0.prefix), "token": $0.token.map(JSONValue.string) ?? .null])
            } ?? .null
            #expect(out == c["out"], "\(c["input"]?.string ?? "")")
        }
    }

    @Test func urlsLikeThePackage() {
        for c in g["urls"]?.array ?? [] {
            let o = c["origin"]!.string!, p = c["prefix"]!.string!
            #expect(SentinelURL.publicBase(origin: o, prefix: p) == c["publicBase"]?.string)
            #expect(SentinelURL.loginBase(origin: o, prefix: p) == c["loginBase"]?.string)
            #expect(SentinelURL.url(base: SentinelURL.publicBase(origin: o, prefix: p), token: c["token"]!.string!, path: c["path"]!.string!) == c["url"]?.string)
            #expect(SentinelURL.timelineLink(origin: o, cameraId: "cam 3/ä", atMs: 1781516460123.6, prefix: p) == c["timeline"]?.string)
            #expect(SentinelURL.timelineLink(origin: o, cameraId: "33", prefix: p) == c["timelineNow"]?.string)
        }
        let cl = SentinelClient(origin: "https://h:10443", token: "t/k n", prefix: "/p")
        let x = g["client"] ?? .null
        #expect(cl.base == x["base"]?.string)
        #expect(cl.entryURL == x["entry"]?.string)
        #expect(cl.snapshotURL(camera: "33") == x["snapshot"]?.string)
        #expect(cl.snapshotURL(camera: "a b", bust: 1781516460123, width: 640.4) == x["snapshotW"]?.string)
        #expect(cl.eventThumbURL(camera: "33", ts: 1781516460123.5) == x["evthumb"]?.string)
        #expect(cl.eventFrameURL(camera: "33", ts: 17) == x["evframe"]?.string)
        #expect(cl.segmentThumbURL("x/y") == x["thumb"]?.string)
        #expect(cl.signalingURL(camera: "33") == x["signaling"]?.string)
        #expect(cl.signalingURL(camera: "3 3", params: [("compat", "1"), ("noaudio", "a&b")]) == x["signalingParams"]?.string)
    }

    @Test func recordingState() {
        for c in g["states"]?.array ?? [] {
            let cam = SentinelCamera(id: "1", name: "x", recording: c["cam"]?["recording"]?.bool ?? false,
                                     online: c["cam"]?["online"]?.bool ?? false, stalled: c["cam"]?["stalled"]?.bool, eventsToday: 0)
            #expect(cam.recordingState.rawValue == c["out"]?.string)
        }
    }

    @Test func requestsAndErrors() async throws {
        let http = FakeSentinel()
        await http.set("api/cameras", 200, #"[{"id":"33","name":"Hof","recording":true,"online":true,"eventsToday":4,"detection":{"state":"ok"}}]"#)
        await http.set("api/stats", 503, #"{"error":"busy"}"#)
        await http.set("api/token-exchange", 200, #"{"token":"T1"}"#)
        let c = SentinelClient(origin: "https://h:10443", token: "tok", http: http)
        let cams = try await c.cameras(tz: "Europe/Berlin")
        #expect(cams.first?.name == "Hof" && cams.first?.detection?["state"] == "ok")
        #expect(await http.requests.last?.url?.absoluteString == "https://h:10443/endpoint/@local/sentinel-nvr/public/api/cameras?tz=Europe%2FBerlin&token=tok")
        await #expect(throws: SentinelHTTPError(status: 503, path: "api/stats?tz=UTC", code: "busy")) { try await c.stats(tz: "UTC") }
        await #expect(throws: SentinelHTTPError(status: 0, path: "api/recent-events?limit=2000", code: nil)) { try await c.recentEvents() }
        #expect(await c.control("api/relay-pos") == false)
        let t = try await SentinelClient.exchangeToken(origin: "https://h:10443", username: "u", password: "p", http: http)
        #expect(t == "T1")
        let last = await http.requests.last
        #expect(last?.httpMethod == "POST")
        #expect(last?.url?.absoluteString == "https://h:10443/endpoint/@local/sentinel-nvr/public/api/token-exchange")
    }
}
