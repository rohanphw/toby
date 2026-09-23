import XCTest

@testable import Toby

final class CLICompatibilityTests: XCTestCase {
    func testDiagnosticsNeverExposeRawCredentials() {
        let diagnostics = CLIDiagnostics()
        diagnostics.append(Data("config parse error: api_key=private-test-secret".utf8))
        let message = diagnostics.failure(provider: "Codex", status: 1)
        XCTAssertTrue(message.contains("configuration error"))
        XCTAssertFalse(message.contains("private-test-secret"))
        XCTAssertFalse(message.contains("api_key"))
    }
    func testMissingNodeIsActionable() {
        let diagnostics = CLIDiagnostics()
        diagnostics.append(Data("env: node: No such file or directory".utf8))
        XCTAssertTrue(diagnostics.failure(provider: "Codex", status: 127).contains("Node.js runtime"))
    }
    func testDiagnosticTailIsBounded() {
        let diagnostics = CLIDiagnostics()
        diagnostics.append(Data("permission denied".utf8))
        diagnostics.append(Data(repeating: 120, count: 10000))
        XCTAssertFalse(diagnostics.failure(provider: "Grok", status: 1).contains("macOS denied"))
    }
    func testLaunchPathPreservesRuntimeAndOmitsRelativeEntries() {
        let path = CLIProvider.codex.launchPath(
            binary: URL(fileURLWithPath: "/test/node/bin/codex"), inherited: "/custom/bin:.:/custom/bin")
        let entries = path.split(separator: ":").map(String.init)
        XCTAssertEqual(entries.first, "/test/node/bin")
        XCTAssertEqual(entries.filter { $0 == "/custom/bin" }.count, 1)
        XCTAssertFalse(entries.contains("."))
        XCTAssertTrue(entries.contains("/usr/bin"))
    }
}
