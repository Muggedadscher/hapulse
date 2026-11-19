import Foundation
import HAPulseKit

/// Where the plugin lives below a Scrypted origin (`@sentinel-nvr/web` model.ts, docs/API.md §1).
public let sentinelEndpointPath = "/endpoint/@local/sentinel-nvr"

/// Port of `parseSentinelSetup` and the URL helpers of `@sentinel-nvr/web/api` (golden cases in
/// `Fixtures/sentinel.json` come from the package itself).
public struct SentinelSetup: Equatable, Sendable {
    /// Scrypted origin, e.g. `https://192.0.2.10:10443` (no trailing slash).
    public var origin: String
    /// Access token found in the pasted URL (`?token=`), if any.
    public var token: String?
    /// Reverse-proxy path prefix in front of `/endpoint/…`, `""` without one.
    public var prefix: String

    public init(origin: String, token: String?, prefix: String) {
        self.origin = origin
        self.token = token
        self.prefix = prefix
    }

    /// Whatever the user pastes (bare host, Scrypted root, the plugin's login/public path, a URL with `?token=`) →
    /// clean origin + token + prefix. nil for unusable input.
    public static func parse(_ input: String?) -> SentinelSetup? {
        let raw = (input ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if raw.isEmpty { return nil }
        let full = raw.range(of: "^https?://", options: [.regularExpression, .caseInsensitive]) != nil ? raw : "https://\(raw)"
        guard let c = URLComponents(string: full), let origin = SentinelURL.origin(c) else { return nil }
        let token = SentinelURL.queryValue(c.percentEncodedQuery, "token")?.trimmingCharacters(in: .whitespacesAndNewlines)
        let path = c.percentEncodedPath
        var prefix = ""
        if let r = path.range(of: "/endpoint/"), r.lowerBound > path.startIndex {
            prefix = String(path[..<r.lowerBound])
            while prefix.hasSuffix("/") { prefix.removeLast() }
        }
        return SentinelSetup(origin: origin, token: token?.isEmpty == false ? token : nil, prefix: prefix)
    }
}

public enum SentinelURL {
    /// WHATWG origin: lower-case scheme and host, default port dropped.
    static func origin(_ c: URLComponents) -> String? {
        guard let scheme = c.scheme?.lowercased(), scheme == "http" || scheme == "https",
              let host = c.host, !host.isEmpty else { return nil }
        let def = scheme == "https" ? 443 : 80
        let port = c.port.flatMap { $0 == def ? nil : $0 }
        return "\(scheme)://\(host.lowercased())\(port.map { ":\($0)" } ?? "")"
    }

    /// First value of `name` in a query, decoded like URLSearchParams (`+` is a space).
    static func queryValue(_ query: String?, _ name: String) -> String? {
        guard let query else { return nil }
        for pair in query.split(separator: "&", omittingEmptySubsequences: false) {
            let parts = pair.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
            let key = String(parts[0]).replacingOccurrences(of: "+", with: " ").removingPercentEncoding
            if key == name {
                let v = parts.count > 1 ? String(parts[1]) : ""
                let spaced = v.replacingOccurrences(of: "+", with: " ")
                return spaced.removingPercentEncoding ?? spaced
            }
        }
        return nil
    }

    /// JavaScript's `encodeURIComponent`.
    public static func encodeComponent(_ s: String) -> String {
        var allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
        allowed.insert(charactersIn: "-_.!~*'()")
        return s.addingPercentEncoding(withAllowedCharacters: allowed) ?? s
    }

    private static func trimSlashes(_ s: String) -> String {
        var t = s
        while t.hasSuffix("/") { t.removeLast() }
        return t
    }

    /// Token-guarded machine base (`…/public/`), always with a trailing slash.
    public static func publicBase(origin: String, prefix: String = "") -> String {
        "\(trimSlashes(origin))\(trimSlashes(prefix))\(sentinelEndpointPath)/public/"
    }

    /// Human base behind the Scrypted login (not a link target, see the package).
    public static func loginBase(origin: String, prefix: String = "") -> String {
        "\(trimSlashes(origin))\(trimSlashes(prefix))\(sentinelEndpointPath)/"
    }

    /// Where a human opens Sentinel's own UI: the public base without a token.
    public static func entryURL(origin: String, prefix: String = "") -> String { publicBase(origin: origin, prefix: prefix) }

    /// Absolute URL below the base with the token as query parameter.
    public static func url(base: String, token: String, path: String) -> String {
        let u = base + path
        if token.isEmpty { return u }
        return "\(u)\(u.contains("?") ? "&" : "?")token=\(encodeComponent(token))"
    }

    /// Deep link into Sentinel's own timeline (entry URL, `#/timeline/<cam>?at=`).
    public static func timelineLink(origin: String, cameraId: String, atMs: Double? = nil, prefix: String = "") -> String {
        let q = atMs.flatMap { $0 == 0 ? nil : "?at=\(Int64(($0).rounded(.toNearestOrAwayFromZero)))" } ?? ""
        return "\(entryURL(origin: origin, prefix: prefix))#/timeline/\(encodeComponent(cameraId))\(q)"
    }
}
