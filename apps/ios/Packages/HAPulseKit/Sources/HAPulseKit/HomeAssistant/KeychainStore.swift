import Foundation
#if canImport(Security)
import Security

/// Tokens in the Keychain (this device only, readable after the first unlock so a background refresh works).
/// Stored as one JSON item per `account`; never synced to iCloud.
public actor KeychainStore {
    public static let service = "de.schleerag.hapulse"
    private let log = Log("keychain")

    public init() {}

    public func read(_ account: String) -> Data? {
        var q = base(account)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        let status = SecItemCopyMatching(q as CFDictionary, &out)
        if status != errSecSuccess && status != errSecItemNotFound { log.error("read \(account): \(status)") }
        return out as? Data
    }

    public func write(_ account: String, _ data: Data?) {
        let q = base(account)
        guard let data else {
            SecItemDelete(q as CFDictionary)
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
        if status != errSecSuccess { log.error("write \(account): \(status)") }
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

    public func load() async -> HATokens? {
        guard let d = await keychain.read(account) else { return nil }
        return try? JSONDecoder().decode(HATokens.self, from: d)
    }

    public func save(_ tokens: HATokens?) async {
        await keychain.write(account, tokens.flatMap { try? JSONEncoder().encode($0) })
    }
}
#endif
