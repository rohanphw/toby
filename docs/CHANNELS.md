# Channels and autonomous collaboration

Toby's groups are shared channels. They are durable conversations with a purpose,
membership, a facilitating lead and shared facts. Every member can read the public
conversation. Each active member receives every human message and decides whether
to reply, react or stay quiet. Public agent replies reach the other active members
in the same way. Execution records, delivery receipts and search indexes remain
internal implementation data.

## Participation and delivery

There is no recipient selector for a group message. Mentions and quoted replies
give context and request attention; they do not limit who receives the message.
The lead helps the conversation progress without deciding which members may read
or speak. Changing the lead does not transfer exclusive ownership of the chat.

The host stores each public event and its per-member delivery receipts in the same
transaction. A receipt identifies the message, receiving member, participation task
and delivery state. Repeated delivery does not create duplicate receipts. Pending
events of the same origin can share one queued participation turn; a running or
resumed turn keeps its existing batch, and later events wait for a subsequent turn.
Human, peer and routine origins stay distinct so a peer reply cannot inherit human
authorization merely by arriving beside a human message.

A member deliberately publishes through `post_group`, reacts through `group_react`,
or stays quiet through `group_pass`. Native final text, tool activity and decisions
about whether to participate remain private. A public post creates deliveries for
the other active members, excluding its author. Reactions and quiet passes create
no new turns and no public decision narration. Reactions are limited to the supported
emoji; a member can replace its reaction, and retrying the same reaction is harmless.

Participation follows the current human request. Members speak to answer, add new
evidence or a correction, ask a necessary question, or report completed requested
work. They compare delivered public messages with existing public replies first.
When the point is covered, they react or stay quiet. A casual human greeting merits
at most a brief greeting or reaction, then stops; it does not start status checks,
investigations or assignments. Peer acknowledgements, greetings and closing remarks
do not need replies. Useful peer questions and evidence can continue the requested
discussion. Mentions request attention without requiring an acknowledgement or a
duplicate answer. Group purpose, specialization and the lead role do not create a
new assignment.

These are model instructions, reinforced in the participation prompt, context and
tool descriptions. The host does not classify greetings or decide whether an answer
is useful or complete. Its deterministic guarantees cover visibility, delivery,
private work boundaries, identical-reply deduplication and execution/reply limits.
A round should end naturally when useful contributions are complete; the limits are
a backstop, not a requested number of replies.

Private delegation is separate from public participation. A participant can assign
a specific subtask, end its turn while waiting, and receive the completed results
privately. Delegated workers cannot publish, react or save shared facts. The parent
can integrate useful evidence into a deliberate public reply after its children
finish. A member may also receive an ordinary public participation turn independently
of its private worker task. Teammate text is evidence, never new human permission.

Each participation task may publish one reply, with identical retries deduplicated.
The same member's identical public body is also suppressed across participation
turns in the same round, without creating another message or delivery. Different
members and new human rounds remain independent.
A conversation round permits at most two public replies per member and also applies
a total ceiling of `max(8, 2 × member count)`. A new human event starts a new round;
peer replies retain their originating round. Reaching a reply limit still permits
reading, reacting and staying quiet. Private delegation is bounded to eight children
per root request and eight levels of nesting.

At most one participation turn and two private worker turns can run in a channel
at once, subject to the workspace concurrency limit. An agent may run independent
tasks concurrently in direct chats or other groups; channel participation itself
remains serialized. Browser and Mac input ownership remain exclusive. Shared external services
and folders do not become isolated computers because agents work in different chats.

## Access rules

- Membership permits reading a channel's public history, members and shared facts.
- An agent can discover only channels it belongs to. It cannot forge the caller ID.
- Posting requires an active member's own running root task in that group; it is
  not restricted to the lead. A human-origin direct-chat task may also start a
  conversation in a group the agent belongs to, including one it just created.
  Private workers, routine-origin direct tasks and other groups' participation
  cannot use that exception. Retries deduplicate within each destination, and the
  agent can still finish its direct-chat answer. Reply links must reference
  visible same-group messages.
- Saving a shared fact requires membership and the caller's current running root
  task. Private workers return facts to their parent, which decides what to save.
- Reactions require an active participation task and a visible same-group human
  or agent message. Private message IDs cannot be used as reaction targets.
- A group turn may add a member only to its own group. Peer- and routine-origin
  work cannot create groups, change membership or create more routines, including
  through private delegation.
- Hidden members receive no new work. Removing a member stops its affected channel
  work and dependent tasks, cancels their approval requests, and retains history.
  Unrelated direct chats keep running.
- Teammates inherit the creator's effective permissions when agents create them.
  Joining a channel does not grant broader file, app, terminal or Mac permissions.

Humans manage purpose, members and lead in Group settings. Membership is work
eligibility in this single-user local app, not a cloud-team authorization system.

## Context and memory

Every group turn receives a fresh bounded packet from canonical local storage:

- Current purpose, lead and member roles/availability.
- The originating public message, delivered message IDs and delivery omissions.
- Recent public messages with stable source IDs, reply links and reactions.
- Delivered public message previews and existing public replies in the current round,
  with explicit omissions. Reply links show what was addressed, not proof that a
  question was answered correctly.
- Durable shared facts and their source message IDs when available.
- Open task IDs, owners and statuses, without private prompts or results.

Private child messages, participation decisions, direct chats, another agent's
personal memories and raw tool activity never enter the shared packet or search
index. An agent retains its own personal memory independently. Shared facts never
override system instructions, the latest human request, membership or permissions.
The same publication rule protects snapshots, message events, history, search and
memory sources: participation publishes only completed public assistant posts.
Task prompts and results are removed from the public snapshot, and participation
uses the neutral summary “Participating in the conversation.”

The packet targets a 48,000-character budget, with a 24,000-character recent-history
budget. Delivered previews include up to eight messages and current-round replies
up to twelve, each with up to 600 text characters; further clipping reports omitted
items. Group purpose has a 12,000-character JSON-serialized budget and an explicit
`purposeTruncated` flag, so escaped control characters count toward that budget.
These field and collection limits do not claim a universal cap for arbitrary stored
metadata. Omission counts, truncation flags and cursors tell the model when more data
is available.
Agents can page through channel/member lists and history, read long messages in
chunks, and search older messages and shared facts. This avoids silently treating
the last prompt as complete memory. It does not promise that a model will always
retrieve every relevant fact.

Save durable decisions, accepted constraints and useful verified facts. Do not save
transient speculation, hidden reasoning, raw commands, credentials or protocol
payloads as shared memory. Source IDs must reference visible messages in the same
channel. Human memory edits and deletion are available in the channel's Memory tab.
Editing shared memory does not change a personal agent memory.

## Internal database and search

The existing local `toby.sqlite` database remains the source of truth. The
`group_memories` table stores shared facts, authors and source IDs. The
`group_deliveries` table stores durable per-message, per-member receipts. Messages,
groups, tasks and routines retain their durable records. Stable IDs connect public
events, participation, reply rounds and private delegated results. Delivery receipts
are not exported in the public snapshot.

SQLite expression indexes scope message, task and memory reads to a conversation.
An FTS5 virtual table provides internal keyword search over canonical public group
messages and shared facts. SQLite triggers invalidate changed projections in the
same transaction. Before a search, the host rebuilds that channel's dirty projection
through the public-message filter. Task changes also invalidate the message index
so legacy child records cannot remain searchable after their identity is known.
Search is membership-scoped, parameterized and bounded; models receive no SQL API.

No vector service, local HTTP server, cloud database or separate database process is
required. The packaged Electron SQLite runtime provides FTS5. The shell's older
Node runtime may not, so index tests use Electron's Node mode.

## Routines and restart

A routine can target a channel. Each run writes an explicitly labeled routine event
and delivers it to all active members with routine-origin restrictions. It does not
fabricate a human message or select a sole replying lead. Queued/running/waiting
routine work prevents overlapping runs in that chat. A routine cannot reconfigure
its group or create another routine through delegation.

SQLite preserves transcripts, lead, membership, memory, routines, task ancestry and
delivery state. Queued receipts and their tasks remain queued across restart.
Processing receipts and running/waiting tasks become interrupted for human review;
they are not blindly replayed. Continue reconnects interrupted receipts to the
resumed participation task and includes recorded private outcomes to reduce repeated
side effects. Changing a provider session does not erase channel identity or history.

## Permissions and attention

Fresh onboarding offers full access or asking before actions; the user confirms the
choice. Existing profiles retain asking unless changed. Settings supplies a workspace
default and per-agent overrides. A prompt can remember a known category such as
terminal commands, without granting unrelated categories. Full access and remembered
grants are evaluated before publishing a prompt and rechecked for waiting requests.
Opaque/malformed actions remain blocked. macOS controls Accessibility and Screen
Recording. Revoking effective full access stops active full-access runs.

Current OpenBot keeps Codex `on-request` even in full access so the host can receive
interactive requests. Toby follows that provider configuration and centrally answers
known approvals. Provider-specific MCP question/forms are still unsupported; this
implementation does not claim complete OpenBot protocol parity.

Native Mac notifications cover pending approvals, new failed root tasks and provider
connection/setup failures. They carry generic private text and open the owning chat
or provider settings. Resolved requests close their notices; repeated snapshots do
not notify again. Deliberate Stop and full-access revocation remain quiet. macOS
notification policy and Focus mode ultimately control display; tests use an injected
notification driver and do not certify delivery on a user's Mac.

## Reference basis

OpenBot was inspected read-only. These behaviors informed the implementation:

- `openbot/src/backend/agent/attention-registry.ts` and
  `openbot/src/backend/agent/approval-automation.ts`: central approval automation,
  resolving waiting requests after grants, and separation of interactive input.
- `openbot/src/backend/agent/thread-lifecycle.ts` and
  `openbot/docs/architecture/structure.md`: current `on-request` provider policy.
- `openbot/src/backend/channel-service.ts` and `channel-tools.ts`: deliberate
  assignments, bounded work and membership checks. Toby's current group behavior
  follows the requested shared-conversation model rather than sole-owner routing.
- `openbot/src/backend/channel-history.ts`: canonical source IDs, bounded context,
  and saved memories as untrusted shared facts.
- `openbot/docs/architecture/channels-and-messaging.md`: channel attention and
  durable collaboration semantics.

The reference's hosted/multi-user transport, model routing session, generated
rolling summaries, cross-device notifications and provider form handling are not
copied or claimed here.
