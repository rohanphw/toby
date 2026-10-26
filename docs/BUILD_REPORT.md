# Local review build: Toby 1.0.24

Date: 27 October 2026. Apple Silicon, macOS 14+.

Installer: `dist/Toby-1.0.24-arm64.dmg` (133,848,172 bytes).
SHA-256: `9e730e5986ecf650896d6c6353ece090f8384abd1935bf8af2a54efb4649235a`.

Corrects the reported sibling-reply hierarchy: consecutive replies to one actual
parent share a single indent and connected stem across different authors. Grouped
continuations retain one identity. When a grouped root message becomes a parent,
its stem reaches the existing visible avatar without inventing a new identity or
changing the actual source ID. Unrelated messages, hidden filtering positions,
operational rows and time/date boundaries still break the local cluster.

The exact human → Jules → Toby regression failed before the fix, then passed.
79 Bun tests (including 11 layout cases/64 assertions), eight storage tests,
TypeScript, renderer functional/workflow/layout checks and the new physical
reply-cluster integration passed. Geometry checks cover long Markdown replies,
attachments, wrapped supported reactions, hover, grouped parent/child continuations,
search navigation and the final stem endpoint at 1280/960 widths. The approved
reference, corrected capture and before/after detail were inspected together.
The earlier 1.0.23 QA missed this relationship mismatch; `design-qa.md` records
that failure and the corrected rule.

Packaged startup and the packaged task-bound MCP bridge passed. All 19 production
files match the build, tests/debug files are excluded, and host/preload are
unchanged from 1.0.23. No new live-provider test was needed or claimed for this
renderer correction. Signatures, image checksum, mounted Applications shortcut
and Finder layout passed. Developer ID signed; not notarized or stapled.

Test processes exited; no development server, installed-app/profile modification,
commit, push or publication. Earlier release DMGs are preserved.
See [machine-readable evidence](verification/sibling-replies-1.0.24.json).

---

# Local review build: Toby 1.0.23

Date: 27 October 2026. Apple Silicon, macOS 14+.

Installer: `dist/Toby-1.0.23-arm64.dmg` (133,848,183 bytes).
SHA-256: `c703e8e4fe5004e1ed93257234400ec71a0861cec897d0130f934347bdb694c9`.

The approved combined conversation design is implemented: flat messages, clearer
identities, safe member mentions, grouped adjacent senders, short real reply links,
clickable older references and compact hover/focus actions. Chronology, drafts,
approvals, reactions, attachments, concurrent jobs and persistent composer behavior
remain intact. Normal participation decisions have no public work/typing indicator.

Agent instructions now require useful contributions and natural stopping. Delivered
public evidence and existing round replies are provided separately. Casual greetings
settle without unsolicited assignments; covered points use quiet reactions/passes.
Exact same-author repeated posts in a round are suppressed without new deliveries.
Privacy, membership, source authority and reply budgets remain host-enforced; the
meaning of usefulness remains a model decision.

Real OpenAI/Grok verification: one brief public greeting, then silence; three useful
posts for an explicit proposal/review/synthesis request; after a full app restart,
one saved-fact recall answer with a quiet reviewer reaction. Both members received
every human message and all 11 delivery receipts completed. Native private-final
canaries were exercised and absent from watched IPC/DOM, shared-memory/search,
activity, quote and copy surfaces.

Passed 74 Bun tests, 8 storage tests, 13 group SQLite tests, 9 host integration scenarios,
renderer functional/workflow/layout checks, long-response checks, TypeScript and
diff checks. The approved reference and isolated renderer captures were compared
together at normalized density, including focused detail. Initial width/mention/
repeated-reference findings were fixed and recaptured; `design-qa.md` reports passed.

Packaged startup reported a working bridge/local profile and no renderer errors.
Packaged task-bound MCP transport passed. All 19 production files match the build;
test/debug files are excluded. App/DMG signatures, checksum, mounted Applications
shortcut and Finder layout passed. Developer ID signed; not notarized or stapled.
Earlier release DMGs are preserved.

All test processes exited and temporary debug ports closed. No dev server,
installed-app/user-profile modification, commit, push or publication. Live coverage
uses two controlled agents and one orderly restart, not universal model behavior,
fresh sign-in, live crash recovery or a real installed-profile upgrade.

See [conversation rules](CHANNELS.md), [design verification](../design-qa.md),
[live method](LIVE_CHANNEL_VERIFICATION.md) and
[machine-readable evidence](verification/conversation-rules-1.0.23.json).

---

# Local review build: Toby 1.0.22

Date: 27 October 2026. Apple Silicon, macOS 14+.

Installer: `dist/Toby-1.0.22-arm64.dmg` (133,852,862 bytes).
SHA-256: `3d074ed9f2c4677ad6be0a06b75a41a8bbd2a1ef356f66e620504c9000314db4`.

This package includes the first-group-message fix, compact reply references and
parallel independent jobs for one agent. The composer remains usable during work
and pending approval. Task context, approvals, cancellation and results are scoped
per job; group participation limits and exclusive browser/Mac control remain.

Implementation checks passed: TypeScript, 68 Bun tests, eight storage tests, nine
group SQLite tests, new first-post/concurrency regressions, six existing host
integrations and three renderer/layout fixtures. Isolated screenshots at 1280×800
and 960×640 verified compact reply context and a usable composer beside approval.
No new real-provider throughput test was performed for these changes.

The packaged version is 1.0.22. All 19 production files match the build;
test/debug files are excluded. Isolated packaged startup passed with a working
preload bridge, no agents and no renderer errors. The packaged MCP bridge passed a
task-bound local tool call. App/DMG signatures, image checksum, mounted version,
ASAR contents, Applications shortcut and Finder layout passed. Developer ID signed,
not notarized or stapled. Earlier DMGs are preserved.

No existing user profile, installed app, remote repository or public release was
modified. All verification processes exited; no development server was started.
See [machine-readable evidence](verification/background-fixes-1.0.22.json).

---

# Local review build: Toby 1.0.21

Date: 27 October 2026. Apple Silicon, macOS 14+.

Installer: `dist/Toby-1.0.21-arm64.dmg` (133,859,309 bytes).
SHA-256: `7954d41b72194a48bea97d820fb57c35431885cbf3c089e867314ea58be6a0bc`.

Groups now behave as shared conversations. Every active member receives human
messages and public peer posts, without a recipient selector. Members independently
publish, react or pass; the lead facilitates. Native decisions, tools and delegated
workers stay private. Durable internal receipts and shared context survive restart.
Queued deliveries coalesce, automatic reply chains have host-enforced budgets, and
peer/routine messages cannot acquire human authorization.

Real OpenAI and Grok each posted independently, OpenAI replied to Grok, and Grok
reacted to OpenAI in two rounds separated by an actual app-process restart. Shared
facts, history, reactions and identities survived; both recovered the omitted facts.
All ten member delivery receipts completed. Native-final private canaries were
present in both providers' internal results and absent from watched public IPC/DOM,
activity, search, shared memory, reply quotes and copied answers. An initial live
failure identified missing reaction/pass entries in the registered internal-tool
permission policy; the fix passed regression and fresh live verification.

Passed: 68 Bun tests, eight storage tests, nine group SQLite tests, renderer functional
checks, broad Harness, group conversation, shared-memory, permission policy, Grok
approval, provider-text and failed-start integrations, TypeScript and diff checks.
Packaged startup reported a working preload bridge and no renderer errors; the
packaged ASAR bridge completed a real task-bound local MCP call. All 19 packaged
production files match the build; tests/debug scripts are excluded. App/DMG signatures,
image checksum, mounted Applications shortcut and Finder layout passed.

All test processes exited and temporary debug ports closed. No development server,
real-profile mutation, screenshots, commit, push or publication. Developer ID signed;
not notarized or stapled. The live scenario uses two agents and an orderly restart;
other recovery/budget cases are deterministic fixtures, not live crash tests.

See [live method and limits](LIVE_CHANNEL_VERIFICATION.md) and
[machine-readable evidence](verification/shared-groupchat-1.0.21.json). The 1.0.20
sole-owner tests below are historical and superseded for group-chat semantics.

---

# Local review build: Toby 1.0.20

Date: 27 October 2026. Apple Silicon, macOS 14+.

Installer: `dist/Toby-1.0.20-arm64.dmg` (133,860,100 bytes).
SHA-256: `25f55c70aa4f53c252501f600e8eb1d27f1c9a965c6c63b59c39177cf39ac71d`.

Real OpenAI↔Grok channel coordination passed in both ownership directions. Shared
facts, source IDs, history, agent IDs and lead survived actual app-process restarts.
Both providers also recalled personal memories after restart with seed chat history
removed. Watched public IPC, DOM, activity, memory/search, quote and copy paths showed
no private-canary exposure. Seven process lifetimes exercised six restarts.

The independent privacy audit tightened shared-memory writes to the current running
root owner and blocked child assistant/system/tool records even if tagged public.
Regression tests cover worker writes, malformed tags and child tool attachments.
72 Bun tests, eight storage tests, targeted integration, renderer, typecheck and diff
checks passed. Test processes and temporary debug ports were stopped. No screenshots,
real-profile mutation, commit, push or publication occurred.

Packaged startup passed with bridge, local data, zero agents and no renderer errors.
Packaged production code matches the build, with test/debug files excluded. The
signed executable also passed a task-bound MCP call through its packaged ASAR bridge. App/DMG
signatures, checksum, mounted Applications shortcut and Finder layout passed.
Developer ID signed; not notarized or stapled.

See [live test method and limits](LIVE_CHANNEL_VERIFICATION.md) and
[machine-readable evidence](verification/live-channels-1.0.20.json). This does not
claim universal prose confidentiality, live mid-turn crash recovery or OS
notification-delivery certification.

---

# Local review build: Toby 1.0.19

Date: 26 October 2026. Apple Silicon, macOS 14+.

Installer: `dist/Toby-1.0.19-arm64.dmg` (133,859,964 bytes).
SHA-256: `57c0115c30afa235103e9711c9a6c500cc95d9dff78b20cd27463c802c5b83ac`.

OpenBot's current approval automation and channel implementation informed this
pass. Access is an explicit third onboarding step, with workspace defaults,
per-agent overrides, category-scoped Always allow and immediate full-access
revocation. Full sessions keep Codex on-request while the host answers known
requests. Existing profiles keep asking until changed in Settings. Native Mac
notifications route approvals and real failures to their owning chat or Settings;
tests suppress historical, private-child, deliberate-stop and refresh-probe noise.

Groups now keep a selected lead, deterministic one-owner routing, recipient and
reply precedence, leading exact mentions, membership cancellation and bounded
parallel work. Channel-targeted routines retain their source and cannot reconfigure
groups or schedule more work through delegation. Shared SQLite memory retains
authors/source IDs. Bounded context and paginated lookup keep canonical history
available across provider turns. A membership-scoped FTS5 index is internal and
excludes private worker records, DMs, personal memory and raw tool activity. New
expression indexes scope reads, and transactional invalidation handles edits,
deletes and late legacy task identity. Startup exceptions no longer retry-loop.

Typecheck, production build, 70 Bun tests, eight SQLite storage tests and seven
Electron-Node context/lead tests passed. Integration suites passed for groups,
shared memory, startup failures, coordination, permission policy, Grok approvals,
10 provider text fixtures, all 25 tool labels, and the renderer. Onboarding and
workspace checks passed at 1280×800 and 960×640, including a no-scroll access step,
three-action approval reachability, shared-memory controls and group lead editing.
Own-app screenshots reviewed for the new access step and group editor. The earlier
welcome illustration still awaits its separate design approval.

Packaged startup passed in a new isolated profile, with bridge and local database,
zero agents and no renderer errors. Packaged main code matches the built output.
App/DMG signatures, image checksum, mounted Applications shortcut and Finder layout
metadata passed. No development server, real-profile mutation, commit, push or
publication occurred. Older review installers remain available.

Developer ID signed; not notarized or stapled. Protocol/notification-driver fixtures
are not live-provider or macOS notification-delivery certification. Provider-specific
MCP question/forms, OpenBot's model router and generated rolling summary are not
implemented or claimed. The collaboration contract and reference paths are in
[CHANNELS.md](CHANNELS.md).

Evidence: [channels-permissions-1.0.19.json](verification/channels-permissions-1.0.19.json).

---

# Local review build: Toby 1.0.18

Date: 26 October 2026. Apple Silicon, macOS 14+.

Installer: `dist/Toby-1.0.18-arm64.dmg` (133,828,865 bytes).
SHA-256: `a5b9c0ed7c26849466e2d13e54c8feed95c491a82d0f2cdeef70988158df0f4d`.

Implements the locked neutral chat mockup: a continuous charcoal canvas, flush
sidebar/conversation/inspector, modest rounded controls, grayscale selection and
off-white primary actions. Empty chat keeps the greeting near the same persistent
composer, with suggestions below. Existing pin, search, groups, drafts, attachment,
reaction and composer-scoped permission behaviors remain connected.

Agents use stable editable emoji avatars. New defaults persist; legacy branded
avatars render a fallback without modifying stored profiles on load. The logo is
reserved for app branding. The top-left onboarding brand row is removed. The
existing onboarding illustration remains pending a separate approved story mockup.

Typecheck, production build, 47 Bun tests, six Node storage tests, renderer checks,
onboarding checks and workspace layout checks passed. Layout checks at 1280×800 and
960×640 cover neutral surfaces, flush panel geometry, avatar separation, approval
button reachability with the inspector open, and composer persistence. Own-app
fixture screenshots reviewed: empty chat at 1280×800 and chat/approval/inspector at
960×640. Fixtures establish checked behavior, not live-provider compatibility.

The Developer ID signed packaged app passed isolated startup with preload bridge,
zero agents and no renderer errors. App/DMG signatures, image checksum, mounted
Applications shortcut and Finder layout metadata passed. Not notarized or stapled.
No real profile changes, development servers, commits, pushes or publication.

Evidence: [neutral-chat-1.0.18.json](verification/neutral-chat-1.0.18.json).

---

# Local review build: Toby 1.0.17

Date: 26 October 2026. Apple Silicon, macOS 14+.

Installer: `dist/Toby-1.0.17-arm64.dmg` (133,828,800 bytes).
SHA-256: `16d5c0b1352d004c1a931cba22a496bbadb441950535177390815dd5f35fa43b`.

This redesign replaces the earlier featured-first-agent interpretation. The pinned
section contains only explicit agent or group pins, with persistent pin state.
The whole interface uses rounded charcoal surfaces, a soft sage action color and
locally bundled Nunito Sans Variable, including italic faces and its OFL notice.
Chat, composer, inspector, approvals, settings, files, libraries and editors share
the same control grammar. Libraries use progressive Add/Edit/Cancel forms. Editor
fields scroll while Save remains visible.

Fresh setup opens with an illustrated 12-second idea-to-plan loop and Get started,
followed by personalization and subscription connection. Setup fields remain
mounted when returning to welcome. The workspace behind onboarding is inert.
Download status cannot cover Get started, optional fields remain blank, and a valid
provider/model remains required. Motion is based on short transform/opacity
transitions and has a verified reduced-motion path. The same workspace composer
survives empty/chat, pin, inspector and approval changes.

Typecheck, production build, 45 Bun tests, five storage tests, the renderer suite,
and dedicated onboarding/layout suites passed. The latter checked actual loop
progress, locally loaded font, both pin types, persistent drafts, model gating,
explicit library controls, editor Save reachability and minimum-window approvals.
Own-app fixture screenshots were reviewed at 1280×800 and 960×640 across welcome,
setup, chat, empty state, pins, settings, libraries and agent/group editors.
These checks are not live-provider or frame-rate certification.

The signed packaged app passed isolated startup with bridge available, zero agents
and no renderer errors. Verified app and DMG signatures, mounted installer contents,
image checksum, Applications shortcut, Finder metadata, matching packaged main code,
and all ten bundled font files plus the font license. No real profile was reset or
migrated, and no development server was started. The 1.0.15 and 1.0.16 installers
remain available.

Developer ID signed; not notarized or stapled. No commit, push or publication.
Evidence: [calm-redesign-1.0.17.json](verification/calm-redesign-1.0.17.json).

---

# Local review build: Toby 1.0.16

Date: 26 October 2026. Apple Silicon, macOS 14+.

Installer: `dist/Toby-1.0.16-arm64.dmg` (133,591,544 bytes).
SHA-256: `985d155c10b72e3a3cd59805f40d4facdce7f325f7445df3e1b8f537d069cac1`.

Permission prompts now occupy the composer's input area, with one request at a
time, neutral styling, explicit one-action scope, pending state and safe retry
errors. The same draft input stays mounted; reply and attachment state survive.
Requests follow the owning conversation, including nested worker requests.
Deny and Allow once continue through the existing host approval checks.

The sidebar follows the user-supplied GrokBot hierarchy using existing Toby
artwork: featured primary agent, compact teammate roles and public-message
previews, search/add controls, actual member avatar stacks and local utilities.
The inspector stays beside the chat at the minimum width so it cannot cover
permission controls. The 1.0.15 chat-hardening changes are retained.

Typecheck, production build, 45 Bun tests, four storage tests, coordination and
hidden renderer checks passed. Fixture screenshots were inspected at 1280×800
and 960×640, including the open inspector; decision controls were reachable.
The signed packaged app passed isolated startup with bridge available, zero
agents and no renderer errors. App/DMG signatures, image checksum, Applications
shortcut and Finder layout metadata passed. No real profile or live provider was
used for verification. No servers were started.

Developer ID signed; not notarized or stapled. Local review only: no commit,
push or publication. Historical 1.0.15 installer retained. The missing local
1.0.8–1.0.14 changes remain absent from this source baseline.

Evidence: [composer-sidebar-1.0.16.json](verification/composer-sidebar-1.0.16.json).

---

# Local review build: Toby 1.0.15

Date: 26 October 2026. Apple Silicon, macOS 14+.

Installer: `dist/Toby-1.0.15-arm64.dmg` (133,584,303 bytes).
SHA-256: `46532a1fff7fc347774ca80081ea78b5e5f45eb2d0295e9ea53c475a2ac396ce`.

This build packages the available 1.0.7 source plus the current chat-hardening
changes. It does not contain the missing local 1.0.8–1.0.14 work. Final replies
are buffered until successful completion, worker traffic stays private, and safe
action summaries use collapsed disclosures. See [Chat hardening](CHAT_HARDENING.md)
for the provider-classification limits and source analysis.

Typecheck, production build, 45 Bun tests/199 assertions, four storage tests,
provider/coordination/approval/tool-presentation integrations and hidden renderer
functional checks passed. The signed packaged app passed an isolated startup:
bridge available, zero agents, local storage initialized and no renderer errors.
No live model requests or real profile changes were performed.

Verified the app's deep signature, DMG signature/checksum, mounted app version and
archive equality, Applications shortcut, and actual Finder layout metadata
(640 × 400 window; app at 170,230; Applications at 470,230). The DMG was detached
after verification. Signed with Developer ID; not notarized or stapled. No visual
QA, screenshots, commit, push or publication.

Machine-readable evidence: [chat-hardening-1.0.15.json](verification/chat-hardening-1.0.15.json).

---

# Build verification: Toby 1.0.7

Date: 23 October 2026. Target: Apple Silicon, macOS 14+.

This build implements the approved latest compact option 2 mockup. The real UI uses
native CSS dimensions, preserving existing assets and system typography: a 244 px
sidebar (236 px at narrower widths), 68 px header, up to 760 px reading column,
14 px transcript text, smaller avatars and a single-row composer. Assistant replies
remain open text; user messages use content-sized charcoal bubbles. Sidebar search
filters actual agents and groups independently of conversation search. Model choices
remain in agent settings and workspace details; unavailable voice is explained in Settings.

TypeScript, production build and 24 focused tests passed. Hidden renderer checks
cover onboarding, model requirements, reply/copy/reactions, attachment pending states,
streaming row identity and Markdown sanitation, provider setup progress, readable
approvals, legacy tool activity, adding a Grok teammate, role/name/group search and
clear/Escape, per-conversation drafts, mixed-provider group creation and sending,
attachment submission, and Files/Memory/Skills/Routines/Connectors/Settings actions.
The reusable check is `bun run test:renderer`, after building the app.

Deterministic backend integration checks passed for cross-provider delegation,
durable result return, streaming/final persistence, approval cancellation, shutdown,
workspace confinement, all 19 tool presentations and Grok task-bound permission routing.
No live model requests, external browser actions or real-user data were used.

The Developer ID signed packaged app passed isolated startup with its preload bridge,
empty local profile and no renderer errors. The app deep signature, DMG signature,
checksum, Applications shortcut and Finder layout metadata passed. The first signing
attempt hit an unavailable Apple timestamp service; retry succeeded with timestamps.
The build is not notarized or stapled.

Installer: `Toby-1.0.7-arm64.dmg`. SHA-256: `3c8a122d75d6269ad1ce3dafe5e8ee8c53594b62eb225ef2e2e6cf99a0531c43`.

Final packaged app/installer evidence is recorded in
[compact-1.0.7.json](verification/compact-1.0.7.json) and
[installer.json](verification/installer.json).

No visual QA, screenshots or browser inspection were performed, as requested.
Functional checks do not establish pixel-perfect fidelity. Release downloads and
checksums are available from [GitHub Releases](https://github.com/rohanphw/toby/releases/tag/v1.0.7).
Voice input remains unavailable. Background work still requires an awake Mac and a running host.

---

# Release verification: Toby 1.0.6

Date: 22 October 2026. Target: Apple Silicon, macOS 14+.

## Artifact

- Installer: `Toby-1.0.6-arm64.dmg`.
- SHA-256: `136f67bc05cfa1fd1b98600bddd0d6b0c9e6f40ddd62665b07f375e1da5e282a`.
- Developer ID signed application and DMG; not notarized or stapled.
- Separate Electron bundle ID/storage from older Swift Toby; no automatic data migration or updater.

## Passed checks

- TypeScript compilation and production build.
- 24 focused tests covering activity/error copy, approval scope, reset, streaming, runtime setup and SQLite persistence.
- Deterministic Electron harness integration: cross-provider group delegation, durable result return, incremental streaming/final flush, workspace/symlink confinement, approval cancellation and shutdown.
- Real task-bound MCP transport with a Grok protocol fixture: the reported team lookup proceeds without a duplicate prompt; a command reaches its approval gate once; denial prevents execution; native/external actions retain approval; active-session, option scope and cancellation checks pass. Opaque or malformed requests cannot gain permission through an unconditional approval response.
- Tool presentation integration: all 19 built-ins have readable running/success/failure labels. Agents retain access to array/object/file/browser results, while visible audit messages exclude raw payloads. Saved files retain usable attachment references.
- Hidden renderer functional checks: onboarding, required model, profile preservation, message sending, stable rows across 30 streaming deltas and a full snapshot, sanitized Markdown, actual download progress, keyboard dialog dismissal, reset action, readable approvals and legacy activity, reaction add/remove/reopen/keyboard/Escape, reply focus, copy feedback, and attachment pending/duplicate guards.
- Hidden packaged application startup: preload bridge, empty isolated local profile and initialized renderer, with no renderer errors.
- Deep application signature, DMG signature/checksum, read-only mounted application verification, Applications shortcut and Finder layout metadata. Verification does not open Finder.

Machine-readable current evidence: [experience-1.0.6.json](verification/experience-1.0.6.json) and [installer.json](verification/installer.json). Older versioned JSON files are historical and do not describe current voice support.

## Verification limits

No screenshots, visual QA or acoustic/microphone checks were performed. Functional DOM checks establish behavior, not visual finish. Current protocol integration tests use fixtures rather than live inference or live browser/Mac actions.

Earlier development checks verified text subscriptions and a provider ping, but those are not guarantees of another account's entitlements or current provider behavior. Fresh sign-in and macOS grants require user interaction. Local groups and identities do not isolate OS permissions.

Voice input is unavailable and replies are text only. No speech models/workers are shipped. Background routines require an awake Mac and a running host. Connectors support local stdio MCP; no hosted connector marketplace, cloud computer, Google-account integration, mobile app or cloud sync is included. Written workflows are supported; demonstration recording/certification and timezone/calendar scheduling are not.

Installer signing passed. Apple notarization and public Gatekeeper acceptance were not verified. Review these limits before treating the release as production-certified or complete OpenBot/Grok Bot parity.
