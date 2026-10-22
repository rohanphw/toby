# Implementation — approved 2026-10-22
- [x] Desktop host, trusted typed IPC, SQLite and recovery
- [x] Subscription provider runtimes, authentication, model discovery and streaming
- [x] Persistent agents, mailbox, groups, skills, memories, routines and tools
- [x] Subscription-only voice availability decision; local speech and spoken output removed
- [x] OpenBot-style black workspace, onboarding and settings
- [x] Nonvisual functional checks and packaged application smoke tests
- [x] Signed drag-to-Applications DMG and installer verification

Acceptance boundaries: no visual QA; no acoustic device QA; no notarization credentials.
Full parity exceptions and remaining acceptance work are listed in docs/BUILD_REPORT.md.

## Compact desktop pass — 1.0.3
- [x] Astra 6 high UI pass with Solid-compatible accessible controls
- [x] Keyed transcript state, incremental stream updates, readable Markdown
- [x] Automatic provider runtime setup with actual floating download progress
- [x] Remove all speech models, workers, playback and optional speech API billing
- [x] Nonvisual renderer and packaged-app functional verification
- [x] Signed drag-to-Applications installer verification

## Reset app — 1.0.4
- [x] Native Cancel-first confirmation in Settings
- [x] Stop active work/downloads and persist reset intent before restart
- [x] Clear managed local data/browser sessions and reopen onboarding
- [x] Preserve shared provider logins, macOS grants and external workspaces
- [x] Reset retry/symlink tests, compiled-host restart test, renderer action check
- [x] Verify signed 1.0.4 app and installer

## Readable approvals — 1.0.5
- [x] Remove duplicate provider prompts for verified task-bound Toby tools
- [x] Preserve Harness approvals, external tool checks and cancellation
- [x] Reserve the internal connector namespace against shadowing
- [x] Plain-language approval cards with collapsed technical details
- [x] Compact expandable tool activity in conversations
- [x] Protocol regression tests, focused suite and hidden renderer checks
- [x] Verify signed 1.0.5 app and installer

## Understandable tool and message experience — 1.0.6
- [x] Human-readable labels for all 19 built-in tools and all activity states
- [x] Remove raw tool payloads and technical views, including legacy history
- [x] Translate technical errors across chat, task, settings and preview surfaces
- [x] Explain approval scope and prevent approval of opaque requests
- [x] Remove agent avatar circular backgrounds
- [x] Stable message controls, reaction picker/chips and copy/reply feedback
- [x] Attachment pending state and duplicate-action protection
- [x] Focused tests, real Harness/protocol fixtures and hidden functional renderer checks
- [x] Verify signed 1.0.6 app and installer
