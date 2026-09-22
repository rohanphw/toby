import SwiftUI

enum Theme {
    static let canvas = Color.black
    static let surface = Color(white: 0.055)
    static let drawer = Color(white: 0.075)
    static let line = Color.white.opacity(0.12)
    static let ink = Color(white: 0.96)
    static let secondary = Color(white: 0.64)
    static let accent = Color(red: 0.83, green: 0.88, blue: 0.94)
    static let logo = Bundle.main.url(forResource: "Toby", withExtension: "icns").flatMap {
        NSImage(contentsOf: $0)
    }
    static func heading(_ size: CGFloat) -> Font { .system(size: size, weight: .medium, design: .rounded) }
}
struct WorkspaceBackground: View {
    var body: some View { Theme.canvas.ignoresSafeArea() }
}
struct Surface: ViewModifier {
    func body(content: Content) -> some View {
        content.padding(22).background(Theme.surface, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.line, lineWidth: 1))
    }
}
extension View { func surface() -> some View { modifier(Surface()) } }
struct QuietButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        QuietButtonBody(configuration: configuration)
    }
}
private struct QuietButtonBody: View {
    let configuration: ButtonStyleConfiguration
    @Environment(\.isEnabled) private var isEnabled
    @State private var hovered = false
    var body: some View {
        configuration.label.font(.system(size: 12, weight: .medium))
            .padding(.horizontal, 13).padding(.vertical, 9)
            .background(
                Theme.ink.opacity(configuration.isPressed ? 0.14 : hovered ? 0.09 : 0.055),
                in: RoundedRectangle(cornerRadius: 9)
            )
            .opacity(isEnabled ? 1 : 0.4)
            .contentShape(RoundedRectangle(cornerRadius: 9))
            .onHover { hovered = $0 }
    }
}
struct Eyebrow: View {
    let text: String
    var body: some View {
        Text(text).font(.system(size: 13, weight: .medium)).foregroundStyle(
            Theme.secondary)
    }
}
struct EmptyWorkspace: View {
    let symbol: String
    let title: String
    let detail: String
    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: symbol).font(.system(size: 26, weight: .ultraLight)).foregroundStyle(
                Theme.secondary)
            Text(title).font(Theme.heading(26))
            Text(detail).font(.system(size: 13)).foregroundStyle(Theme.secondary).multilineTextAlignment(
                .center
            ).frame(maxWidth: 380)
        }.frame(maxWidth: .infinity).padding(.vertical, 65)
    }
}
struct ErrorNotice: View {
    let message: String
    var dismiss: (() -> Void)?
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.circle").foregroundStyle(.orange)
            Text(message).font(.system(size: 12)).textSelection(.enabled)
            Spacer()
            if let dismiss {
                Button(action: dismiss) { Image(systemName: "xmark") }.buttonStyle(.plain).accessibilityLabel(
                    "Dismiss message")
            }
        }.padding(14).background(Color.orange.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
    }
}
