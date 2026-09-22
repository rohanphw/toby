import SwiftUI

enum Theme {
    static let canvas = Color(red: 0.028, green: 0.029, blue: 0.033)
    static let surface = Color(red: 0.065, green: 0.067, blue: 0.074)
    static let line = Color.white.opacity(0.09)
    static let ink = Color(red: 0.94, green: 0.93, blue: 0.90)
    static let secondary = Color(red: 0.62, green: 0.63, blue: 0.65)
    static let accent = Color(red: 0.75, green: 0.80, blue: 0.72)
    static func editorial(_ size: CGFloat) -> Font { .system(size: size, weight: .regular, design: .serif) }
}
struct WorkspaceBackground: View {
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    var body: some View {
        ZStack {
            Theme.canvas
            if !reduceTransparency { Rectangle().fill(.ultraThinMaterial).opacity(0.18) }
        }.ignoresSafeArea()
    }
}
struct Surface: ViewModifier {
    func body(content: Content) -> some View {
        content.padding(22).background(Theme.surface.opacity(0.7), in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.line, lineWidth: 1))
    }
}
extension View { func surface() -> some View { modifier(Surface()) } }
struct QuietButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 12, weight: .medium))
            .padding(.horizontal, 13).padding(.vertical, 9)
            .background(
                Color.white.opacity(configuration.isPressed ? 0.12 : 0.055),
                in: RoundedRectangle(cornerRadius: 7)
            )
            .contentShape(RoundedRectangle(cornerRadius: 7))
    }
}
struct Eyebrow: View {
    let text: String
    var body: some View {
        Text(text.uppercased()).font(.system(size: 10, weight: .semibold)).tracking(2).foregroundStyle(
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
            Text(title).font(Theme.editorial(26))
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
