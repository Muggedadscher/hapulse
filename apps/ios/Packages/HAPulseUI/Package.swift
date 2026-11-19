// swift-tools-version: 6.2
// [fork] HAPulse iOS app: the SwiftUI building blocks of the style Glas (colours, glass, type, icons, later cards,
// chips, sheets …). Every glass call goes through `hpGlass`, so a replacement material would be one place.
import PackageDescription

let package = Package(
    name: "HAPulseUI",
    platforms: [.iOS(.v26), .macOS(.v26)],
    products: [
        .library(name: "HAPulseUI", targets: ["HAPulseUI"]),
    ],
    dependencies: [
        .package(path: "../HAPulseKit"),
    ],
    targets: [
        .target(name: "HAPulseUI", dependencies: ["HAPulseKit"]),
    ]
)
