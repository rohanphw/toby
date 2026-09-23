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

## Meeting-audio status regression

With Toby enabled in Screen & System Audio Recording, click Check / enable access. Successful source enumeration should show green Access confirmed and stay confirmed after switching away and back. Denial should show a yellow unverified state with privacy/relaunch guidance; recheck after granting. Quit/reopen if macOS requires it. Revoke access and explicitly Check again; failure must clear session verification. Setup must never start a recording. Not exercised by the agent.

## 0.7.0 — calendar and meeting prompt acceptance (user-run only)

- Import a Desktop OAuth client; reject Web client JSON. Cancel sign-in, decline permissions, and allow it to time out. Confirm no token content is surfaced.
- Connect two Google accounts; select multiple calendars in each. Verify recurring instances, timezone offsets/DST, shared calendars, next-page results, cancelled/declined events and per-calendar exclusion. Restart and verify choices persist.
- Reconnect revoked/expired credentials; test offline and API-disabled errors. Disconnect during background sync and change calendar choices mid-sync: removed events must not return. Check duplicate Mac/Google copies show only once.
- Observe a near-start reminder without losing typing focus; exercise Join & take notes, dismiss, snooze, timeout, overlapping events and restart after dismiss. Cancel/remove an event while its reminder is visible; stale action must not start recording.
- Enable possible-call detection. Exercise known native apps and browsers, sustained mic activity, microphone pauses, unsupported/muted calls and one prompt per activity session. This is deliberately approximate, not universal detection.
- Confirm no reminders during onboarding, voice or meeting recording. Confirm only an explicit action (or separately opted-in scheduled automation) starts recording. Verify disabled reminder settings and quit stop further prompts.
- Verify calendar reminders with main window closed, multiple displays/spaces and full-screen apps. Custom panels do not inherit Notification Center Focus settings. Assess layout and keyboard/accessibility yourself.

No application, browser sign-in, audio capture, permissions or visual QA was run by the agent. Google setup remains required before end-to-end validation.

## 0.7.1 — permission identity recovery (user-run only)

Quit all Toby instances and open the rebuilt canonical `gary-app/dist/Toby.app`. Use Settings → This Mac to verify its path and `com.rohan.toby.next` ID. Reopen setup and Check / enable access. The development-signature transition may require one fresh permission grant and a quit/reopen before capture works. Check actual meeting-audio capture after authorization; a green setup status alone does not verify audio buffers.

The older `gary/dist/Toby.app` uses `com.toby.agent` but has the same display name. It remains untouched. Any stale Toby permission entries must be identified/reauthorized by the user in System Settings; no `tccutil reset`, TCC database edits or legacy app removal was performed. Verify permission survives the next rebuild under the pinned certificate. If access still fails, collect the full in-app error including its app path.

## 0.8.0 (user-run after final configuration)

- Swipe right/left through page and item history; verify page boundaries, deleted items, back from Settings, Cmd-[ / Cmd-], and no repeat navigation from momentum. Vertical/diagonal scrolling, text editors, horizontal content, model popovers and sheets should keep normal behavior. Verify both Natural Scrolling settings.
- Start talking from the menu bar while another app is active. Confirm the main workspace stays behind, a new conversation saves, phase/transcript/reply update, closing the main window preserves this session, and End voice/quit stop capture. Ordinary workspace Talk remains foreground. Missing permissions/setup should show a message without opening the workspace automatically.
- Check Settings at minimum window size, provider marks, tab navigation, language selection, connection recovery and disclosures. Check Codex usage/reset display against the CLI, including missing windows and unavailable API-key account quotas. Grok must show unavailable rather than fake limits.
- After bundling Toby’s OAuth client, Connect Google must go straight to the browser; no client-import or Cloud setup UI should appear. Validate multi-account consent/refresh/revocation yourself.

Agent validation is limited to compilation, source review and packaging checks once configured. No app runtime, visual or live authentication/usage tests have been run.

## 0.9.0 (user-run)

- Reconnect an existing account via Enable Drive; verify declining only Drive keeps Calendar usable. Add a second account during onboarding; skip/dismiss mid-sign-in and check it cancels. Completed onboarding should not automatically reappear.
- Calendar: today/tomorrow/seven-day ranges, midnight/DST, multi-day all-day events, recurring instances, non-call events, declined/cancelled entries, selected calendars and account removal during sync. Check newly recorded calls link to their notes; historical notes have no event link.
- Drive: enable Picker API in the existing project; choose files in the browser, cancel, select the wrong Google account, import Docs/Sheets/Slides/regular files, test restricted files and size errors. Verify partial imports remain attached when a later file fails. No Calendar permission should disappear after using Picker.
- Save note/meeting notes/transcript to the explicitly selected account, inspect actual content, follow document link. Test disconnect/network loss mid-write; check Drive before retrying an uncertain save. No audio should upload.
- Remove one of two accounts: remaining account/calendar selection persists; removed tokens/events do not return; local notes/imports and Google files remain. Separately synced Mac calendar copies may still appear.

No app launch, browser sign-in, visual QA or functionality tests were performed by the agent.

## 0.9.1 (user-run)

- Open and collapse event details with mouse and keyboard; opening another event closes the previous one. Confirm no browser opens for details; Join still opens the call.
- Check Google and Mac events with missing fields, long descriptions, HTML descriptions, guest lists, timed/multi-day all-day dates, and Reduce Motion. Details should refresh with the calendar and disappear when their event/account is removed.

## 0.9.2 (user-run)

- With two signed-in Google accounts and the browser default set to the wrong one, join from Calendar, Meetings, Home and a reminder; verify Meet uses the displayed email. Check behavior when that account is not signed into the default browser/profile.
- Check an existing authuser parameter is replaced, unrelated query/fragment data is preserved, and Zoom/Teams links remain unchanged.
- The same meeting on two connected accounts must retain two labeled choices, but produce only one reminder/automatic recording. Removing one account must not make an existing reminder silently join as another account. Mac calendars without a known current-user attendee should retain the original link.

## 0.10.0 (user-run; required before relying on archive isolation)

- Right-click Home, Library, Memory, Meetings and search rows: Archive/Delete only; archive rows offer Restore/Delete. Verify deletion confirmation and cancellation, including from search and the currently open chat. Organizing must disable during agent/voice/recording/Drive work.
- Archive a remembered/pinned chat with attachments/recordings; restart; check Archive, read-only details, physical workspace move, absence from normal search/Home/Memory, and restore with Remember still off.
- Run Codex and Grok separately. They must operate in their own workspace while attempts to read another workspace, archived files, or Toby's SQLite store fail. Confirm Codex tools avoid nested sandbox failures with externalSandbox; verify auth, ordinary commands and output creation still work. This was not exercised by the agent.
- After archiving remembered text, send a fresh task and inspect its supplied context; archived text must be absent. Old provider sessions must not resume. Previously copied text in other chats/provider caches is outside retrospective forgetting.
- Permanently delete archived/active items; verify messages and files disappear without Trash. Simulate database/filesystem failures and interrupted staging to verify rollback/recovery and truthful cleanup errors. No live user data was deleted during development.

## 0.11.0 — workspace rollout (user-run)

See [workspace rollout acceptance checks](workspace-rollout.md) for capture, projects, meeting preparation, task review, cited library answers, daily briefs and saved workflows. Release and test targets compile; tests have not been executed. Runtime, provider, Services, global shortcut, accessibility and visual acceptance remain unverified. The iPhone companion is excluded.
