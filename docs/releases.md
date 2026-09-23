# Releases

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
