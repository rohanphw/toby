# Toby design direction

Current direction: neutral chat shell, with the combined flat conversation and
reply-connector mockup approved on 27 October 2026. Reference:
`docs/design/conversation-reference.png`.

Toby should feel like a quiet personal workspace: continuous neutral charcoal
surfaces, softly rounded controls, readable Nunito Sans typography and quick,
restrained motion. Reserve the original Toby artwork for app branding. Agents
use stable, editable emoji identities; legacy branded agent avatars render a
fallback emoji without rewriting stored profiles on load. Preserve the dark
identity and every working product connection.

## Visual system

Use one coherent system across chat, sidebar, inspectors, forms, libraries,
approvals and onboarding. Nunito Sans Variable is bundled locally with its OFL
notice, including italic faces; code keeps the system monospace stack. Body text
is 14 px, the transcript is 16 px with 32 px identities, metadata generally 11–12 px, and headings use
weight and scale rather than letter-spaced all-caps labels.

Use soft surface contrast rather than sharp divider rules. Controls have roughly
10–16 px corners and decision panels up to 24 px. The sidebar, conversation
and inspector meet flush, without outer padding, gutters or independent rounded
full-height containers. Use grayscale charcoal for all structural surfaces, gray
selection states and an off-white primary action. No green tint, ambient glow or
gradient. Preserve visible keyboard focus and clear disabled, pending, error and selected states.

## Sidebar and chat

The pinned area contains only explicitly pinned agents or group conversations.
No agent, including the first Toby, is automatically promoted. Empty pins mean no
pinned section. Pinned entries are not duplicated in the ordinary roster. Pinning
is persistent; group edits retain their pin. Search, hidden agents, real public
message previews and member avatar stacks remain functional.

The empty conversation groups a short greeting and the same persistent composer,
with lightweight suggestions below the input and a small keyboard hint.
Existing conversations retain the bottom composer and stable keyed message rows.
Drafts, replies and attachments survive switching chat, search, inspector and
approval modes. Keep readable Markdown, reactions, copy, reply and attachments.

Permission requests appear above the persistent composer in one clear, rounded
decision panel. Keep Deny and Allow once, safe scope copy, duplicate guards and
retry feedback. Queue requests in their owning conversation. New messages remain
available while an action awaits a decision; sending a message never grants that
action. Show the number of independent jobs when several are active.
Inspectors stay beside the chat, including at 960×640, and cannot cover decisions.

## Welcome and setup

Fresh setup currently begins with a short illustrative welcome and Get started.
There is no top-left brand row during onboarding. The existing looping idea-to-plan
illustration was rejected and awaits a separately approved story mockup; the locked
chat mockup does not approve that illustration. The loop never advances the flow
or creates an agent. Personalization, subscription connection and the access choice follow as separate
concise steps. Access is confirmed by the user; the onboarding choice does not
automatically grant macOS Accessibility or Screen Recording. Optional personality and specialization are blank
free-text fields, without invented presets. Provider and model remain required.
Returning to welcome preserves the same mounted setup form and its draft.

## Motion and boundaries

Use 180–220 ms easing for feedback and reveals, animating opacity and transform.
The welcome illustration uses a gentle 12-second loop; reduced motion supplies a
static composition and removes transitions. No layout-property animation, fake
progress, fake unread counts, new mascot assets or unrelated product features.

Public chat contains final replies and deliberate public posts. Raw reasoning,
private coordination, tool payloads and protocol JSON never become message bubbles
or accordion content. Collapsed activity contains readable action summaries only.
Voice remains unavailable; assistant replies are text. No cloud/account additions.

User-provided screenshots authorize isolated own-app visual verification for this
redesign. Functional checks and screenshots are evidence of the checked states,
not a claim of live subscription compatibility or frame-rate certification.

## Shared group participation

A group composer addresses the conversation; it has no recipient selector. Public
messages retain each member's identity and reply links. Reaction chips count human
and agent reactions separately and identify their authors. Normal participation
decisions stay outside the chat and work inspector; failed/interrupted participation
remains available for recovery. The lead is a facilitator, never an exclusive speaker.

## Conversation layout rules — 1.0.23

Keep human and agent messages on one flat reading axis, within a maximum 800px
inner reading/composer lane. Preserve message IDs and chronological order. Adjacent
messages group under one identity only when sender, role, reply target, scheduled
source and calendar day agree, with no more than five minutes between them.
A same-day pause of 30 minutes gets a quiet time separator.

Actual replies form a local sibling cluster when the parent is directly above the
first child and the following public messages continue replying to that same parent.
Different authors remain siblings at one indentation; consecutive same-author
messages retain one identity. A shared stem runs only through these related blocks,
with an elbow for each visible identity, and ends at the last sibling's header.
Wrapped text, attachments and reactions determine the real block height.

Unrelated messages/activity, missing filtered context, date changes and time gaps
break the local cluster. Older targets keep a compact clickable reference. Nested
replies never add another indentation level. A reference clears search, scrolls and
focuses the original public message; missing targets are disabled. Mentions never
invent reply links. Shared older references appear once per sender group. The
1.0.23 immediate-parent-only rule was incorrect: related siblings are not unrelated
intervening speakers.

Highlight only real member names in ordinary sanitized text, leaving code, links and
raw copied text intact. Hover/focus reveals compact icon actions without reserving
blank space on every row. Reactions keep their real counts/authors. Quiet participation
has no public typing/work indicator; active delegated or ordinary work still does.
Stop remains available for pending participation. No fictitious presence or progress.
