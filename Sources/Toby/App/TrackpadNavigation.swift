import AppKit
import SwiftUI

/// Observe only the workspace window; never intercept other apps or momentum as a new swipe.
struct TrackpadNavigation: NSViewRepresentable {
    let enabled: Bool
    let navigate: (Bool) -> Void
    func makeNSView(context: Context) -> NavigationGestureView { NavigationGestureView() }
    func updateNSView(_ view: NavigationGestureView, context: Context) {
        view.enabled = enabled
        view.navigate = navigate
    }
    static func dismantleNSView(_ view: NavigationGestureView, coordinator: ()) { view.stop() }
}

final class NavigationGestureView: NSView {
    var enabled = true {
        didSet {
            if !enabled {
                tracking = false
                horizontal = false
                vertical = false
            }
        }
    }
    var navigate: ((Bool) -> Void)?
    private var monitor: Any?
    private var x: CGFloat = 0
    private var y: CGFloat = 0
    private var tracking = false
    private var horizontal = false
    private var vertical = false
    override func hitTest(_ point: NSPoint) -> NSView? { nil }
    override func viewDidMoveToWindow() {
        super.viewDidMoveToWindow()
        stop()
        guard window != nil else { return }
        monitor = NSEvent.addLocalMonitorForEvents(matching: .scrollWheel) { [weak self] event in
            guard let self else { return event }
            return self.handle(event)
        }
    }
    func stop() {
        if let monitor { NSEvent.removeMonitor(monitor) }
        monitor = nil
        tracking = false
    }
    private func handle(_ event: NSEvent) -> NSEvent? {
        guard enabled, let window, event.window === window, window.attachedSheet == nil,
            event.hasPreciseScrollingDeltas,
            event.modifierFlags.intersection([.command, .option, .control, .shift]).isEmpty
        else { return event }
        if !event.momentumPhase.isEmpty { return horizontal ? nil : event }
        if event.phase.contains(.began) {
            x = 0
            y = 0
            horizontal = false
            vertical = false
            tracking = !containsHorizontalContent(at: event.locationInWindow, window: window)
        }
        guard tracking else { return event }
        if event.phase.contains(.cancelled) {
            tracking = false
            return event
        }
        x += event.scrollingDeltaX
        y += event.scrollingDeltaY
        if !horizontal && !vertical, max(abs(x), abs(y)) > 12 {
            horizontal = abs(x) > abs(y) * 1.8
            vertical = !horizontal
        }
        if event.phase.contains(.ended) {
            tracking = false
            if horizontal, abs(x) >= 80 {
                // Normalize to finger direction whether Natural Scrolling is on or off.
                let direction = event.isDirectionInvertedFromDevice ? x : -x
                navigate?(direction > 0)
            }
        }
        return horizontal ? nil : event
    }
    private func containsHorizontalContent(at point: NSPoint, window: NSWindow) -> Bool {
        guard let content = window.contentView else { return false }
        var hit = content.hitTest(content.convert(point, from: nil))
        while let view = hit {
            if view is NSTextView || view is NSSlider { return true }
            if let scroll = view as? NSScrollView,
                scroll.hasHorizontalScroller
                    || (scroll.documentView?.bounds.width ?? 0) > scroll.contentView.bounds.width + 2
            {
                return true
            }
            hit = view.superview
        }
        return false
    }
}
