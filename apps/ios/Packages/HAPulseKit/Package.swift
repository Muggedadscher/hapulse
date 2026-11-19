// swift-tools-version: 6.2
// [fork] HAPulse iOS app: everything without a user interface (models, Home Assistant and Sentinel clients, rules,
// texts, colours). Builds and tests on Linux as well (`swift test`), so it runs in the normal CI and in the lab.
// No UIKit/SwiftUI here: the Linux build enforces that.
import PackageDescription

let package = Package(
    name: "HAPulseKit",
    defaultLocalization: "en",
    platforms: [.iOS(.v26), .macOS(.v26)],
    products: [
        .library(name: "HAPulseKit", targets: ["HAPulseKit"]),
    ],
    targets: [
        .target(
            name: "HAPulseKit",
            resources: [.copy("Data")]
        ),
        .testTarget(
            name: "HAPulseKitTests",
            dependencies: ["HAPulseKit"],
            resources: [.copy("Fixtures")]
        ),
    ]
)
