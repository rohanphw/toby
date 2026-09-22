# Architecture — 0.4.0

## Product

Toby is a native, local-first personal workspace. Voice is an entry point, meetings are source material, and notes/files are durable outcomes. Navigation is top-level and content-led; conversation history belongs to an item rather than a permanent sidebar.

## Ownership

- `AppModel`: dependency composition, navigation and cross-feature handoffs.
- `Library`: one SwiftData model context, mutations, bounded checkpoints, import/export and recovery.
- `AgentSession`: one active run with generation ownership, event projection, approvals and completion callbacks.
- `CLITransport`: one Codex app-server or Grok ACP process, serialized stdout framing, request deadlines, cancellation and stale-process isolation.
- `AccountConnection`: a separate, short-lived transport for CLI authentication checks and provider model discovery. It cannot stop a task’s process.
- `VoiceSession`: talking lifecycle, silence boundary and microphone resumption after written replies.
- `MeetingSession`: meeting lifecycle, transcript assembly and local recording ownership.
- `AudioCapture`: permissions, AVAudioEngine and ScreenCaptureKit. No video output is registered or persisted.
- `AudioSink`: off-render-thread serialized audio file writes and recognition. Recognition rolls every 45 seconds to keep meeting sessions bounded.
- `MeetingSchedule`: read-only EventKit projection and explicit calendar-based automatic recording policy.

## Persistence schema 1

`LibraryItem` has a stable UUID, kind, title, source body, generated notes, draft, timestamps, pin/memory flags, runtime thread ID, recording state, attachment names and a cascade relationship to messages. `Message` has its own UUID, role, text, state, timestamp and runtime item ID.

The initial SwiftData model is the baseline schema. Do not rename/remove stored properties or change relationship semantics without adding a versioned schema and migration. The app refuses to open a damaged/incompatible store rather than deleting it or silently creating an empty replacement.

Audio lives outside the database. Each item owns one directory under `Workspaces/<UUID>`. Audio source tracks are separate CAF files. The app deliberately uses a new bundle ID and a new Application Support root; the previous Toby library is not touched.

Streaming updates are checkpointed at most 500ms after the first unsaved change, including during continuous streaming. Completed messages and runtime IDs are saved immediately. On relaunch, streaming messages and recording states become interrupted. This is recovery of saved work, not resumption of a terminated process.

## Runtime protocol

The local app-server uses newline-delimited JSON over stdio. Each request has a 30-second deadline and cancellation cleanup. Process identity is generation-scoped to prevent callbacks from a terminated child affecting a new owner. Each task resumes the item’s runtime thread or creates one in that same item’s workspace. User-configured models apply to the next task. Command/file approvals are one-time; unknown server requests are explicitly rejected. User-input questions are presented in a native sheet.

Agent messages retain their runtime item identity. Completed message text can reconcile missed deltas. Status checks are isolated. Stop closes stdin, terminates the child and schedules a force kill if it remains alive. No provider call runs merely because the app launches.

A three-minute event-silence watchdog stops unresponsive work, except while the app waits for an approval or a user answer. The UI exposes status and errors and retains the user prompt for a subsequent follow-up.

## Capture policy

Talk and the global shortcut create a new conversation and select it in the main workspace. Reinvoking Talk during capture returns to that active thread. A short pause submits the utterance. Microphone capture pauses during execution; replies render only as text, then listening resumes. Explicit interruption stops execution and resumes listening. End voice or closing the main workspace ends the voice session. Navigating to another page retains a visible return/end control.

Settings is a trailing in-app drawer, with Command–Comma routing to the same state. Automatic recording consent appears inline in the drawer. There is no Settings scene or voice window. Voice entry and drawer transitions respect Reduce Motion. Meetings retain inline recording controls and transcripts. Provider approvals and questions retain their existing sheets.

Meeting capture records microphone and all system audio except this app. Both sources are transcribed on-device. Calendar automation is opt-in and checks every 20 seconds while the app is open. Supported conferencing events begin recording near their scheduled start and finish at the scheduled end. A persisted event-occurrence key prevents immediate re-recording after relaunch. Skipping an event persists the same exclusion. No browser/app surveillance or inferred call detection is performed.

## Build/distribution

SwiftPM builds the executable. `scripts/build-app.sh` creates an app bundle with its icon, Info.plist usage descriptions and ad-hoc signature. It does not launch or install the app. Developer ID signing/notarization and a fully packaged Codex runtime remain distribution work.

## CLI authentication and Grok (0.2.0)

No credentials are imported into Toby. Each subprocess inherits the current user's environment and home directory. Executable discovery honors explicit selections, then PATH and standard per-user/system installs. Account checks use separate processes and never send a model prompt. Sign-in belongs to Terminal (`codex login` / `grok login`); the app can copy the command but does not run it automatically.

Codex uses `account/read` on its authenticated app-server. Grok runs `agent --no-leader stdio`, initializes ACP version 1, requires the advertised `cached_token` method, and calls `authenticate` with headless metadata. Missing/expired credentials fail visibly; Toby does not select API-key authentication. Grok task sessions are fresh with bounded visible-history bridging; no SwiftData schema change was required. Native Grok tool-permission requests map only to advertised allow-once/reject-once options; unsupported client methods are rejected. Check/stop are scoped to Toby's child process, never the user's shared CLI leader.

Protocol references: [xAI headless/ACP documentation](https://docs.x.ai/build/cli/headless-scripting), [official agent-mode documentation](https://github.com/xai-org/grok-build/blob/main/crates/codegen/xai-grok-pager/docs/user-guide/15-agent-mode.md). Installed CLI help was inspected; provider sessions were not exercised.

Home and Settings share persisted `agentProvider`, `codexModel` and `grokModel` defaults through the same picker component. Explicit discovery uses each provider’s isolated account connection; opening Home does not start a CLI process. Grok discovery calls `_x.ai/models/list` after cached-token authentication and reads the extension result envelope’s `availableModels` (`modelId`, `name`). Before prompting a new Grok session, a nonempty selected model is applied with `session/set_model`; rejection stops the task before the prompt, without a fallback to another model. Empty selection leaves the CLI default intact. See [Grok model research](grok-models.md).

The main header reads the existing `Toby.icns` image directly from the packaged app resources. It adds no asset dependency and preserves the Dock icon. Glossy black background highlights fall back to solid black with Reduce Transparency.
