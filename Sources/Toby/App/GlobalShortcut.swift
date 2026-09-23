import Carbon

@MainActor final class GlobalShortcut {
    private let identifier: UInt32
    init(id: UInt32 = 1) { identifier = id }
    private var reference: EventHotKeyRef?
    private var handler: EventHandlerRef?
    private var action: (() -> Void)?
    @discardableResult func register(keyCode: UInt32 = UInt32(kVK_Space), action: @escaping () -> Void)
        -> Bool
    {
        guard reference == nil else { return true }
        self.action = action
        var type = EventTypeSpec(
            eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        let pointer = Unmanaged.passUnretained(self).toOpaque()
        let installed = InstallEventHandler(
            GetApplicationEventTarget(),
            { _, event, pointer in
                guard let event, let pointer else { return OSStatus(eventNotHandledErr) }
                var hotkeyID = EventHotKeyID()
                guard
                    GetEventParameter(
                        event, EventParamName(kEventParamDirectObject), EventParamType(typeEventHotKeyID),
                        nil,
                        MemoryLayout<EventHotKeyID>.size, nil, &hotkeyID) == noErr,
                    hotkeyID.id
                        == Unmanaged<GlobalShortcut>.fromOpaque(pointer).takeUnretainedValue().identifier
                else { return OSStatus(eventNotHandledErr) }
                Task { @MainActor in
                    Unmanaged<GlobalShortcut>.fromOpaque(pointer).takeUnretainedValue().action?()
                }
                return noErr
            }, 1, &type, pointer, &handler)
        guard installed == noErr else { return false }
        // Control-Option shortcuts do not require Accessibility or Input Monitoring access.
        let registered = RegisterEventHotKey(
            keyCode, UInt32(controlKey | optionKey), EventHotKeyID(signature: 0x544F_4259, id: identifier),
            GetApplicationEventTarget(), 0, &reference)
        if registered != noErr { unregister() }
        return registered == noErr
    }
    func unregister() {
        if let reference { UnregisterEventHotKey(reference) }
        reference = nil
        if let handler { RemoveEventHandler(handler) }
        handler = nil
    }
}
