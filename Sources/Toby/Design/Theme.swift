import SwiftUI

enum Theme {
    static let canvas = Color.black
    static let surface = Color(white: 0.055)
    static let drawer = Color(white: 0.075)
    static let line = Color.white.opacity(0.08)
    static let ink = Color(white: 0.96)
    static let secondary = Color(white: 0.64)
    static let success = Color(red: 0.37, green: 0.82, blue: 0.58)
    static let warning = Color(red: 0.94, green: 0.76, blue: 0.31)
    static let failure = Color(red: 0.98, green: 0.40, blue: 0.43)
    static let body = Font.system(size: 14)
    static let caption = Font.system(size: 12)
    static let label = Font.system(size: 13, weight: .medium)
    static let accent = Color(red: 0.83, green: 0.88, blue: 0.94)
    static let logo = Bundle.main.url(forResource: "Toby", withExtension: "icns").flatMap {
        NSImage(contentsOf: $0)
    }
    static func heading(_ size: CGFloat) -> Font { .system(size: size, weight: .semibold, design: .default) }
}
struct WorkspaceBackground: View {
    var body: some View { Theme.canvas.ignoresSafeArea() }
}
struct Surface: ViewModifier {
    func body(content: Content) -> some View {
        content.padding(18).background(Theme.surface, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.line, lineWidth: 1))
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
    var tone: StatusTone = .failure
    var dismiss: (() -> Void)?
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: tone.symbol).foregroundStyle(tone.color)
            Text(message).font(Theme.caption).foregroundStyle(tone.color).textSelection(.enabled)
            Spacer()
            if let dismiss {
                Button(action: dismiss) { Image(systemName: "xmark") }.buttonStyle(.plain).accessibilityLabel(
                    "Dismiss message")
            }
        }.padding(14).background(tone.color.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
    }
}

enum StatusTone {
    case success, warning, failure, neutral
    var color: Color {
        switch self {
        case .success: Theme.success
        case .warning: Theme.warning
        case .failure: Theme.failure
        case .neutral: Theme.secondary
        }
    }
    var symbol: String {
        switch self {
        case .success: "checkmark.circle.fill"
        case .warning: "exclamationmark.circle.fill"
        case .failure: "xmark.circle.fill"
        case .neutral: "circle.dotted"
        }
    }
}
struct StatusLabel: View {
    let text: String
    let tone: StatusTone
    var body: some View {
        Label(text, systemImage: tone.symbol).font(Theme.caption)
            .foregroundStyle(tone.color).fixedSize(horizontal: false, vertical: true)
    }
}
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        PrimaryButtonBody(configuration: configuration)
    }
}
private struct PrimaryButtonBody: View {
    let configuration: ButtonStyleConfiguration
    @Environment(\.isEnabled) private var enabled
    @State private var hovered = false
    var body: some View {
        configuration.label.font(.system(size: 13, weight: .semibold))
            .padding(.horizontal, 18).frame(height: 38)
            .foregroundStyle(enabled ? Theme.canvas : Theme.secondary)
            .background(
                enabled
                    ? Theme.ink.opacity(configuration.isPressed ? 0.72 : hovered ? 0.88 : 1) : Theme.surface,
                in: RoundedRectangle(cornerRadius: 9)
            )
            .contentShape(RoundedRectangle(cornerRadius: 9))
            .onHover { hovered = $0 }
    }
}
