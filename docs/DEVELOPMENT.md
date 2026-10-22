# Development and releases

## Prerequisites

Use an Apple Silicon Mac with macOS 14+, Xcode Command Line Tools, Bun 1.3.6+ and Node.js 22.13+. Release 1.0.6 was built with Bun 1.3.6 and Electron 45. Node's built-in SQLite is used by tests; Electron supplies the packaged runtime.

```sh
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run build
```

`bun run dev` starts Electron and its development renderer server. Stop it when finished. Production uses IPC and stdio rather than an HTTP backend.

## Isolated profiles

Development uses `~/Library/Application Support/Toby Next Development`. Production uses `~/Library/Application Support/Toby Next` with bundle ID `com.toby.desktop.next`.

Set `TOBY_DATA_DIR` to a disposable absolute directory when checking reset or persistence. Provider sign-ins are managed separately by their CLI; using a test profile does not create a separate provider account. Never run destructive profile tests against a real user's data.

The app downloads pinned, checksum-verified Codex/Grok runtimes when necessary. Their selected subscription accounts and current model catalogs determine access. Do not commit provider tokens or copy them into the renderer.

## Checks

`bun run test` runs Bun unit tests plus Node SQLite persistence tests. `bun run typecheck` checks application sources. Build the app before compiled-host checks.

The Electron integrations use deterministic providers/protocol fixtures and temporary profiles. For example:

```sh
bun build tests/tool-presentation.integration.ts --target=node --format=cjs --external electron --outfile .local/tool-presentation.cjs
node_modules/.bin/electron .local/tool-presentation.cjs
```

Use the same build/run pattern for `tests/harness.integration.ts` and `tests/grok-approval.integration.ts`. They cover delegation and streaming, task-bound MCP permissions, cancellation and readable tool presentation. `tests/reset.integration.ts` exercises the compiled host's confirmation and restart path. Integration fixtures terminate themselves; investigate a timeout instead of leaving test processes running.

`scripts/provider-smoke.ts` is separate: it uses real provider subscriptions and may consume provider usage. It is not part of the offline fixture suite. Never infer real model access from model-list results alone.

## Signed installer

Configure your own Developer ID Application identity in `package.json`, `scripts/sign-app.cjs` and `scripts/build-dmg.sh`. Install that identity securely in your Keychain. Do not put certificates or private keys in the repository.

```sh
bun run package:dmg
```

This builds the renderer/main/preload and Swift Mac helper, packages Apple Silicon Electron, signs executable code and containing bundles, then creates the DMG. Outputs are `dist/mac-arm64/Toby.app` and `dist/Toby-<version>-arm64.dmg`. The installer preserves the original 640×400 drag-to-Applications composition.

The custom signer distinguishes executable Mach-O code from Chromium data. Installer verification checks signatures, checksum, the app, Applications shortcut and Finder layout metadata without opening Finder. macOS signing tools and a usable signing identity are required; the DMG helper bootstraps an ignored local Python environment if needed.

Notarization/stapling is not configured for 1.0.6. A signed installer is not a notarized installer. Record actual release status rather than treating a successful package build as Gatekeeper acceptance.

## Publishing a release

1. Update the version, release notes and current verification report.
2. Run focused checks and build/package verification. State any unperformed visual, live-provider or device checks.
3. Commit the exact source, tag it as `v<version>`, and publish the versioned DMG with `SHA256SUMS` on GitHub Releases.
4. Verify the public download and checksum, then update the website's download, release notes and source links together.

The Electron rebuild has no updater feed. Do not publish an old Swift Sparkle feed for it or overwrite an older app line's release history.
