# Apple platform references

The implementation follows native SwiftUI ownership and controls, platform-managed permissions, EventKit authorization, standard Settings, a menu-bar extra, keyboard commands, and reduced-motion/transparency preferences.

References consulted during implementation:

- [Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos)
- [Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy)
- [Integrate privacy into your development process](https://developer.apple.com/videos/play/wwdc2025/246/)
- [On-device recognition requirement](https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition)
- [Excluding current-process audio](https://developer.apple.com/documentation/screencapturekit/scstreamconfiguration/excludescurrentprocessaudio)

Implementation choices: capture permissions are requested when needed, automatic recording is an explicit preference, recording state is visible in the workspace/menu bar, on-device recognition support is checked before use, and ordinary app termination drains capture before exiting.

This is not a claim of Apple review or full HIG compliance. Accessibility, native interaction and permission flows remain part of the user's manual QA.
