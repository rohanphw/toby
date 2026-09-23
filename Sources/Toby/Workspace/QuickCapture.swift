import AppKit

@MainActor final class CaptureService: NSObject {
    weak var model: AppModel?
    @objc func captureInToby(
        _ pasteboard: NSPasteboard, userData: String?, error: AutoreleasingUnsafeMutablePointer<NSString?>
    ) {
        guard let model else {
            error.pointee = "Toby is still starting. Try again."
            return
        }
        model.beginCapture(pasteboard: pasteboard)
    }
}

extension AppModel {
    func beginCapture(pasteboard: NSPasteboard? = nil) {
        guard !onboarding.isPresented else {
            notice = "Complete or skip setup before capturing."
            revealWorkspace?()
            return
        }
        if captureItem == nil || captureItem?.isArchived == true {
            captureItem = library.create(.thought, title: "Quick capture")
        }
        if let pasteboard { addCapture(pasteboard) }
        showSettings = false
        showCapture = true
        revealWorkspace?()
    }
    func addCapture(_ pasteboard: NSPasteboard) {
        guard let item = captureItem, !item.isArchived else { return }
        let files =
            (pasteboard.readObjects(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly: true])
                as? [URL]) ?? []
        if !files.isEmpty {
            for url in files {
                let access = url.startAccessingSecurityScopedResource()
                defer { if access { url.stopAccessingSecurityScopedResource() } }
                do {
                    let values = try url.resourceValues(forKeys: [.isRegularFileKey])
                    guard values.isRegularFile == true else {
                        throw TobyError("Choose files rather than folders for quick capture.")
                    }
                    try library.attachDownloadedFile(url, name: url.lastPathComponent, to: item)
                } catch {
                    notice = "Could not capture \(url.lastPathComponent): \(error.localizedDescription)"
                }
            }
        } else if let text = pasteboard.string(forType: .string) ?? pasteboard.string(forType: .URL),
            !text.isEmpty
        {
            item.body += (item.body.isEmpty ? "" : "\n\n") + text
            library.changed(item, immediately: true)
        } else {
            notice = "No text, link, or file was available to capture."
        }
    }
    func dictateCapture() {
        guard let item = captureItem, !voice.active, !meetings.active, !agent.isRunning else {
            notice = "Finish the current recording or task first."
            return
        }
        voice.startCapture(item: item)
    }
    func finishCapture(open: Bool) {
        guard let item = captureItem else { return }
        guard !voice.active || voice.item?.id != item.id else {
            notice = "Finish dictation before closing capture."
            return
        }
        if item.title == "Quick capture", !item.body.isEmpty {
            item.title = String(item.body.prefix(70)).replacingOccurrences(of: "\n", with: " ")
        }
        library.changed(item, immediately: true)
        showCapture = false
        captureItem = nil
        if open { openItem(item) }
    }
}
