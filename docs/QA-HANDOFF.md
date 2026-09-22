# Manual QA handoff — 0.5.0

Per Rohan’s instruction, the agent did not launch the app, capture screenshots, perform visual QA, control the app/device, or run functionality tests. Build success does not establish any of the behaviors below on a real device.

Use the packaged `dist/Toby.app`, not the bare SwiftPM executable, for your pass.

## Your first pass

1. Open Settings using the toolbar and Command–Comma; verify both open the in-app drawer, Close/Escape dismiss it, and auto-record consent appears inline. Check the Codex connection, select a model if desired. Start a typed task. Confirm separate progress/answer messages, a usable final response and a generated file under Outputs.
2. Stop during Connecting, during response streaming and during a command. Start another task immediately afterward. Refresh the connection during a run; the run should continue.
3. Ask for an action that needs approval. Inspect the requested command/scope, deny it, then try a separate task and approve once. Confirm the UI remains usable.
4. Open Talk or use Control–Option–Space. Grant microphone and speech permissions. Verify a new thread opens with an animated listening area. Speak, pause, read the reply (no audio output), interrupt it, then End voice. Try again and close the main window. Verify microphone capture stops and the conversation remains in Library.
5. Record a meeting with headphones. Verify both local and remote speech, record longer than one minute, finish, and inspect transcript, source audio tracks and generated notes. Edit notes and reopen them.
6. Connect Calendar. Confirm conference events appear, explicitly enable auto-recording and try a short scheduled event. Confirm visible capture at its start, Finish, per-event Skip and scheduled-end behavior. Verify it does not repeatedly record the same event after relaunch.
7. Deny/revoke microphone, Speech Recognition and system-audio permissions independently. Confirm actionable errors and saved partial data rather than a stuck capture state.
8. Create/edit a note, mark it Remember, ask a relevant question in a different item, unmark it, pin/unpin, search, export, attach files and inspect generated files in Finder.
9. Quit during capture and during a task. Relaunch, inspect saved drafts/responses and interrupted states. Verify no recording or task restarts without a new action.
10. Evaluate typography, spacing, window resizing, keyboard access, VoiceOver labels, reduced motion/transparency and the inline voice area. No visual fidelity claims have been made by the agent.

## Known first-release limits

See README’s Current boundaries. In particular: calendar-triggered recording is not live call detection; voice uses explicit turn boundaries; speech is dependent on installed on-device language support; there is no speaker diarization; very long meeting summaries are bounded; cloud/sync/Google helpers/playbooks are not implemented.

## CLI authentication follow-up

- With both CLIs already authenticated in Terminal, use Check CLI session for each in Settings. Neither should ask for an API key or a second account registration.
- Select each provider in turn. Verify typed tasks, voice replies and meeting notes run through the chosen CLI; verify continuation when switching providers.
- Verify a missing executable and a signed-out/expired CLI session report an actionable error. Check a connection during a task; it must not terminate active work.
- For Grok, verify streaming, one-time allow/deny, stop during startup/prompt/approval, and subsequent reuse. Grok session history is bridged from visible messages, not resumed natively.

These checks have not been run by the agent.

## 0.3.0 design pass

Rohan reported voice working before this iteration. This redesign has compile/package validation only. Check the 880-point minimum window width, the Settings drawer, long titles/transcripts, Reduce Motion, repeated Talk invocation, navigation during listening, and written replies from both CLIs. The original app icon is unchanged.

## Home model selector

Wait for automatic model discovery on Home, choose a default, confirm Settings reflects it, and verify the next typed/voice task uses it. Relaunch and confirm the choice persists. Switch to Grok, inspect its automatically loaded models, save a specific choice and verify the next task uses it. With no saved Toby choice, confirm the real CLI-configured model is selected. Verify loading failures appear inline and Home selection is disabled during an active task. These checks are for Rohan; the agent has not exercised provider sessions.

## Grok model and black-theme update

Verify Home and Settings synchronize each provider’s separate saved choice, including after relaunch. Try model-load failure, stale/unavailable selection and switching providers; a rejected explicit Grok model must not silently run a different one. Confirm the logo appears to the left of Toby in the packaged app header, black surfaces remain readable at minimum window size, and Reduce Transparency removes the background gloss. These are manual checks for Rohan, not agent-verified behavior.

## Custom controls and automatic defaults

Verify both catalogs load at launch without a button, failed discovery stays visible and retry works in Settings. With an unset Toby model, confirm Codex honors its configured model and Grok its current model ID; existing explicit choices must survive relaunch. Check model-search typing, Up/Down/Return/Escape, outside dismissal, VoiceOver selection, and long names. Check library/search clear buttons, keyboard focus, larger header logo, flat backgrounds and solid hover fills. Not run by the agent.

## First-launch onboarding

On a fresh app preference profile, verify setup opens at step one. Quit midway and confirm the same step returns. Check Skip, Dismiss, and Finish separately: each should prevent automatic reappearance; Settings → Reopen setup should restore it. Finish should require the selected provider’s authenticated model, but deferred permissions should not block it. Existing installations without an onboarding outcome also see setup once.

Grant and deny microphone, Speech Recognition, meeting-audio and Calendar permissions independently. Confirm no microphone or recording starts during setup, status refreshes after returning from System Settings, and denied access can be deferred. Verify window close/global hotkey/menu actions cannot bypass pending setup or start a recording. If macOS requests relaunch after audio permission, resume the saved step afterward.

Choose a folder, cancel a choice, relaunch, and attach a file: the picker should begin in the chosen location without importing any folder contents. Test a moved/deleted folder and reselect it.

For both providers, check missing executable, signed-out session, authenticated session, failed model discovery, stale model choice and successful retry. Open the official guide, copy the login command, sign in in Terminal and recheck. Confirm one connected provider is sufficient and no API key is requested. These are manual QA instructions; no permissions were requested or app launched by the agent.
