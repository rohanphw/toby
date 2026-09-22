import AVFoundation
import Speech

/// All recognition and file writes are serialized away from the audio render thread.
final class AudioSink: @unchecked Sendable {
    private let queue = DispatchQueue(label: "toby.audio.sink")
    private let recognizer: SFSpeechRecognizer
    private let label: String
    private let fileURL: URL?
    private var file: AVAudioFile?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var timer: DispatchSourceTimer?
    private var generation = UUID()
    private var partial = ""
    private var closed = false
    var onText: (@Sendable (String, String, Bool) -> Void)?
    var onLevel: (@Sendable (Float) -> Void)?
    var onError: (@Sendable (String) -> Void)?

    init(label: String, fileURL: URL?, locale: String) throws {
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: locale)), recognizer.isAvailable,
            recognizer.supportsOnDeviceRecognition
        else {
            throw TobyError(
                "On-device speech recognition is unavailable for \(locale). Choose another language in Settings or install the language in macOS."
            )
        }
        self.recognizer = recognizer
        self.label = label
        self.fileURL = fileURL
    }
    func start() {
        queue.async { [self] in
            rotate()
            let timer = DispatchSource.makeTimerSource(queue: queue)
            timer.schedule(deadline: .now() + 45, repeating: 45)
            timer.setEventHandler { [weak self] in self?.rotate() }
            timer.resume()
            self.timer = timer
        }
    }
    func append(_ buffer: AVAudioPCMBuffer) {
        guard let copy = AVAudioPCMBuffer(pcmFormat: buffer.format, frameCapacity: buffer.frameLength) else {
            return
        }
        copy.frameLength = buffer.frameLength
        let source = UnsafeMutableAudioBufferListPointer(buffer.mutableAudioBufferList)
        let destination = UnsafeMutableAudioBufferListPointer(copy.mutableAudioBufferList)
        for (src, dst) in zip(source, destination) {
            if let from = src.mData, let to = dst.mData { memcpy(to, from, Int(src.mDataByteSize)) }
        }
        queue.async { [self] in
            guard !closed else { return }
            do {
                if file == nil, let fileURL {
                    file = try AVAudioFile(forWriting: fileURL, settings: copy.format.settings)
                }
                try file?.write(from: copy)
                request?.append(copy)
                if let channel = copy.floatChannelData?[0], copy.frameLength > 0 {
                    var sum: Float = 0
                    for i in 0..<Int(copy.frameLength) { sum += channel[i] * channel[i] }
                    onLevel?(min(1, sqrt(sum / Float(copy.frameLength)) * 8))
                }
            } catch {
                onError?("Audio could not be saved: \(error.localizedDescription)")
                closed = true
            }
        }
    }
    func stop() async {
        await withCheckedContinuation { continuation in
            queue.async { [self] in
                commit()
                closed = true
                generation = UUID()
                timer?.cancel()
                timer = nil
                request?.endAudio()
                task?.cancel()
                task = nil
                request = nil
                file = nil
                DispatchQueue.main.async { continuation.resume() }
            }
        }
    }
    private func commit() {
        if !partial.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { onText?(label, partial, true) }
        partial = ""
    }
    private func rotate() {
        guard !closed else { return }
        commit()
        generation = UUID()
        let token = generation
        request?.endAudio()
        task?.cancel()
        let request = SFSpeechAudioBufferRecognitionRequest()
        request.requiresOnDeviceRecognition = true
        request.shouldReportPartialResults = true
        request.addsPunctuation = true
        self.request = request
        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            self.queue.async {
                guard !self.closed, self.generation == token else { return }
                if let result {
                    self.partial = result.bestTranscription.formattedString
                    self.onText?(self.label, self.partial, false)
                    if result.isFinal { self.rotate() }
                } else if let error {
                    // A speech failure is visible; saved meeting audio remains available.
                    self.onError?("Speech recognition stopped: \(error.localizedDescription)")
                }
            }
        }
    }
}
