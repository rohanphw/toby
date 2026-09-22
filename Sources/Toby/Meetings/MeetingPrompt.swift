import AppKit
import SwiftUI

/// A nonactivating desktop reminder; opening it does not interrupt typing in another app.
@MainActor final class MeetingPrompt {
    private var panel: NSPanel?
    private var expiry: Task<Void, Never>?
    var isVisible: Bool { panel != nil }
    @discardableResult func show(
        title: String, detail: String, join: Bool, action: @escaping () -> Void, snooze: (() -> Void)? = nil
    ) -> Bool {
        guard panel == nil, let screen = NSScreen.main ?? NSScreen.screens.first else { return false }
        let frame = NSRect(
            x: screen.visibleFrame.maxX - 510, y: screen.visibleFrame.maxY - 150, width: 490, height: 132)
        let window = NSPanel(
            contentRect: frame, styleMask: [.borderless, .nonactivatingPanel], backing: .buffered,
            defer: false)
        window.isFloatingPanel = true
        window.level = .floating
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        window.hidesOnDeactivate = false
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = true
        window.isReleasedWhenClosed = false
        window.contentView = NSHostingView(
            rootView: MeetingPromptView(
                title: title, detail: detail, join: join,
                action: { [weak self] in
                    self?.hide()
                    action()
                },
                dismiss: { [weak self] in self?.hide() },
                snooze: snooze.map { callback in
                    { [weak self] in
                        self?.hide()
                        callback()
                    }
                }))
        panel = window
        window.orderFrontRegardless()
        expiry = Task { [weak self] in
            try? await Task.sleep(for: .seconds(45))
            if !Task.isCancelled { self?.hide() }
        }
        return true
    }
    func hide() {
        expiry?.cancel()
        expiry = nil
        panel?.orderOut(nil)
        panel = nil
    }
}

private struct MeetingPromptView: View {
    let title: String
    let detail: String
    let join: Bool
    let action: () -> Void
    let dismiss: () -> Void
    let snooze: (() -> Void)?
    var body: some View {
        HStack(spacing: 16) {
            RoundedRectangle(cornerRadius: 3).fill(Theme.success).frame(width: 3)
            VStack(alignment: .leading, spacing: 7) {
                Text(title).font(Theme.heading(16)).lineLimit(1).help(title)
                Text(detail).font(Theme.caption).foregroundStyle(Theme.secondary).lineLimit(2)
                if let snooze {
                    Button("In 5 minutes", action: snooze).buttonStyle(.plain)
                        .font(.system(size: 11)).foregroundStyle(Theme.secondary)
                }
            }
            Spacer(minLength: 0)
            Button(action: action) {
                HStack(spacing: 7) {
                    if let logo = Theme.logo { Image(nsImage: logo).resizable().frame(width: 26, height: 26) }
                    Text(join ? "Join & take notes" : "Take notes").font(Theme.label)
                }.padding(10).background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
            }.buttonStyle(.plain)
            VStack {
                Button(action: dismiss) { Image(systemName: "xmark").font(.system(size: 10)).padding(4) }
                    .buttonStyle(.plain).foregroundStyle(Theme.secondary).accessibilityLabel(
                        "Dismiss meeting reminder")
                Spacer()
            }
        }.padding(18).foregroundStyle(Theme.ink)
            .background(Theme.drawer, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(Theme.line, lineWidth: 1))
            .padding(4).preferredColorScheme(.dark)
    }
}
