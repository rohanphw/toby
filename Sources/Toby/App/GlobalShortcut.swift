import Carbon

@MainActor final class GlobalShortcut {
    private var reference: EventHotKeyRef?
    private var handler: EventHandlerRef?
    private var action: (() -> Void)?
    func register(action: @escaping () -> Void) {
        guard reference == nil else { return }
        self.action = action
        var type = EventTypeSpec(
            eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        let pointer = Unmanaged.passUnretained(self).toOpaque()
        InstallEventHandler(
            GetApplicationEventTarget(),
            { _, _, pointer in
                guard let pointer else { return OSStatus(eventNotHandledErr) }
                Task { @MainActor in
                    Unmanaged<GlobalShortcut>.fromOpaque(pointer).takeUnretainedValue().action?()
                }
                return noErr
            }, 1, &type, pointer, &handler)
        // Control-Option-Space, registered without Accessibility or Input Monitoring access.
        RegisterEventHotKey(
            UInt32(kVK_Space), UInt32(controlKey | optionKey), EventHotKeyID(signature: 0x544F_4259, id: 1),
            GetApplicationEventTarget(), 0, &reference)
    }
    func unregister() {
        if let reference { UnregisterEventHotKey(reference) }
        reference = nil
        if let handler { RemoveEventHandler(handler) }
        handler = nil
    }
}
