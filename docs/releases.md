# Releases

## v0.11.1

Adds Settings → General → Check for updates through Sparkle, CLI startup compatibility improvements, standard Grok session model discovery, and actionable private diagnostics. Build 21; Apple Silicon, macOS 14+. The first upgrade from v0.11.0 is manual. Subsequent published releases can be installed through Settings.

Download: https://github.com/rohanphw/toby/releases/tag/v0.11.1

Release validation includes compilation, package signatures, Apple notarization, and signed update-archive verification. The affected user’s CLI failure and actual updater installation remain unverified; no runtime tests or visual QA were performed.

## v0.11.0

The workspace release adds projects, cited library answers, reviewed commitments, meeting preparation, daily briefs, reusable workflows and quick capture. The installer uses the approved simple light design. App version `0.11.0`, build `20`; Apple Silicon, macOS 14+. Google OAuth verification remains pending.

Download: https://github.com/rohanphw/toby/releases/tag/v0.11.0

Validation: release and test-target compilation, signed package checks, and Apple notarization. Functional tests and visual QA were not run by the agent. The user reviewed and approved the simplified installer. See [workspace rollout](workspace-rollout.md) for feature boundaries and manual checks.

## v0.10.1

This release includes the remembered-context compiler compatibility fix and public source documentation. The `v0.10.1` tag matches the binary source; app version is `0.10.1`, build `19`. Distribution targets Apple Silicon and macOS 14+, with Developer ID signing, hardened runtime, and notarization for both app and DMG. Google OAuth verification remains pending.

Download: https://github.com/rohanphw/toby/releases/tag/v0.10.1

## v0.10.0

The first public build targets Apple Silicon and macOS 14 or later.

- Download: https://github.com/rohanphw/toby/releases/tag/v0.10.0
- App source: `112f14d1fc4af91b711e7b3eefb4a06ffe8abb9d` (tag `v0.10.0`).
- App version: `0.10.0`; bundle build: `18`.
- Distribution: Developer ID signing, hardened runtime, secure timestamp, and Apple notarization.
- Install: open the DMG and drag Toby to Applications.
- Integrity: compare the DMG's SHA-256 digest with `SHA256SUMS.txt` from the release.

The tag identifies the original binary's source. The main branch also includes public documentation and a behavior-preserving compiler compatibility fix to remembered-context assembly. Those later source changes are not retroactively included in the signed binary.

Google OAuth review is separate from Apple notarization and remains pending. Google connections can show an unverified-app warning or face account limits. AI features require a supported, authenticated CLI and its provider account.

Release verification covers signatures, notarization tickets, Gatekeeper assessment, disk-image integrity, and packaged contents. It does not replace manual testing of onboarding, capture, permissions, or provider execution on a separate Mac.

## Future releases

Update `VERSION`, bundle metadata, and `CHANGELOG.md` together. Build from a known commit into a separate staging directory. Never replace a running app or change the locally pinned development identity as a side effect of release packaging.

Sign the staged app with Developer ID, hardened runtime, and a secure timestamp. Submit it to Apple, wait for acceptance, staple the ticket, and validate both the ticket and Gatekeeper assessment. Package that app with an Applications shortcut in a DMG, sign the image, and submit/staple/validate the image too. Generate checksums after stapling, since stapling changes the artifact's bytes.

Keep OAuth configuration, signing material, and notarization credentials outside Git. Release assets belong in GitHub Releases, not the source tree. Publish a tag matching the built source, include architecture and system requirements, verify the uploaded bytes, and update the website's explicit versioned download URL.

## Branded installer packaging

The installer is a native Finder drag-to-Applications window with a 640 × 400 point layout and a light background for readable native black icon labels. Its background is rendered as a single 72-dpi PNG by `Packaging/Installer/render-background.swift`. The actual app and Applications shortcut remain normal, accessible Finder items; the background arrow is decorative. Artwork and icon positions are configured together in `Packaging/Installer/settings.py`.

Set up the packaging tool once:

```sh
python3 -m venv .local/dmg-tools/venv
.local/dmg-tools/venv/bin/pip install -r Packaging/Installer/requirements.txt
```

Package an already signed app using absolute paths:

```sh
scripts/build-dmg.sh /absolute/path/Toby.app /absolute/path/Toby-version-arm64.dmg
```

The script refuses to overwrite an existing image, verifies the app signature and disk-image integrity, and builds the Finder metadata without opening Finder. It preserves the input app and local signing identity. It does not sign or notarize the resulting DMG; follow the release steps above before distribution. The volume version is read from the input app, not the source checkout.

For the local v0.11.0 preview, packaging and saved layout metadata were checked without visual QA. Before release, manually inspect the mounted window on a Retina display, in light/dark macOS appearance and at larger accessibility text settings. Verify both icon labels, drag installation, window bounds and eject behavior. No installer automation should launch the app or grant permissions.

## Signed in-app updates (from 0.11.1)

Sparkle is pinned through Package.resolved. scripts/build-app.sh embeds its framework and signs nested helpers before the outer app. The updater uses the `toby-sparkle` signing account in the maintainer's login Keychain; never export that private key into the repository. Forks must generate their own key and replace SUPublicEDKey and SUFeedURL.

After app and DMG notarization/stapling, run `scripts/generate-appcast.sh /absolute/path/Toby-VERSION-arm64.dmg VERSION`. Verify the generated version, minimum OS, arm64 requirement, URL, signature and file length. Upload the immutable DMG and checksums to the matching public GitHub release, then commit/push appcast.xml. Never change the archive bytes after generating its signature. Do not publish a feed pointing to a draft or missing asset.

The initial feed is seeded from the already released v0.11.0 (build 20), with its archive signature verified against the embedded public key; v0.11.1 (build 21) will see no newer version until a later release is published. The update signing key remains in Keychain. Feed generation rejects new entries missing their Ed25519 signature or carrying a mismatched URL or length. The first updater-enabled version needs a manual installation. The feed must be published as part of that version's release. User-interface and actual upgrade validation remain pending under the compile-only rule.
