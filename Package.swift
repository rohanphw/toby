// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "Toby",
    platforms: [.macOS(.v14)],
    products: [.executable(name: "Toby", targets: ["Toby"])],
    dependencies: [.package(url: "https://github.com/sparkle-project/Sparkle", exact: "2.10.0")],
    targets: [
        .executableTarget(
            name: "Toby", dependencies: [.product(name: "Sparkle", package: "Sparkle")], path: "Sources/Toby",
            resources: [.copy("Resources/ProviderMarks")],
            linkerSettings: [
                .unsafeFlags(["-Xlinker", "-rpath", "-Xlinker", "@executable_path/../Frameworks"])
            ]),
        .testTarget(name: "TobyTests", dependencies: ["Toby"]),
    ],
    swiftLanguageVersions: [.v5]
)
