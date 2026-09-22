import AVFoundation
import AppKit
import CoreGraphics
import Observation
import Speech

@MainActor @Observable final class OnboardingState {
    enum Outcome: String { case pending, skipped, completed, dismissed }
    private(set) var isPresented: Bool
    var step: Int {
        didSet { UserDefaults.standard.set(step, forKey: "onboardingStep") }
    }
    private(set) var microphone = AVCaptureDevice.authorizationStatus(for: .audio)
    private(set) var speech = SFSpeechRecognizer.authorizationStatus()
    private(set) var systemAudio = false
    private(set) var folderName: String?
    private(set) var busy = false
    var error: String?
    init() {
        let outcome =
            Outcome(rawValue: UserDefaults.standard.string(forKey: "onboardingOutcome") ?? "") ?? .pending
        isPresented = outcome == .pending
        step = min(max(UserDefaults.standard.integer(forKey: "onboardingStep"), 0), 2)
    }
    func refresh() {
        microphone = AVCaptureDevice.authorizationStatus(for: .audio)
        speech = SFSpeechRecognizer.authorizationStatus()
        systemAudio = CGPreflightScreenCaptureAccess()
        folderName = LocalFolderAccess.resolve()?.path
    }
    func finish(_ outcome: Outcome) {
        UserDefaults.standard.set(outcome.rawValue, forKey: "onboardingOutcome")
        isPresented = false
    }
    func reopen() {
        step = 0
        UserDefaults.standard.set(Outcome.pending.rawValue, forKey: "onboardingOutcome")
        isPresented = true
        refresh()
    }
    func requestMicrophone() async {
        guard !busy else { return }
        if microphone == .denied || microphone == .restricted {
            openPrivacy("Privacy_Microphone")
            return
        }
        busy = true
        _ = await AVCaptureDevice.requestAccess(for: .audio)
        busy = false
        refresh()
    }
    func requestSpeech() async {
        guard !busy else { return }
        if speech == .denied || speech == .restricted {
            openPrivacy("Privacy_SpeechRecognition")
            return
        }
        busy = true
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            SFSpeechRecognizer.requestAuthorization { _ in continuation.resume() }
        }
        busy = false
        refresh()
    }
    func requestSystemAudio() {
        _ = CGRequestScreenCaptureAccess()
        refresh()
        if !systemAudio { openPrivacy("Privacy_ScreenCapture") }
    }
    func openPrivacy(_ pane: String) {
        if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?\(pane)") {
            NSWorkspace.shared.open(url)
        }
    }
    func chooseFolder() async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        error = nil
        let panel = NSOpenPanel()
        panel.title = "Choose where Toby’s file picker starts"
        panel.prompt = "Choose folder"
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = false
        panel.directoryURL = LocalFolderAccess.resolve()
        let response = await withCheckedContinuation { continuation in
            panel.begin { continuation.resume(returning: $0) }
        }
        guard response == .OK, let url = panel.url else { return }
        do {
            let bookmark = try url.bookmarkData(
                options: .minimalBookmark, includingResourceValuesForKeys: nil, relativeTo: nil)
            UserDefaults.standard.set(bookmark, forKey: LocalFolderAccess.bookmarkKey)
            refresh()
        } catch { self.error = "Could not remember this folder: \(error.localizedDescription)" }
    }
}

enum LocalFolderAccess {
    static let bookmarkKey = "attachmentFolderBookmark"
    static func resolve() -> URL? {
        guard let data = UserDefaults.standard.data(forKey: bookmarkKey) else { return nil }
        var stale = false
        guard
            let url = try? URL(
                resolvingBookmarkData: data, options: [.withoutUI, .withoutMounting], relativeTo: nil,
                bookmarkDataIsStale: &stale),
            (try? url.checkResourceIsReachable()) == true
        else { return nil }
        if stale,
            let updated = try? url.bookmarkData(
                options: .minimalBookmark, includingResourceValuesForKeys: nil, relativeTo: nil)
        {
            UserDefaults.standard.set(updated, forKey: bookmarkKey)
        }
        return url
    }
}
