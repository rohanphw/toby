# Changelog

## 1.0.24 — 2026-10-27 (local review)

- Keep consecutive replies to the same parent in one shallow sibling group, even when different teammates authored them.
- Carry a shared connector through related reply blocks and end it at the last sibling; preserve sender grouping and chronological order.
- Keep older-target references when an unrelated message, activity, missing context or time/date boundary breaks the group.
- Add a regression for the reported human → Jules → Toby exchange, plus long-content and responsive connector checks.

## 1.0.23 — 2026-10-27 (local review)

- Apply the approved flat conversation/reply-connector design: clearer identities, 16px text, compact hover actions, aligned composer and safe member mentions.
- Group adjacent same-sender messages only when their reply target/day/time agree. Preserve chronology, keep local reply links shallow, and use clickable references for older replies.
- Guide every member to contribute useful answers, evidence, corrections or necessary questions; brief greetings settle without unsolicited work checks, and covered points use quiet reactions/passes.
- Suppress exact same-author duplicate posts within a conversation round without creating new deliveries. Keep native decisions and private work out of public chat and ordinary participation out of work indicators.
- Provide bounded delivered-message/current-round evidence and explicit omissions; clip escaped group purpose against its serialized budget without changing stored instructions.

## 1.0.22 — 2026-10-27 (local review)

- Let an active agent start conversations in member groups from a human direct request, including a group it just created; deduplicate retries per destination.
- Run independent jobs concurrently for the same agent within the workspace task limit, with separate context, results, approval ownership and cancellation.
- Keep the composer usable during ongoing work and pending approvals without granting the waiting action; show when multiple tasks are active.
- Replace the full-width reply background with a compact, muted reply reference and bound long quotes.
- Preserve group participation limits and exclusive browser/Mac control, including while a permission decision waits.

## 1.0.21 — 2026-10-27 (local review)

- Replace sole-owner channel routing with shared group conversations: every active member receives human messages and public peer replies, without a recipient selector.
- Let members deliberately post, react with attributed emoji, or quietly pass; keep native decision text, tool activity and private workers out of group chat.
- Persist per-member delivery receipts, coalesce pending messages, retain shared context and bound automatic back-and-forth. The lead facilitates rather than gates discussion.
- Keep peer/routine events distinct from human authorization, preserve member identity on resume, and cancel scoped work when members are removed or hidden.
- Recognize registered internal reaction/pass tools under the existing permission policy so Grok does not request approval for ordinary participation.

## 1.0.20 — 2026-10-27 (local review)

- Verify real OpenAI↔Grok channel delegation, source-backed shared facts, lead changes and history across complete app-process restarts.
- Verify both agents’ personal-memory recall after restart with seed chat messages removed from the isolated profile.
- Restrict shared channel-memory publication to the current running root owner, preventing private workers from publishing their briefs or results as shared facts.
- Reject all child-task assistant, system and tool records at the public boundary even if a stored record incorrectly says public; retain safe owner activity summaries.
- Add an opt-in live desktop test using the production main, preload and renderer, with canary checks on IPC, DOM, search, expanded activity, memory, quoted replies and copy.

## 1.0.19 — 2026-10-26 (local review)

- Add an explicit onboarding access choice, workspace defaults, per-agent overrides, remembered action categories and revocation for active full-access work.
- Notify on Mac when approval, a failed root task or provider setup/connection needs attention; route clicks to the owning chat or Settings.
- Add persistent channel leads, recipient/reply/leading-mention routing, scoped membership cancellation and bounded parallel work.
- Retain channel context through shared memories, source IDs, paginated retrieval and an internal membership-scoped SQLite full-text index.
- Support routines targeting a channel and prevent routine-origin work from changing groups or scheduling itself again.
- Document host-enforced collaboration rules and the OpenBot reference in `docs/CHANNELS.md`.

## 1.0.18 — 2026-10-26 (local review)

- Implement the locked neutral charcoal mockup with flush sidebar, conversation and inspector surfaces, modest rounded controls and an off-white primary action.
- Place lightweight conversation suggestions below the centered empty-chat composer.
- Reserve the Toby logo for app branding; use stable, editable emoji agent avatars, including legacy profile fallbacks and persisted defaults for new agents.
- Remove the top-left onboarding brand row. The onboarding illustration remains pending a separate design decision.

## 1.0.17 — 2026-10-26 (local review)

- Rebuild the whole interface with rounded charcoal surfaces, locally bundled Nunito Sans typography, sage controls and short, reduced-motion-aware transitions.
- Start fresh setup with an illustrated, continuously looping welcome and Get started before personalization or subscription fields.
- Show only explicitly pinned agents and groups in the pinned section; preserve pins across restarts and group edits.
- Keep the same draft composer through empty/chat/approval/inspector changes and simplify libraries with progressive Add/Edit/Cancel forms.
- Keep editor Save actions visible while fields scroll, and protect welcome actions from download-status overlap.

## 1.0.16 — 2026-10-26 (local review)

- Replace the message input with a compact permission panel while a decision is pending, preserving the draft, reply and attachments.
- Queue requests within their owning conversation, including approvals from delegated teammates; retain Deny and Allow once behavior, pending feedback and safe retry errors.
- Reshape the sidebar around a featured primary agent, compact teammate roles and public-message previews, search/add controls and real group-member artwork.
- Keep the inspector beside the conversation at the minimum window size so approval buttons remain reachable.

## 1.0.15 — 2026-10-26 (local review)

- Publish provider replies only after successful completion, preserving final Markdown and code while excluding recognized reasoning and commentary.
- Keep worker briefs and results private; wait for all teammates before one coordinator synthesis.
- Group safe action summaries behind collapsed activity disclosures and protect chat, search, quotes and task panels from private execution content.
- Harden coordination stop/restart, worker removal and root-owned retry behavior.

This review build uses the available 1.0.7 source plus these changes. The missing local 1.0.8–1.0.14 work is not included. Grok ACP and legacy Codex classification limits are documented in `docs/CHAT_HARDENING.md`.

## 1.0.7 — 2026-10-23

- Adopt the approved compact Mac-style design: smaller controls and avatars, restrained header, centered conversation/composer and open assistant text.
- Add a functional sidebar search for agents and groups, with a clear action and empty-results state.
- Keep model selection in agent settings while presenting a readable agent role in the conversation header.
- Preserve message reactions, reply/copy, attachments, streaming, group coordination, approvals and reset in the updated shell.

Installer: [Toby-1.0.7-arm64.dmg](https://github.com/rohanphw/toby/releases/download/v1.0.7/Toby-1.0.7-arm64.dmg). Developer ID signed, not notarized; no visual QA performed.

## 1.0.6 — 2026-10-22

First public release of the Electron rebuild. Earlier Swift releases are a separate app line; this version does not automatically migrate or update them.

- Persistent specialist agents, provider-independent identities and local group chats.
- ChatGPT/Codex and Grok subscriptions, model discovery and background runtime setup.
- Streaming Markdown, replies, attachments, search and persistent reactions.
- Memories, written skills, recurring local tasks, workspace tools and local MCP connectors.
- Approved command/browser/Mac actions, interruption and manual task recovery.
- Readable activity and errors for all 19 built-in tools; legacy tool payloads stay hidden.
- Improved reaction picker, copy/reply feedback and attachment opening states.
- Removed avatar backplates while retaining Toby's branding and black theme.
- Confirmed reset returns to onboarding, preserving shared sign-ins and external folders.

Voice input is unavailable; all replies are text. Apple Silicon/macOS 14+ only. Signed DMG, not notarized; no automatic updater.
