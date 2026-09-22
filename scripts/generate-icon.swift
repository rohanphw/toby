import AppKit
import Foundation

let destination = CommandLine.arguments[1]
try FileManager.default.createDirectory(atPath: destination, withIntermediateDirectories: true)
for size in [16, 32, 128, 256, 512] {
    for scale in [1, 2] {
        let pixels = size * scale
        let image = NSImage(size: NSSize(width: pixels, height: pixels))
        image.lockFocus()
        let factor = CGFloat(pixels) / 1024
        let transform = NSAffineTransform()
        transform.scale(by: factor)
        transform.concat()
        NSColor(srgbRed: 0.035, green: 0.037, blue: 0.043, alpha: 1).setFill()
        NSBezierPath(roundedRect: NSRect(x: 40, y: 40, width: 944, height: 944), xRadius: 215, yRadius: 215)
            .fill()
        NSColor(white: 1, alpha: 0.1).setStroke()
        let border = NSBezierPath(
            roundedRect: NSRect(x: 44, y: 44, width: 936, height: 936), xRadius: 211, yRadius: 211)
        border.lineWidth = 3
        border.stroke()
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .center
        let serif = NSFont(name: "Baskerville", size: 620) ?? NSFont.systemFont(ofSize: 620, weight: .light)
        ("t" as NSString).draw(
            in: NSRect(x: 185, y: 190, width: 620, height: 690),
            withAttributes: [
                .font: serif, .foregroundColor: NSColor(srgbRed: 0.93, green: 0.92, blue: 0.87, alpha: 1),
                .paragraphStyle: paragraph,
            ])
        NSColor(srgbRed: 0.75, green: 0.80, blue: 0.72, alpha: 1).setFill()
        NSBezierPath(ovalIn: NSRect(x: 650, y: 259, width: 58, height: 58)).fill()
        image.unlockFocus()
        guard let tiff = image.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff),
            let png = bitmap.representation(using: .png, properties: [:])
        else { fatalError("Could not encode icon") }
        let name = "icon_\(size)x\(size)\(scale == 2 ? "@2x" : "").png"
        try png.write(to: URL(fileURLWithPath: destination).appendingPathComponent(name))
    }
}
