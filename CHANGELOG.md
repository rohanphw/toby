# Changelog

## 0.2.0 — 2026-09-22

- Use installed, authenticated Codex and Grok CLIs; remove the app-owned sign-in flow.
- Add Grok ACP cached-token authentication, streamed tasks and native one-time permission handling.
- Add provider selection, independent CLI session checks, explicit executable selection and copyable login commands.
- Preserve visible conversation context across providers without copying credential files or tokens.
- Keep the persistence schema unchanged. Grok uses new runtime sessions with bounded visible-history context.

Validation: compilation and bundle metadata/signature checks only; no app launch, provider/auth requests or functionality testing.

## 0.1.0 — 2026-09-22

Initial native implementation of the fresh, voice-first Toby app.

- Introduced a personal workspace with Home, Library, Meetings and Memory, retaining the old Toby visual direction without a chat sidebar.
- Implemented local persistence, note editing, search, pins, explicit memory, attachments, Markdown exports and workspace artifacts.
- Added voice conversations, native speech recognition and spoken responses, a global talk shortcut and menu-bar controls.
- Added microphone/system-audio recording, calendar-based opt-in automatic capture, timestamped channel transcripts and generated meeting notes.
- Rebuilt Codex integration around independent process ownership, bounded RPC requests, cancellable startup, structured approval/input handling and incremental response persistence.
- Added app-bundle packaging, an application icon, permission descriptions and local versioning.

Validation: compiler/build and static packaging checks only. No app launch, UI inspection, screenshots, device interaction, provider execution or functionality tests were performed.
