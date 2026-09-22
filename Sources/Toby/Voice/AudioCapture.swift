import AVFoundation
import CoreMedia
import ScreenCaptureKit
import Speech

private final class SystemAudioOutput: NSObject, SCStreamOutput, SCStreamDelegate, @unchecked Sendable {
    let sink: AudioSink
    var onFailure: (@Sendable (String) -> Void)?
    init(sink: AudioSink) { self.sink = sink }
    func stream(_ stream: SCStream, didStopWithError error: Error) { onFailure?(error.localizedDescription) }
    func stream(_ stream: SCStream, didOutputSampleBuffer sample: CMSampleBuffer, of type: SCStreamOutputType)
    {
        guard type == .audio, sample.isValid,
            let description = sample.formatDescription
        else { return }
        let format = AVAudioFormat(cmAudioFormatDescription: description)
        var needed = 0
        CMSampleBufferGetAudioBufferListWithRetainedBlockBuffer(
            sample, bufferListSizeNeededOut: &needed,
            bufferListOut: nil, bufferListSize: 0, blockBufferAllocator: nil, blockBufferMemoryAllocator: nil,
            flags: UInt32(kCMSampleBufferFlag_AudioBufferList_Assure16ByteAlignment), blockBufferOut: nil)
        let memory = UnsafeMutableRawPointer.allocate(
            byteCount: max(needed, MemoryLayout<AudioBufferList>.size), alignment: 16)
        defer { memory.deallocate() }
        let list = memory.bindMemory(to: AudioBufferList.self, capacity: 1)
        var block: CMBlockBuffer?
        let status = CMSampleBufferGetAudioBufferListWithRetainedBlockBuffer(
            sample, bufferListSizeNeededOut: nil,
            bufferListOut: list, bufferListSize: needed, blockBufferAllocator: nil,
            blockBufferMemoryAllocator: nil,
            flags: UInt32(kCMSampleBufferFlag_AudioBufferList_Assure16ByteAlignment), blockBufferOut: &block)
        guard status == noErr, let buffer = AVAudioPCMBuffer(pcmFormat: format, bufferListNoCopy: list) else {
            return
        }
        sink.append(buffer)
    }
}

@MainActor final class AudioCapture {
    var onText: ((String, String, Bool) -> Void)?
    var onLevel: ((Float) -> Void)?
    var onError: ((String) -> Void)?
    private var engine: AVAudioEngine?
    private var tapInstalled = false
    private var microphone: AudioSink?
    private var system: AudioSink?
    private var stream: SCStream?
    private var output: SystemAudioOutput?
    private var stopTask: Task<Void, Never>?
    private var generation = UUID()
    private var textGenerations = Set<UUID>()

    func start(meeting: Bool, directory: URL?, locale: String) async throws {
        await stopTask?.value
        try Task.checkCancellation()
        let token = UUID()
        generation = token
        textGenerations.insert(token)
        let micAllowed = await AVCaptureDevice.requestAccess(for: .audio)
        guard micAllowed else {
            throw TobyError(
                "Allow microphone access for Toby in System Settings → Privacy & Security → Microphone.")
        }
        try Task.checkCancellation()
        guard generation == token else { throw CancellationError() }
        let speechAllowed = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { continuation.resume(returning: $0 == .authorized) }
        }
        guard speechAllowed else {
            throw TobyError("Allow Speech Recognition for Toby in System Settings → Privacy & Security.")
        }
        try Task.checkCancellation()
        guard generation == token else { throw CancellationError() }
        if let directory {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        }
        let mic = try makeSink(
            label: "You", url: directory?.appendingPathComponent("microphone.caf"), locale: locale,
            token: token)
        microphone = mic
        do {
            if meeting {
                let system = try makeSink(
                    label: "Meeting audio", url: directory?.appendingPathComponent("meeting.caf"),
                    locale: locale, token: token)
                self.system = system
                let content = try await SCShareableContent.excludingDesktopWindows(
                    false, onScreenWindowsOnly: false)
                guard let display = content.displays.first else {
                    throw TobyError("No display is available for meeting audio capture.")
                }
                try Task.checkCancellation()
                guard generation == token else { throw CancellationError() }
                let filter = SCContentFilter(
                    display: display, excludingApplications: [], exceptingWindows: [])
                let configuration = SCStreamConfiguration()
                configuration.capturesAudio = true
                configuration.excludesCurrentProcessAudio = true
                configuration.sampleRate = 48_000
                configuration.channelCount = 1
                configuration.width = 2
                configuration.height = 2
                configuration.minimumFrameInterval = CMTime(seconds: 1, preferredTimescale: 1)
                let output = SystemAudioOutput(sink: system)
                output.onFailure = { [weak self] message in
                    DispatchQueue.main.async { self?.onError?("Meeting audio stopped: \(message)") }
                }
                self.output = output
                let stream = SCStream(filter: filter, configuration: configuration, delegate: output)
                try stream.addStreamOutput(
                    output, type: .audio, sampleHandlerQueue: DispatchQueue(label: "toby.system.audio"))
                self.stream = stream
                system.start()
                try await stream.startCapture()
                if generation != token || Task.isCancelled {
                    try? await stream.stopCapture()
                    throw CancellationError()
                }
            }
            try Task.checkCancellation()
            guard generation == token else { throw CancellationError() }
            let engine = AVAudioEngine()
            self.engine = engine
            let input = engine.inputNode
            let format = input.outputFormat(forBus: 0)
            guard format.sampleRate > 0, format.channelCount > 0 else {
                throw TobyError("No microphone is available.")
            }
            mic.start()
            input.installTap(onBus: 0, bufferSize: 2048, format: format) { buffer, _ in mic.append(buffer) }
            tapInstalled = true
            engine.prepare()
            try engine.start()
        } catch {
            if generation == token { await stop() }
            throw error
        }
    }
    func stop() async {
        if let stopTask {
            await stopTask.value
            return
        }
        let token = generation
        generation = UUID()
        let hadTap = tapInstalled
        tapInstalled = false
        let oldEngine = engine
        let oldStream = stream
        let oldMic = microphone
        let oldSystem = system
        engine = nil
        stream = nil
        microphone = nil
        system = nil
        output = nil
        let stopping = Task {
            if let oldEngine {
                if hadTap { oldEngine.inputNode.removeTap(onBus: 0) }
                oldEngine.stop()
            }
            if let oldStream { try? await oldStream.stopCapture() }
            await oldMic?.stop()
            await oldSystem?.stop()
            await Task.yield()
            textGenerations.remove(token)
        }
        stopTask = stopping
        await stopping.value
        stopTask = nil
    }
    private func makeSink(label: String, url: URL?, locale: String, token: UUID) throws -> AudioSink {
        let sink = try AudioSink(label: label, fileURL: url, locale: locale)
        sink.onText = { [weak self] label, text, final in
            DispatchQueue.main.async {
                if self?.textGenerations.contains(token) == true { self?.onText?(label, text, final) }
            }
        }
        sink.onLevel = { [weak self] level in
            DispatchQueue.main.async { if self?.generation == token { self?.onLevel?(level) } }
        }
        sink.onError = { [weak self] message in
            DispatchQueue.main.async { if self?.generation == token { self?.onError?(message) } }
        }
        return sink
    }
}
