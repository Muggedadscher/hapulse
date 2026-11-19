import Foundation

/// Golden cases computed by the TypeScript code (`apps/ios/tools/export`), stored in `Fixtures/`.
enum Golden {
    static func load<T: Decodable>(_ name: String, as: T.Type = T.self) throws -> T {
        guard let url = Bundle.module.resourceURL?.appendingPathComponent("Fixtures/\(name).json") else {
            throw NSError(domain: "Golden", code: 1)
        }
        return try JSONDecoder().decode(T.self, from: Data(contentsOf: url))
    }
}
