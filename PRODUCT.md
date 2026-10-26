# Product

Toby is a macOS workspace for a persistent personal agent and a team of specialists.
Users connect an existing ChatGPT/Codex or Grok subscription, type instructions,
inspect results and approve actions. No Toby account is required.

Conversations, agent profiles, memories, tasks and application settings are stored
on the Mac. Model inference runs through external provider services, which receive
selected conversation context and tool results. Local storage does not imply
offline inference.

## Current experience

The first agent is Toby. Users can edit its personality and specialization, choose
its provider/model, and add more persistent agents. Optional automatic creation
lets agents create specialists; otherwise creation prompts for approval. Groups
support public conversation across the two providers: every active member receives
human messages and peer replies, and can reply, react or stay quiet. Private
delegation is separate. Channels keep a coordinating lead, scoped shared memory
and searchable history across provider turns.
Members are instructed to contribute useful new information, react or pass when
a point is covered, and let casual greetings settle without unsolicited assignments.
See [Channel collaboration rules](docs/CHANNELS.md) for ownership, access and
context boundaries. Fresh onboarding offers an explicit access choice; Settings
provides workspace defaults, per-agent overrides and remembered action categories.

The workspace includes conversation search, attachments, visible activity and
approvals, local files, a shared browser, permission-gated Mac actions, text memory,
shared reusable instructions, stdio MCP connectors and interval-based routines.
Work runs while the Mac is awake and the Toby host is running. Interrupted tasks
require review before continuation. See [Current experience and limits](docs/EXPERIENCE_SCOPE.md)
for the exact capability boundaries.

All replies are text. Voice input is unavailable; there are no local speech models
or a paid voice API fallback.

## Design direction

Toby should feel welcoming, capable and calm. Conversation and agent identity are
central. The desktop reserves the existing Toby artwork for app branding, with stable
editable emoji avatars for agents and locally bundled Nunito Sans typography.
The approved 26 October chat design uses a continuous neutral charcoal canvas,
softly rounded controls and explicit user-controlled pinning.

- Keep ongoing work, downloads, approvals and errors visible without dominating chat.
- Preserve the reader's position during streaming and make prior work easy to find.
- Describe actions and results in plain language, with technical detail available when needed.
- Show actual state and capability limits; do not imply completed work without evidence.
- Use keyboard-operable controls, visible focus, descriptive labels and reduced-motion behavior.

Toby currently targets macOS, with an Apple silicon package. It does not include a
Toby cloud service, mobile client, remote computer, sync layer or separate agent OS
environments. This document describes product direction and current scope, not a
certification of accessibility or visual fidelity across every environment.
