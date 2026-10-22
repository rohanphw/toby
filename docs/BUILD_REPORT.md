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
