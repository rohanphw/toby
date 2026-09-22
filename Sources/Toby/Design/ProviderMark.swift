import SwiftUI

struct ProviderMark: View {
    let provider: CLIProvider
    var size: CGFloat = 22
    var body: some View {
        Group {
            if let image {
                Image(nsImage: image).resizable().interpolation(.high).scaledToFit()
            }
        }.frame(width: size, height: size).accessibilityHidden(true)
    }
    private var image: NSImage? {
        let name = provider == .codex ? "openai" : "xai"
        let url =
            Bundle.main.url(forResource: name, withExtension: "png", subdirectory: "ProviderMarks")
            ?? Bundle.module.url(forResource: name, withExtension: "png", subdirectory: "ProviderMarks")
        return url.flatMap { NSImage(contentsOf: $0) }
    }
}
