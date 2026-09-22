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
