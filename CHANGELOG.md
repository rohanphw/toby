# Changelog

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
