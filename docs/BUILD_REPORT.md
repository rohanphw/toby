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
