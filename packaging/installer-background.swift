import AppKit

// A single 72-dpi bitmap maps one image pixel to one Finder point.
// Do not combine point-sized bitmap reps with an additional Retina scale transform.
let width = 640
let height = 400
let output = CommandLine.arguments.dropFirst().first ?? "dist/installer/background.png"
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height,
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
    colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
let context = NSGraphicsContext(bitmapImageRep: rep)!
NSGraphicsContext.saveGraphicsState()
context.cgContext.translateBy(x: 0, y: CGFloat(height))
context.cgContext.scaleBy(x: 1, y: -1)
NSGraphicsContext.current = NSGraphicsContext(cgContext: context.cgContext, flipped: true)
NSColor(white: 0.96, alpha: 1).setFill()
NSRect(x: 0, y: 0, width: width, height: height).fill()
func centered(_ text: String, y: CGFloat, size: CGFloat, weight: NSFont.Weight, ink: CGFloat) {
    let attributes: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: size, weight: weight),
        .foregroundColor: NSColor(white: ink, alpha: 1)
    ]
    let label = text as NSString
    label.draw(at: NSPoint(x: (CGFloat(width) - label.size(withAttributes: attributes).width) / 2, y: y),
               withAttributes: attributes)
}
centered("Install Toby", y: 44, size: 30, weight: .semibold, ink: 0.10)
centered("Drag Toby into Applications.", y: 90, size: 15, weight: .regular, ink: 0.38)
// The real Finder icons sit at (170, 230) and (470, 230).
NSColor(white: 0.50, alpha: 1).setStroke()
let arrow = NSBezierPath()
arrow.move(to: NSPoint(x: 280, y: 230))
arrow.line(to: NSPoint(x: 360, y: 230))
arrow.move(to: NSPoint(x: 350, y: 220))
arrow.line(to: NSPoint(x: 360, y: 230))
arrow.line(to: NSPoint(x: 350, y: 240))
arrow.lineWidth = 2
arrow.lineCapStyle = .round
arrow.lineJoinStyle = .round
arrow.stroke()
centered("Then open Toby from Applications.", y: 346, size: 13, weight: .regular, ink: 0.38)
NSGraphicsContext.restoreGraphicsState()
let url = URL(fileURLWithPath: output)
try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
try rep.representation(using: .png, properties: [:])!.write(to: url)
print("Rendered \(url.path) (\(width) × \(height))")
