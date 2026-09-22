# Toby

A voice-first personal workspace for macOS. Think out loud, capture meetings, keep useful notes, and ask an agent to do the follow-through.

This is the fresh implementation in `gary-app`, version **0.7.1**. It preserves the previous Toby app’s dark, editorial direction while replacing its architecture. No permanent conversation sidebar. No data migration from the old app.

## Build

Requires macOS 14+, Xcode command-line tools, and the authenticated Codex and/or Grok CLI for agent tasks.

```sh
swift build
scripts/build-app.sh
```

The second command produces `dist/Toby.app` with its icon, permission descriptions and stable development signature. It does **not** launch it. Open that bundle yourself for microphone, speech and calendar permissions; do not use `swift run` for permission-sensitive QA. Move the bundle to Applications if enabling launch at login.

The package can also be opened in Xcode using `Package.swift`. No third-party Swift dependencies. Local builds require an Apple Development signing certificate in Keychain (create one through Xcode Settings → Accounts → Manage Certificates). The build script pins the first available certificate locally; `CODE_SIGN_IDENTITY` can explicitly override it. Ad-hoc signing is rejected because it changes permission identity between builds. Quit Toby before rebuilding its bundle; running copies are never overwritten.

## First-launch setup

Toby opens an in-app setup page until you finish, skip, or dismiss it. Quitting midway preserves the current step. Reopen it from Settings → This Mac → Reopen setup.

- Voice: request microphone and on-device speech-recognition permissions individually. Optional meeting-audio and Calendar access have their own controls. Denied permissions link to System Settings; no recording starts during setup.
- Files: Toby’s own library needs no extra permission. An optional chosen folder becomes the starting location for attaching files; it is not scanned or imported. Full Disk Access is not requested.
- Providers: automatic CLI checks show installation, authentication and model readiness. Official Codex/Grok guides, a copyable login command and a recheck button help connect either provider. Finish requires the selected provider and model to be ready; Skip/Dismiss still allow local notes without a connected provider.

## First use

1. Open the app yourself. Settings → Intelligence → Check CLI session reuses the existing login for each provider. If needed, run `codex login` or `grok login` in Terminal once, then check again. Select Codex or Grok for subsequent tasks. Both provider catalogs load automatically at launch. An unset choice is initialized to the actual CLI-configured model; an explicit Toby choice is preserved. Home and Settings use custom searchable model controls. Choose executable is available when discovery fails.
2. Choose Talk, or press **Control–Option–Space**. Opening talking mode starts the microphone permission flow. Speak, pause for 1.8 seconds, or choose Send now. Talk opens a fresh thread in the main workspace with an animated listening area. Toby replies only in text through the selected CLI, then resumes listening. Interrupt stops the current task and reopens the microphone. End voice or close the main window to stop the voice session.
3. Meetings → Record a meeting captures your microphone and Mac audio. Finish saves the transcript and asks the selected CLI to produce notes. The raw audio remains available in the item’s workspace even when transcription or note generation fails.
4. Connect one or more Google accounts in Settings → Meetings, select calendars, and receive meeting reminders. The included setup guide covers the required Desktop OAuth client. Mac calendars remain optional. To record scheduled calls automatically, explicitly enable that separate setting. The app needs to remain open. The menu bar shows recording state even when the workspace is closed.
5. Write notes, pin important items, and mark specific items Remember to include them in future tasks. Search with **Command–K**. Send typed follow-ups with **Command–Return**.

## Included

- Native SwiftUI workspace, consistent SF typography, flat black surfaces and silver accents, library rows, menu bar and in-thread voice capture. Settings opens as an animated in-app side drawer (also Command–Comma); recording stays in the workspace.
- Local SwiftData library with notes, meetings, conversations, drafts, pinned items and explicit memory.
- On-device speech recognition, silence-based voice submission and text-only replies.
- Microphone and system-audio meeting capture, rolling recognition, timestamped channel transcripts, generated editable notes.
- Direct multi-account Google Calendar connections, per-calendar selection, optional Mac calendars, desktop Join & take notes reminders and opt-in possible-call detection.
- Calendar-based automatic recording with per-event skip and manual start/finish.
- Codex app-server and Grok ACP execution using CLI-owned authentication, Codex model discovery, per-item workspaces, approvals and user-input requests.
- Ordered message streaming with item boundaries, bounded startup requests, explicit stop, incremental persistence and interrupted-run recovery.
- File attachments, generated output discovery, Finder access, Markdown export and deletion to Trash.
- Keyboard commands, accessible control labels, reduced-motion and reduced-transparency handling.

## Current boundaries

This is a first implementation for Rohan’s manual QA, not a runtime-verified release.

- Automatic recording follows supported conferencing links in calendar events (Zoom, Meet, Teams, Webex). It does not detect whether a call was actually joined, record arbitrary unscheduled calls automatically, join meetings automatically, or wake a sleeping Mac. Start occurs within 90 seconds of the scheduled time; stop uses the scheduled end time. Turning the setting off prevents new recordings; Finish stops an existing recording.
- Possible-call detection watches microphone-use metadata for recognized conferencing apps/browsers on macOS 14.2+. It may mistake other microphone activity for a call or miss muted/unsupported calls. Desktop reminders require Toby to be running; they are custom panels, not Notification Center alerts, and do not inherit Focus filtering. Google calendars sync about every two minutes; reminders are checked every 20 seconds.
- Google setup: [instructions](docs/google-calendar.md). Tokens are stored in Keychain; calendar selections/account labels live in app preferences. Disconnect removes local credentials; Google-side revocation is available separately.
- Meeting audio includes other Mac audio. Use headphones to avoid capturing remote voices again through the microphone. “You” and “Meeting audio” are source channels, not speaker diarization.
- Recognition depends on on-device language support. Microphone, Speech Recognition, Calendar and Screen & System Audio Recording permissions are managed by macOS. Calendar is optional; audio permissions are requested at capture time.
- Voice is turn-based: the microphone pauses while the agent works and resumes after the written reply. Interrupt is explicit. No speech playback is used.
- There is one active agent task at a time. A meeting can record while a task runs; if a task is still running when the meeting ends, its notes can be generated afterward.
- The model receives at most 100,000 characters of an item’s reference body, 30,000 characters of existing notes, and 20 remembered items of 2,000 characters each. Original recordings and transcripts are retained locally; longer meetings need a future chunked summarization pipeline.
- No Gmail/Drive integration, cloud agent, cross-device sync, autonomous messaging, imported legacy data, speaker identification or playbook system is included in this baseline.
- Both CLIs own authentication and may use their existing local configuration. Toby never reads credential files, copies tokens or asks for an API key. Grok explicitly authenticates with its cached CLI token; no API-key fallback is selected by Toby. Grok uses the resolved or explicitly selected model and native tools; permission requests are presented for one-time approval. Executable discovery supports standard installs and NVM; Settings can select a custom executable.
- Local builds use an Apple Development certificate, not Developer ID distribution signing or notarization. Distribution packaging needs a signed runtime bundle and notarization work.

## Data and privacy

Bundle ID: `com.rohan.toby.next`.

All app records and workspace files are under `~/Library/Application Support/TobyNext/`. The database is `Library.store`; each item has a UUID-named workspace. `Inputs/` holds copies of attachments, `Outputs/` holds requested deliverables, and `Recording/` holds microphone and meeting audio as separate CAF files.

Voice speech recognition is explicitly on-device; voice-mode raw audio is not saved. Meetings save raw audio locally. Text submitted to either provider, referenced files the agent reads, and approved memory may be processed by the provider. Generated meeting notes send transcript text, not the raw recording. The app never silently marks anything as durable memory.

## Versioning

`VERSION` is the release version; `CHANGELOG.md` records changes. Local Git tags use `vMAJOR.MINOR.PATCH`. No remote repository or push is configured by this setup. The initial persistence schema is documented in `docs/architecture.md`; future schema changes require an explicit migration plan.

See [architecture](docs/architecture.md), [QA handoff](docs/QA-HANDOFF.md) and [Apple references](docs/apple-guidelines.md).

### CLI session continuity

Codex resumes its saved thread. Grok starts a fresh ACP session per task and receives up to 20 prior completed messages, bounded to 32,000 characters; it does not resume hidden Grok tool history. Visible recent history is also supplied to Codex for continuity after provider switching. Grok’s CLI configuration determines its native tool/sandbox behavior; Toby does not enable always-approve and rejects unsupported client-side requests.

The application icon is the original Toby icon, copied byte-for-byte from the old app into `Packaging/Toby.icns`. Packaging copies this versioned asset directly; it does not generate a replacement icon.
