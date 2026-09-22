// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "Toby",
    platforms: [.macOS(.v14)],
    products: [.executable(name: "Toby", targets: ["Toby"])],
    targets: [.executableTarget(name: "Toby", path: "Sources/Toby")],
    swiftLanguageVersions: [.v5]
)
