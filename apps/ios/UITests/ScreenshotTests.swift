import XCTest

/// Screenshots of every scene in light and dark (stage 0: the catalogue). With `SCREENSHOT_DIR` set (CI:
/// `TEST_RUNNER_SCREENSHOT_DIR`), PNGs and an accessibility dump per scene are written there; they are always attached
/// to the test result too.
final class ScreenshotTests: XCTestCase {
    private let scenes = ["catalog"]
    private let locales = ["de", "en"]

    override func setUp() {
        continueAfterFailure = false
    }

    @MainActor
    func testScenes() throws {
        for scene in scenes {
            for locale in locales {
                for scheme in ["light", "dark"] {
                    let app = XCUIApplication()
                    app.launchArguments = ["-hp-scene", scene, "-hp-locale", locale, "-hp-scheme", scheme]
                    app.launch()
                    XCTAssertTrue(app.staticTexts["hp.greeting"].waitForExistence(timeout: 20), "scene \(scene) did not appear")
                    let name = "\(scene)-\(locale)-\(scheme)"
                    let shot = XCUIScreen.main.screenshot()
                    let attachment = XCTAttachment(screenshot: shot)
                    attachment.name = name
                    attachment.lifetime = .keepAlways
                    add(attachment)
                    if let dir = ProcessInfo.processInfo.environment["SCREENSHOT_DIR"], !dir.isEmpty {
                        let base = URL(fileURLWithPath: dir)
                        try FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
                        try shot.pngRepresentation.write(to: base.appendingPathComponent("\(name).png"))
                        try app.debugDescription.write(to: base.appendingPathComponent("\(name).ax.txt"), atomically: true, encoding: .utf8)
                    }
                    app.terminate()
                }
            }
        }
    }
}
