import Foundation
#if canImport(Security)
import Security

/// Tokens in the Keychain (this device only, readable after the first unlock so a background refresh works).
/// Stored as one JSON item per `account`; never synced to iCloud.
public actor KeychainStore {
    public static let service = "de.schleerag.hapulse"
    private let log = Log("keychain")

    public init() {}

    public struct Failure: Error, CustomStringConvertible {
        public let status: OSStatus
        public var description: String { "Keychain error \(status)" }
    }

    /// nil = nothing stored. Throws when the item exists but cannot be read now (e.g. before the first unlock).
    public func read(_ account: String) throws -> Data? {
        var q = base(account)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        let status = SecItemCopyMatching(q as CFDictionary, &out)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else {
            log.error("read \(account): \(status)")
            throw Failure(status: status)
        }
        return out as? Data
    }

    public func write(_ account: String, _ data: Data?) throws {
        let q = base(account)
        guard let data else {
            let status = SecItemDelete(q as CFDictionary)
            if status != errSecSuccess && status != errSecItemNotFound { throw Failure(status: status) }
            return
        }
        let update: [String: Any] = [kSecValueData as String: data]
        var status = SecItemUpdate(q as CFDictionary, update as CFDictionary)
        if status == errSecItemNotFound {
            var add = q
            add[kSecValueData as String] = data
            add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            status = SecItemAdd(add as CFDictionary, nil)
        }
        if status != errSecSuccess {
            log.error("write \(account): \(status)")
            throw Failure(status: status)
        }
    }

    private func base(_ account: String) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: Self.service,
         kSecAttrAccount as String: account, kSecAttrSynchronizable as String: false]
    }
}

/// `HATokenStore` on the Keychain (account `ha-tokens`).
public struct KeychainTokenStore: HATokenStore {
    private let keychain: KeychainStore
    private let account: String

    public init(keychain: KeychainStore = KeychainStore(), account: String = "ha-tokens") {
        self.keychain = keychain
        self.account = account
    }

    public func load() async throws -> HATokens? {
        guard let d = try await keychain.read(account) else { return nil }
        return try? JSONDecoder().decode(HATokens.self, from: d) // unreadable content = nothing usable stored
    }

    public func save(_ tokens: HATokens?) async throws {
        try await keychain.write(account, try tokens.map { try JSONEncoder().encode($0) })
    }
}
#endif
