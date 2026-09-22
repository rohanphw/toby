# Changelog

## Unreleased

- Prepare public source distribution with MIT licensing, contributor and security guidance, updated setup instructions, and credential-file exclusions.
- Split remembered-context string assembly into smaller expressions to avoid a Swift compiler timeout on the macOS CI runner; preserve context selection and limits.

## 0.10.0 — 2026-09-23

- Add Archive/Delete context menus to library, recent, meeting and search rows; add Library → Archive with read-only chat viewing and restore.
- Exclude archived items from normal lists, search and memory context. Clear their Remember/Pin flags, move workspace files into Archive, block new agent requests and reset saved CLI thread references after archive/delete.
- Launch agent processes with an inherited macOS Seatbelt rule denying access to Toby’s database, archive and other item workspaces. Codex uses externalSandbox to avoid nested Seatbelt profiles; keep its write scope limited to the current workspace, CLI state and temporary directories.
- Delete permanently removes the local model/messages and workspace files after confirmation. Recover interrupted file moves on launch; report cleanup failures rather than claiming complete deletion.
- Compile/package/static review only. Filesystem isolation, CLI compatibility, persistence and context-menu behavior require user runtime QA.

## 0.9.3 — 2026-09-23

- Correct provider selector spacing: inset each logo/label, give both segments a minimum width, and enlarge the undersized Home selector. Match the adjacent model control height.
- Compile checks only; supplied screenshot used as the reference, without app launch or visual QA.

## 0.9.2 — 2026-09-23

- Carry connected-account email through scheduled calls and add an email-based authuser hint to Google Meet joins from Calendar, Meetings, Home and reminders. Preserve other link parameters and leave other providers unchanged.
- Retain distinct account copies of shared meeting occurrences and display the account in meeting rows/reminders. Keep reminder/recording deduplication by occurrence.
- Compile/package checks only; browser account selection remains user-run QA.

## 0.9.1 — 2026-09-22

- Replace browser redirects for event details with an inline Calendar accordion. Show dates, location, organizer, guests and description for Google and Mac events; preserve separate Join actions.
- Keep one event expanded at a time, support keyboard activation and announced expansion state, and respect Reduce Motion. Calendar descriptions render as inert text without loading web content.
- Compile/package checks only; no app launch or visual/runtime QA.

## 0.9.0 — 2026-09-22

- Add Calendar to header navigation with Today, Tomorrow and a seven-day agenda, all-day events, account/calendar labels, join actions and links to captured notes.
- Request optional Drive file access alongside Google Calendar sign-in. Existing accounts explicitly reconnect; Calendar remains usable if Drive is declined.
- Add browser-based native Google Picker for selected Drive attachments and save notes or meeting text as a new Google Doc. Account choice is explicit; Picker grants never replace Calendar credentials. No background indexing or automatic uploads.
- Surface Remove account with inline confirmation in Settings. Remove local credentials/events and cancel account work while preserving local notes and Google files.
- Add optional multi-account Google connection to the Files & accounts onboarding step, preserving existing setup progress.
- Compile/package/static checks only; runtime OAuth, calendar, Drive and UI acceptance remains user-run.

## 0.8.0 — 2026-09-22

- Add workspace-scoped two-finger horizontal navigation, back/forward history, keyboard commands, and page switching; preserve normal vertical scrolling and editor interactions.
- Start voice from the menu bar without bringing the main workspace forward. Show transcript, written replies, Send now and End voice; keep background sessions alive when the workspace closes.
- Redesign Settings into Models, Capture, Calendars and General with concise copy, progressive disclosures, custom language selection and white OpenAI/xAI provider marks.
- Display Codex account-wide usage windows and reset times via the authenticated CLI. Grok account quota is explicitly unavailable, not inferred from session token usage.
- Replace user-imported OAuth setup with Toby-owned bundled Google configuration and Connect Google. The maintainer’s Desktop OAuth client is bundled in the signed app; the source configuration stays outside Git.
- Compilation/static checks only. No app launch, visual QA, recording, live provider quota or Google sign-in tests.

## 0.7.1 — 2026-09-22

- Replace ad-hoc signing with a persistent, locally pinned development certificate so permission identity no longer changes with the binary hash. Reject ad-hoc fallback.
- Refuse to overwrite a running Toby bundle; support an explicit staging path for builds.
- Show the current app path and bundle ID in Settings and failed meeting-audio verification guidance to distinguish legacy/new copies.
- No permission resets, old-app removal, app launch or audio testing. Existing stale permission grants may need reauthorization after switching signing identity.

## 0.7.0 — 2026-09-22

- Add nonactivating desktop meeting prompts with Join & take notes, dismiss and five-minute snooze, styled for Toby’s black interface.
- Connect multiple Google accounts directly with desktop OAuth/PKCE, Keychain credentials, per-account calendar selection, recurring-event expansion, pagination and background refresh. Include an in-drawer OAuth setup guide and client JSON import.
- Merge Google and optional macOS calendars, combine duplicate conference occurrences and ignore declined/cancelled events.
- Add opt-in possible-call reminders from supported apps’ microphone activity on macOS 14.2+. Detection never records audio or proves meeting attendance.
- Build/package/static validation only; OAuth, permissions, desktop prompts and real calls remain for user QA.

## 0.6.1 — 2026-09-22

- Verify meeting-audio setup through the same ScreenCaptureKit source enumeration used by recording instead of requesting access through CoreGraphics alone.
- Replace an unconfirmed negative preflight with “Access not verified”; retain successful session verification across app activation, allow explicit rechecking, and show actionable privacy/relaunch guidance on failure.
- Permission verification creates no capture stream. Build/package validation only; no app launch or permission/recording test.

## 0.6.0 — 2026-09-22

- Unify interface typography around native SF with a tighter heading scale, smaller content titles and explicit primary/secondary button hierarchy.
- Introduce shared semantic state labels: green success, red failure/blocked access, yellow pending/unavailable decisions, neutral loading. Pair color with text and icons.
- Replace oversized onboarding cards with compact permission/provider sections; remove disabled actions for completed permissions and collapse CLI repair details when connected.
- Recompose Home around voice entry and a single writing/model composer. Remove conversation message boxes and reduce unused title space.
- Preserve flat black surfaces, the original icon, custom controls and existing functionality. Build/package checks only; supplied screenshots informed the changes, without app launch or new visual QA.

## 0.5.0 — 2026-09-22

- Add a persistent, three-step in-app onboarding flow for voice/meeting permissions, local files and CLI providers. Resume unfinished setup; persist Skip, Dismiss and Complete; reopen from Settings.
- Request permissions only on user action, link denied access to System Settings, and leave calendar/meeting capture optional without starting any recording.
- Remember an optional attachment-picker folder without scanning/importing it or requesting Full Disk Access.
- Show both CLI connection states, official setup guides and model selection. Require the selected provider to be ready for completion while retaining Skip/Dismiss.
- Validation: compilation and package checks only; no app launch, permission requests or functionality/visual QA.

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
