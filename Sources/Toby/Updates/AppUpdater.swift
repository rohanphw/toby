import Combine
import Sparkle

@MainActor final class AppUpdater: NSObject, ObservableObject, SPUUpdaterDelegate {
    @Published private(set) var canCheck = false
    @Published private(set) var error: String?
    @Published private(set) var waitingForWork = false
    var canRestart: () -> Bool = { true }
    private var controller: SPUStandardUpdaterController!
    private var observation: NSKeyValueObservation?
    private var started = false

    override init() {
        super.init()
        controller = SPUStandardUpdaterController(
            startingUpdater: false, updaterDelegate: self, userDriverDelegate: nil)
        observation = controller.updater.observe(\.canCheckForUpdates, options: [.initial, .new]) {
            [weak self] _, change in
            Task { @MainActor in self?.canCheck = change.newValue ?? false }
        }
    }
    func check() {
        guard canRestart() else {
            error = "Finish the current recording, capture, or task before updating."
            return
        }
        error = nil
        do {
            if !started {
                try controller.updater.start()
                started = true
            }
            controller.checkForUpdates(nil)
        } catch { self.error = error.localizedDescription }
    }
    var checkEnabled: Bool { !started || canCheck }

    func updater(
        _ updater: SPUUpdater, shouldPostponeRelaunchForUpdate item: SUAppcastItem,
        untilInvokingBlock installHandler: @escaping () -> Void
    ) -> Bool {
        guard !canRestart() else { return false }
        waitingForWork = true
        Task { @MainActor in
            while !canRestart() { try? await Task.sleep(for: .seconds(1)) }
            waitingForWork = false
            installHandler()
        }
        return true
    }
}
