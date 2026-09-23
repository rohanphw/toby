# Toby design language

## Scene and direction

A personal Mac workspace for thinking between calls and returning to unfinished ideas in the evening. Flat black surfaces, restrained solid borders and soft native typography give Toby a distinct personal Mac identity. The original Toby logo sits immediately left of the header wordmark.

## Palette

Neutral black canvas #000000, surfaces around #0E0E0E, drawer #131313, text #F5F5F5, secondary #A3A3A3, silver-blue accent #D4E0F0. No gradients anywhere, including background, surface borders or hover states. Use solid black/neutral fills and thin solid borders. The header logo is 48 points.

## Type

Use one native SF family throughout; semibold for headings and titles, regular for prose, medium for controls. No serif display headings, uppercase letterspaced labels or monospaced decorative shortcuts. Home hero 36, onboarding/page titles 30–32, item titles 28, section headings 18–20, row titles 15, body 14–16, metadata 12–13. Body columns capped around 760 points.

## Layout

Top navigation uses a larger logo next to Toby. Provider selection uses custom segments; models use a searchable custom list. Search fields have custom solid backgrounds, focus borders and clear actions. Home has a clear voice entry, an understated writing input, and a chronological shelf of actual work. Notes and meetings use grouped rows rather than a repeated card grid. Thread content is readable, left-aligned and centered within the available page.

## Voice

Talk opens a new thread in the workspace. An inline capture surface expands with a short fade/translation and real audio-level animation. Mic status, recognized words, Send now and End voice are together. Replies always appear in text. The microphone returns after a completed answer, until End voice. An active capture remains accessible when browsing other pages.

## Settings and recording

Settings slide in from the right with no dimming scrim and no separate window. Existing workspace state remains in place. Automatic-recording consent is inline in that drawer. Meeting recording stays on its thread page with persistent controls. macOS permission dialogs remain system-managed.

## Motion and interactions

220–280ms ease-out transitions, no spring bounce. Voice opening animates once per capture start; wave activity follows microphone input. Reduced Motion removes movement and continuous waveform animation. Buttons have visible hover, press, focus and disabled states. Native controls handle keyboard focus.

## First-launch setup

A full in-app page uses the existing flat black surfaces, logo and consistent SF typography. Three numbered steps cover voice, files and providers; a fixed footer offers Back, Continue/Finish and Skip, with an explicit dismiss control in the header. Each permission has a plain-language purpose and current status. Provider setup links sit beside actionable login/recheck controls. No app-owned onboarding modal or new window is used.

## Semantic states and hierarchy

Success uses green (#5ED194) with a check icon; failure or denied/restricted access uses red (#FA666E) with a cross; unresolved choices, missing decisions and deferred optional access use yellow (#F0C24F) with an attention icon. Loading stays neutral. No state relies solely on color. Provider errors and failed task messages are red; user interruption is yellow.

A light solid primary button identifies the main next action; secondary actions use quiet dark controls, tertiary details use text buttons. Successful permissions replace disabled controls with a green state. Connected providers show a concise status; executable paths and repair controls live under Connection details.

Use one purposeful writing surface on Home, with model controls inside it. Onboarding permissions and providers use aligned sections, not repetitive rounded cards. Conversations use open prose and role labels, reserving a surface for the composer. Borders remain subtle and solid; no gradients.

Shared presentation uses `StatusTone`/`StatusLabel` for semantic colors and symbols, `PrimaryButtonStyle` for the next action, and `QuietButtonStyle` for secondary controls. Permission states come from authorization enums; provider readiness/errors and message failure state drive their own explicit tone. No persistence or runtime protocol changes in the visual pass.

Meeting-audio permission checks now run ScreenCaptureKit enumeration only after an explicit setup-button action. Successful enumeration is retained for the current app session instead of being overwritten by a negative CoreGraphics preflight on activation. It is not persisted as a permanent grant: explicit rechecks can clear it, relaunch starts fresh, and real recording continues to enforce permission and report errors. A negative passive preflight is unverified, not a definitive denial. No stream, microphone or image capture runs in onboarding.

## Direct calendars and desktop prompts (0.7.0)

`MeetingSchedule` owns `GoogleCalendarStore`, combines it with optional EventKit sources, deduplicates by conferencing URL/start, and checks reminder/automatic-recording eligibility every 20 seconds. Google sync runs every two minutes without overlapping refreshes. Occurrence keys persist shown/handled reminders; a recent-key retention window prevents startup from discarding reminder history before Google returns.

`GoogleOAuth` implements browser-based Desktop OAuth with PKCE/state and a short-lived loopback-only `NWListener`. `CalendarKeychain` holds the imported client and per-Google-subject token payloads. `GoogleCalendarStore` persists account IDs/email labels/calendar selections in preferences, keeps upcoming events in memory, expands recurrence with paginated Calendar API reads and refreshes access tokens. Revision checks/cancellation prevent disconnected accounts or superseded selections from republishing stale events. Auth errors are rendered without exposing token responses. No calendar writes are implemented.

`MeetingPrompt` owns one nonactivating AppKit panel hosting a SwiftUI card. It stays independent of the main workspace, has explicit dismiss/snooze/action controls and a 45-second lifetime. `AppModel` gates presentation during onboarding/capture, revalidates a scheduled occurrence before acting, and hides prompts when capture starts or the app shuts down. It opens links only after user action.

`CallDetection` uses Core Audio process input activity and process IDs to identify recognized app bundles on macOS 14.2+. Metadata only; it does not create audio streams or detect actual attendance. A sustained-activity threshold and per-session debounce reduce repeated prompts. It is disabled by default and unrelated to the existing automatic-recording opt-in. See `docs/google-calendar.md` for setup and runtime limits.

## Stable local signing (0.7.1)

The prior ad-hoc app signature had a designated requirement tied to its CDHash. Each new binary could invalidate TCC's previous grant even while Settings still showed an enabled Toby row. Local packaging now uses an available Apple Development certificate and pins the successful identity in ignored `.local-code-sign-identity`. Explicit `CODE_SIGN_IDENTITY` overrides are supported; missing/invalid identities fail rather than falling back to ad-hoc signing. This is development signing, not a notarized distribution build.

Packaging refuses to replace the exact executable of a running app. `APP_BUNDLE_PATH` can stage a build elsewhere. Keep using the canonical `dist/Toby.app` after quitting and rebuilding. The legacy `gary/dist/Toby.app` (`com.toby.agent`) and current `gary-app/dist/Toby.app` (`com.rohan.toby.next`) are distinct TCC clients despite both displaying Toby. No old app/data or system permission records are modified.

After the one-time signature transition, macOS may require a new grant and relaunch. Settings → This Mac and permission errors expose the current bundle path/identifier. Permission verification remains real ScreenCaptureKit enumeration; no persisted boolean can bypass macOS capture authorization.

Reference: [Apple DTS confirmation of ad-hoc permission identity changes](https://developer.apple.com/forums/thread/819406).

## Navigation, menu-bar voice and settings (0.8.0)

AppModel owns a bounded back/forward destination history (page plus optional library ID). All entry points use navigate/openItem; restoring a route does not create history and deleted items are skipped. The local NSEvent monitor is scoped to the workspace window. It accepts precise horizontal trackpad scroll gestures with an axis threshold and one action at gesture end. It ignores momentum, modified scrolling, sheets, onboarding, text editors and horizontal scroll surfaces. No global gesture capture or input permission is used. Back closes Settings first; history boundaries move between adjacent Home/Library/Meetings/Memory pages.

Menu-bar Start talking calls startVoice(inBackground: true), which never opens or activates the workspace, leaves the visible route intact and checks permissions before starting. The menu panel shows voice phase/transcript/latest written response and stop/send controls. Closing the main workspace does not stop a background voice session; quitting the app does. Normal workspace Talk and the existing global shortcut retain their foreground behavior. Tool approvals and questions require explicit Open workspace.

Settings uses four compact tabs with repair/privacy details in disclosures. Provider marks are local image assets loaded from app resources (SwiftPM resource fallback for development), with source attribution alongside them. ProviderUsage reads Codex account/rateLimits/read, prefers rateLimitsByLimitId and renders only non-null reported windows. It never treats missing fields as 0% used. Quotas are account-wide, not per-model allocations. Grok CLI 1.0.40 help exposes session token/cost usage, but no verified account-quota read contract was found; its usage area reports unavailable instead of inventing balances.

Google app client configuration is now owned by the distribution, loaded only from the signed bundle, and required by build-app.sh. User token storage stays in Keychain. Source builds still compile with an unconfigured Google state; no final bundle should be shipped until the maintainer supplies the Desktop OAuth client. See docs/google-calendar.md.

The 0.8.0 local release is now configured with the maintainer-provided Desktop OAuth client in ignored `.local/GoogleOAuthClient.json`. Packaging embeds it before signing. Google consent, account access and runtime navigation/voice remain untested by the agent.

## Calendar and Drive (0.9.0)

`CalendarEntry` represents a seven-day agenda across direct Google and optional EventKit calendars. All-day dates use local calendar days, timed events preserve API offsets, recurring instances are expanded and pages fetched. Agenda deduplication uses conference URL/start or external event ID/start; reminder scheduling projects timed calls only. Optional `LibraryItem.calendarOccurrenceKey` links newly captured meeting notes to agenda entries via SwiftData's additive migration.

`GoogleDriveStore` is owned by `AppModel`, so navigating away does not lose operation state. It uses selected-file browser Picker grants separately from the persistent Calendar/Drive OAuth session. Temporary Picker tokens are not written to Keychain. Imported files are copied into the existing item Inputs directory with sanitized unique names. Saving sends only a user-selected note/meeting text snapshot through Drive multipart conversion; no write retries or background uploads. Disconnect cancels pending account work, deletes local credentials and drops in-memory calendar data. Refresh cannot overwrite a newer sign-in grant or resurrect a removed account.

Onboarding adds optional Google connections to its existing second step without changing persisted step numbering or replaying completed setup. Settings exposes account removal with an inline confirmation.

### Inline event details (0.9.1)

Calendar entries retain location, description, organizer and guest labels from the existing Google/EventKit reads. CalendarPage owns one expanded event ID; CalendarEventDetails renders selectable inline text. Google HTML descriptions are reduced to inert plain text without loading remote resources. Event details no longer use external event URLs; Join remains an explicit conference action.

### Account-aware meeting joins (0.9.2)

CalendarEntry carries a separate optional joinEmail: direct Google connections use the authenticated account email, while EventKit uses only an explicitly identified current-user mailto attendee. Calendar names and organizers are never assumed to identify the joining user. ScheduledMeeting.joinURL adds/replaces authuser only on the exact meet.google.com host, preserving unrelated query items and fragments. All Join entry points use it. The browser still needs that Google account signed in; this does not choose a browser profile or authenticate Zoom/Teams. Agenda rows deduplicate by occurrence plus account, while reminders and recording remain occurrence-based. Reminder callbacks resolve the exact displayed event ID.

Implementation precedent: [MeetingBar account selection](https://github.com/leits/MeetingBar/releases/tag/v5.0.0-rc2).

### Provider control spacing (0.9.3)

The shared ProviderSelector uses 14-point horizontal label padding, 104-point minimum segment widths, 34-point inner height and a 4-point outer inset. Home allocates 228 points rather than compressing both provider labels and logos into 144 points. Its 42-point total height matches the model picker.

## Archive and deletion (0.10.0)

`LibraryItem.archivedAt` is an optional additive SwiftData field. `Library.activeItems` is the shared normal-list/search/context boundary. Archive clears Remember/Pin, moves existing Workspaces/<id> into Archive/<id>, and invalidates all saved Codex thread IDs to avoid resuming earlier injected memory. Restore returns the workspace and leaves Remember disabled. ArchivedItemView is read-only and contains no composer, Drive controls or memory toggle. AgentSession rejects archived items even if called outside the UI. Organizing is disabled during agent, voice, recording or Drive activity.

Deletion stages workspace files in DeletionPending/<id>, commits the cascading SwiftData deletion, then permanently removes those files. Failed database commits roll back the file move; interrupted operations recover against surviving item IDs on launch. Cleanup failures report partial completion and retry on launch. This is application deletion, not forensic disk erasure, backup deletion, Google document deletion or deletion of provider-held chat logs.

Agent CLITransport receives only its active workspace and wraps the CLI in `/usr/bin/sandbox-exec`. The inherited profile denies file-read-data and file-write operations anywhere under TobyNext outside that workspace, including the raw SQLite database, Archive, pending deletion and other chats. Account/model/usage probes do not receive agent work and retain their existing transport. For Codex, the wrapper additionally denies writes outside the workspace, CODEX_HOME, temporary directories and required device files. TurnStart uses the installed CLI schema's externalSandbox policy to avoid macOS nested-sandbox failures. API/network access remains enabled; the external policy is a filesystem isolation boundary, not an outbound-domain filter. No unsandboxed fallback is provided for agent work.

This boundary applies to CLI processes launched by Toby and their descendants. It does not revoke text already copied into another conversation, provider/CLI caches, user-created exports or access by independent apps/agents outside Toby. Already-sent context cannot be retracted. These limitations must not be represented as guaranteed retrospective forgetting.

Source contract: local CLI-generated TurnStartParams/SandboxPolicy schema; [Codex permissions source](https://github.com/openai/codex/blob/main/codex-rs/app-server-protocol/src/protocol/v2/permissions.rs). Runtime Seatbelt/CLI compatibility remains untested under the user's compile-only constraint.

## Public distribution (0.10.0)

Release packaging uses a separate staged bundle with Developer ID signing, hardened runtime, and notarization. Local development builds retain their existing pinned signing identity. See [release provenance and packaging](releases.md). The bundle identifier and local data directory are unchanged; changing signing identity may require fresh macOS permission grants.

## Workspace rollout (0.11.0, local)

`WorkspaceStore` owns versioned Codable projects, item-to-project assignments, tasks, workflows, library-search scopes, and per-response source references in `TobyNext/Workspace.json`. Writes encode a copy, atomically replace the file, and only then update visible state. Load/decode errors do not overwrite the file. This is additive storage; LibraryItem and Message's SwiftData schema are unchanged. Removing a project keeps its notes and tasks and clears membership/search scope. Project assignment invalidates provider thread IDs.

`LibraryContext` converts active note bodies, meeting notes/transcripts, and completed messages into documents. It ranks overlapping 1,800-character excerpts with 1,400-character strides by title/body token matches and recency. This is lexical retrieval, not embeddings or an exhaustive semantic search. Library questions send at most 12 excerpts; normal project conversations 12, workflows 20, and task extraction 40. Saved citation indices belong to each response. Missing/deleted sources retain empty placeholders so later indices do not change. The renderer hides archived source excerpts; deletion reconciles persisted quotations and linked tasks, with launch-time recovery for interrupted cleanup. Existing generated answers cannot be retroactively retracted from other chats or providers.

Scoped tasks start fresh provider threads and receive only their supplied snapshot instead of global remembered notes. Library-search follow-ups refresh retrieval and reset the provider thread. Normal project conversations also include explicitly remembered notes under the existing policy. CLI filesystem isolation still denies access to the rest of TobyNext, including Workspace.json; context is supplied explicitly through prompts.

Task extraction is structured model output, validated against actual source IDs and exact quoted substrings. Only supported candidates enter the suggested state. Owners and deadlines remain AI suggestions until the user reviews and accepts them. Date parsing accepts exact YYYY-MM-DD values; relative dates are left unspecified by the extraction instructions. Duplicates with the same source item, quote, and title are suppressed. Completion is always user-controlled. Linked tasks are hidden while their source is archived and removed when it is deleted.

Quick capture uses a separate Carbon hotkey ID and an AppKit Services provider advertised in Info.plist. Clipboard reads happen only on Paste clipboard or explicit Services invocation; there is no polling, synthetic Copy command, or Accessibility permission. Files are copied to the capture item's Inputs directory. Dictation uses the existing on-device AudioCapture path in a capture-only mode, with explicit Finish rather than silence submission, and appends to the note without invoking AgentSession. The capture drawer is backed by a real autosaved library note and leaves the current workspace selection intact.

The daily overview derives dated accepted tasks and current calendar snapshots locally, updating while open. Brief generation and meeting preparation are explicit AI actions; no background messages, operating-system notification scheduling, email integration, or cross-device sync is introduced. Workflows save editable instructions and generate drafts through the existing CLI task/approval path. External actions are not part of the workflow feature.

## 0.11.1 — provider compatibility and updates

CLITransport launches Codex with its default app-server stdio transport. PATH includes the chosen executable, resolved installation, inherited absolute paths and common Node manager locations. No login shell or shell startup files run. A locked 8 KiB stderr tail stays in memory and is classified into fixed, actionable messages; raw diagnostic text is neither persisted nor displayed. Startup errors still require the affected user's CLI versions and Terminal output to confirm their cause.

Grok discovery creates an authenticated ACP session in a temporary empty directory, consumes `models.availableModels` and `models.currentModelId`, then stops the process. It sends no model prompt and rejects tool requests. Session creation can persist CLI-side session metadata. No model IDs are guessed.

AppUpdater owns Sparkle 2.10.0. Settings starts the updater only on an explicit check; automatic checks, installation and system profiling default off. The HTTPS appcast references GitHub Release assets, uses monotonically increasing bundle builds, and signs updates with Ed25519. Only the public key is embedded. Downloaded updates are verified before extraction. Restart waits for active work and uses the existing application shutdown path to save the library. Sparkle can show its own update dialogs. The appcast and release assets must be published together as described in releases.md.
