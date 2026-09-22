import AppKit
import CoreAudio
import Observation

/// Detects microphone activity, not meeting attendance. Never opens an audio stream.
@MainActor @Observable final class CallDetection {
    var enabled: Bool {
        didSet {
            UserDefaults.standard.set(enabled, forKey: "detectPossibleCalls")
            if !enabled {
                firstSeen = [:]
                lastSeen = [:]
                prompted = []
                onDisabled?()
            }
        }
    }
    private(set) var unavailable = false
    var onDisabled: (() -> Void)?
    var onPossibleCall: ((String) -> Bool)?
    private var task: Task<Void, Never>?
    private var firstSeen: [String: Date] = [:]
    private var lastSeen: [String: Date] = [:]
    private var prompted = Set<String>()
    init() { enabled = UserDefaults.standard.bool(forKey: "detectPossibleCalls") }
    func start() {
        guard task == nil else { return }
        task = Task {
            while !Task.isCancelled {
                if enabled { poll() }
                try? await Task.sleep(for: .seconds(5))
            }
        }
    }
    func stop() {
        task?.cancel()
        task = nil
    }
    private func poll() {
        guard #available(macOS 14.2, *) else {
            unavailable = true
            return
        }
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyProcessObjectList, mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain)
        var size: UInt32 = 0
        guard
            AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size)
                == noErr
        else {
            unavailable = true
            return
        }
        guard size > 0 else {
            unavailable = false
            return
        }
        var processes = [AudioObjectID](repeating: 0, count: Int(size) / MemoryLayout<AudioObjectID>.size)
        let status = processes.withUnsafeMutableBytes {
            AudioObjectGetPropertyData(
                AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, $0.baseAddress!)
        }
        guard status == noErr else {
            unavailable = true
            return
        }
        unavailable = false
        var active = Set<String>()
        for process in processes {
            var input: UInt32 = 0
            var bytes = UInt32(MemoryLayout<UInt32>.size)
            address.mSelector = kAudioProcessPropertyIsRunningInput
            guard AudioObjectGetPropertyData(process, &address, 0, nil, &bytes, &input) == noErr, input != 0
            else { continue }
            var pid: pid_t = 0
            bytes = UInt32(MemoryLayout<pid_t>.size)
            address.mSelector = kAudioProcessPropertyPID
            guard AudioObjectGetPropertyData(process, &address, 0, nil, &bytes, &pid) == noErr,
                let identifier = NSRunningApplication(processIdentifier: pid)?.bundleIdentifier
            else { continue }
            let known = [
                "us.zoom.xos": "Zoom", "com.microsoft.teams": "Teams", "com.microsoft.teams2": "Teams",
                "com.cisco.webexmeetingsapp": "Webex", "com.webex.meetingmanager": "Webex",
                "com.apple.FaceTime": "FaceTime", "com.tinyspeck.slackmacgap": "Slack",
                "com.google.Chrome": "Chrome", "com.apple.Safari": "Safari", "com.microsoft.edgemac": "Edge",
                "com.brave.Browser": "Brave", "company.thebrowser.Browser": "Arc",
                "org.mozilla.firefox": "Firefox",
            ]
            guard
                let entry = known.first(where: { identifier == $0.key || identifier.hasPrefix($0.key + ".") })
            else { continue }
            active.insert(entry.key)
            firstSeen[entry.key] = firstSeen[entry.key] ?? .now
            lastSeen[entry.key] = .now
            if !prompted.contains(entry.key), Date().timeIntervalSince(firstSeen[entry.key]!) >= 10,
                onPossibleCall?(entry.value) == true
            {
                prompted.insert(entry.key)
            }
        }
        for id in Array(lastSeen.keys) where !active.contains(id) {
            if Date().timeIntervalSince(lastSeen[id]!) >= 60 {
                firstSeen.removeValue(forKey: id)
                lastSeen.removeValue(forKey: id)
                prompted.remove(id)
            }
        }
    }
}
