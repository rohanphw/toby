# Changelog

## 0.4.1 — 2026-09-22

- Remove all background and surface-border gradients; use solid hover fills. Enlarge the header logo to 48 points.
- Replace native model/provider pickers and search chrome with custom styled controls, searchable model lists and library filter segments.
- Load both CLI model catalogs at launch. Resolve unset defaults to concrete configured model IDs, preserve explicit choices, and remove the Home load button and CLI-default option.
- Build/package validation only; no visual or functionality QA.

## 0.4.0 — 2026-09-22

- Discover Grok models through its authenticated ACP catalog and apply the saved choice before prompting each session. Home and Settings share model pickers for both providers; CLI default remains available.
- Replace warm brown/apricot styling with glossy black surfaces, subtle highlights and silver accents.
- Add the existing bundled Toby logo to the left of the header wordmark without changing the application icon.
- Document xAI source research and protocol details. Validation: build, signature, plist and asset checks only; no app launch, live provider prompt or visual/functionality QA.

## 0.3.1 — 2026-09-22

- Add a Home default-provider/model selector, synchronized with Settings. Load or refresh Codex models through the existing authenticated CLI check; Grok clearly shows its CLI-managed default.
- Keep the selected model visible before discovery and disable Home selection during an active task.
- Validation: release compilation and bundle checks only; no app launch or visual/functionality QA.

## 0.3.0 — 2026-09-22

- Removed voice playback entirely: all replies are written; the microphone resumes after each reply.
- Talk and the global shortcut open a fresh thread in the main workspace with an animated, audio-reactive listening area. Repeated invocation returns to an active session.
- Replaced the separate Settings window with a trailing in-app drawer and inline automatic-recording consent. Recordings remain in the main workspace.
- Redesigned Home, library rows, thread presentation and shared typography with warm charcoal, cream and apricot; rounded native headings replace serif headings and uppercase labels.
- Preserved the original Toby icon, CLI authentication, capture services and persistence schema.
- Validation: compile and package checks only; no app launch, functionality tests or visual QA.

## 0.2.1 — 2026-09-22

- Restore the original Toby application icon, bundled unchanged from the old app.
- Version the icon asset directly and remove the replacement icon generator.

Validation: release build, bundle signature and exact icon-file comparison. No app launch or visual/functionality QA.

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
