# Channel verification and historical live evidence

## Current shared-conversation model

The current group model supersedes the sole-owner task-delegation behavior tested
in 1.0.20. Every active member receives each human message and every other member's
public reply. Members independently reply, react or stay quiet. The lead facilitates;
there is no recipient selector or exclusive owner of the public conversation.
Native participation output and private worker messages stay private. Public posts
create durable peer deliveries; reactions and quiet passes do not start more turns.
See [CHANNELS.md](CHANNELS.md) for the current rules and limits.

## 1.0.23 conversation-rule verification

Passed with real OpenAI `gpt-6.1-sol` / Codex CLI 0.162.0 and Grok
`grok-4.7-build-fast` / Grok CLI 1.0.70, using existing subscriptions. The production
main/preload/renderer ran in a fresh isolated profile; installed Toby data stayed
untouched. No external actions were executed.

- Casual greeting: both members received it; one brief “Hey.” appeared, with no
  public peer chatter, status checks, invented assignments or private children.
- Purposeful work: OpenAI proposed two release checks, Grok added an upgrade check,
  and OpenAI published the final three-check checklist incorporating that addition.
  Three useful public posts, then quiet completion. Final synthesis validly replied
  to the original human request; reply relationships are not inferred from wording.
- Full restart: source-backed shared facts and public history survived. OpenAI
  recovered the codename/checklist without the user repeating them; Grok reacted
  quietly instead of restating the same answer. One public recall post.
- All 11 internal delivery receipts completed. Both providers' native-final private
  markers were exercised and excluded from watched public snapshots/message events,
  DOM, search, shared memory, activity, reply quotes and copied answers.

The initial fixture incorrectly required synthesis to quote the reviewer rather
than allowing a valid reply to the human request. That assertion was corrected,
and the full scenario reran from a fresh profile. A final tool-description wording
clarification permits necessary work questions while restricting unsolicited status
checks from casual greetings; its host regression passed and the restored live
phase used the final build.

Method: `tests/live-participation.e2e.cjs`, plus final read-only SQLite checks.
Evidence: [conversation-rules-1.0.23.json](verification/conversation-rules-1.0.23.json).
Useful contribution/greeting semantics are model instructions, with deterministic
host publication/privacy, exact-repeat and loop safeguards. This verifies the
controlled scenario, not every possible model reply or crash. All test hosts exited
and temporary debug ports closed. Isolated renderer screenshots and responsive
interaction tests cover the separate approved UI rules; see `../design-qa.md`.

## 1.0.21 live shared-group verification

Passed on 27 October 2026 with real `gpt-6.1-sol` (Codex CLI 0.162.0) and
`grok-4.7-build-fast` (Grok CLI 1.0.70) through existing subscription sign-ins.
The production main/preload/renderer ran in a new isolated `.local` profile,
with hidden windows and no screenshots or changes to installed Toby data.

In each of two rounds, one human group message reached both members without any
recipient selection. Each provider deliberately posted its own answer. OpenAI then
replied to Grok's visible answer; Grok reacted to OpenAI's message. Peer deliveries
settled with quiet passes rather than public decision narration. Each round produced
three public posts and five completed internal delivery receipts.

A complete app-process restart separated the rounds. Agent/group IDs, membership,
public message IDs, reactions, shared-memory IDs and approved facts survived.
The second human message omitted the saved codename and numbers; both providers
recovered them from shared memory/history. Final read-only SQLite checks verified
all ten receipts were done and both members processed human and peer deliveries.

Private native-final canaries were exercised in both providers' stored task results.
Live IPC snapshots, message events and DOM observers found no canary exposure;
search, the memory inspector, activity, quoted replies and copied public answers
also passed. Task prompts/results remained redacted at the renderer boundary.
Deliberate public posts were delivered through real snapshot updates.

The first pre-fix run exposed an unnecessary Grok permission prompt for the new
reaction/pass tools. The registered internal-tool allowlist was corrected, a
scope regression test was added, and a fresh live scenario passed without prompts.
Native and external actions retain their existing permission controls.

Method: `tests/live-groupchat.e2e.cjs`, with final read-only SQLite receipt checks.
Evidence: [shared-groupchat-1.0.21.json](verification/shared-groupchat-1.0.21.json).
Both successful process lifetimes exited, and temporary debug ports were closed.
The packaged production files match the tested build; packaged startup, signatures,
installer layout and packaged task-bound MCP transport also passed.

Limits: two live members, one orderly restart and controlled conversational roles.
Private delegation, larger-group budgets, coalescing and interruption/resume use
separate deterministic fixtures. This does not certify every model's deliberate
public prose, mid-turn live crash recovery, fresh sign-in, OS notification delivery,
external side effects or visual finish. The Developer ID signed DMG is not notarized.

The historical run below must not be used as proof of these broadcast semantics.

## Historical 1.0.20 live run — superseded group semantics

The 1.0.20 task-delegation model was verified 26–27 October 2026 using the real production main process, preload, renderer,
SQLite database, provider processes and existing subscription sign-ins. No mocked
model responses or API-key fallback. Windows remained hidden; no screenshots.
The test used a new `.local` profile and did not modify the installed app's data.

| Test | Result |
| --- | --- |
| OpenAI lead → Grok worker | Private delegation completed; one public owner answer, total 402 |
| App restart and OpenAI → Grok recall | Same agent/group/memory IDs and history; saved project facts recovered without restating them |
| Grok lead → OpenAI worker | Ownership switched; private verification completed; revised total 411 persisted with a public source ID |
| Further restart and Grok recall | Revised total and lead survived; normal final reply exercised actual live message IPC |
| Personal memories | Both providers saved distinct own-memory facts, then recalled them after restart with seed chat messages removed |
| Public surfaces | No private canary in watched snapshots, final-message events, chat DOM, expanded activity, shared memory, search, quoted replies or copied public answer |

Models: `gpt-6.1-sol` through Codex CLI 0.162.0 and `grok-4.7-build-fast`
through Grok CLI 1.0.70. Seven isolated app process lifetimes exercised six restarts;
some lifetimes checked persistence/UI only. All test processes exited and their
local debug ports were checked closed. No application development server was used.

Private handoff/result canaries were verified in the underlying child records,
proving the private path actually executed. The public projection withheld those
records while the owner retained their useful arithmetic evidence. IPC and DOM
observers ran during work, not only after completion. Per-process counters are
cumulative; the machine-readable report deduplicates them rather than adding the
same process's observations twice.

The personal-memory seed messages were removed only in the isolated test database.
Both recall requests omitted the saved values; the values were absent from remaining
history, group facts, instructions and workspace files. Each agent's own memory was
the remaining input source. OpenAI read its generic audit instruction file, which
contained neither value; this was not a tool-free recall claim.

That audit found and fixed two publication gaps: delegated workers could save their
brief/result into shared memory, and explicit public tags could expose child
records. Shared-memory publication required the current running root owner.
Child assistant, system and tool records and attachments stay hidden regardless of
audience tags. The historical owner-task UI displayed safe tool activity behind a
disclosure. Current group participation keeps its tool activity private and exposes
only deliberate public posts and reactions.

For that build, six conversation regressions, shared-memory integration, the renderer including
malformed child records, the 20 provider text-buffer cases, full 72 Bun tests,
eight storage tests, typecheck and diff check passed. The initial coordination run
preceded the additional malformed-child-tool defense; that defense was verified
with unit/renderer regressions and later live normal-final/personal-memory flows.
The Copy check compares the original public message text, not Markdown's rendered
paragraph newline. The payload was captured at the clipboard boundary, leaving
the system clipboard untouched. That test correction did not require a product
Copy change.

These results cover the observed live tasks and adversarial regression cases. They
do not certify arbitrary future model prose, live crash-mid-turn recovery, or native
notification display. Interrupted coordination recovery is covered separately by
the deterministic Harness suite. Private reasoning is discarded rather than added
to the transcript or memory.

The historical report records those fixes in `dist/Toby-1.0.20-arm64.dmg`. The signed application passed
isolated startup with no renderer errors; packaged main, preload and renderer code
match the verified build. The signed app executable also loaded the packaged ASAR
MCP bridge in Node mode and completed a task-bound local tool call. Signatures,
installer checksum, Applications shortcut and
Finder layout passed. Developer ID signed, not notarized or stapled. Test/debug
files are excluded from the package. No commit, push or publication.

Historical machine-readable results:
[live-channels-1.0.20.json](verification/live-channels-1.0.20.json).
The recorded run used [tests/live-channels.e2e.cjs](../tests/live-channels.e2e.cjs)
with a scenario-owned `.local` profile and separate existing-message surface and
personal-memory checks. Test scripts may evolve with the current group model;
the versioned report remains the evidence for the historical build. Detailed private
evidence remains in `.local` and is not part of the application package.
