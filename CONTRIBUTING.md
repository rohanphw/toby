# Contributing to Toby

Thanks for helping make Toby better. Small, focused changes are easiest to review. For a substantial feature or architectural change, open an issue to discuss the use case first.

## Development

Follow the [README](README.md#build-from-source) to compile or package a local build. `Package.swift` can also be opened in Xcode. App code lives in `Sources/Toby`; packaging resources live in `Packaging`.

Google connections require your own Desktop OAuth client. Keep it outside Git or in ignored `.local/GoogleOAuthClient.json`. Never include tokens, account data, recordings, signing keys, or private configuration in a pull request.

## Before opening a pull request

Run:

```sh
swift build -c release
plutil -lint Packaging/Info.plist Packaging/Toby.entitlements
bash -n scripts/build-app.sh
```

Focused workspace tests live in `Tests/TobyTests`. Compile them with `swift build --build-tests`; run `swift test` only when runtime testing is authorized. They use synthetic content and temporary directories. Describe the behavior you changed, the checks you ran, and any manual checks you did not run. For changes to recording, permissions, provider execution, or persistence, use the relevant cases in [QA-HANDOFF.md](docs/QA-HANDOFF.md). Do not use real private meeting data in bug reports or fixtures.

Keep changes scoped and follow the existing SwiftUI and Observation patterns. Update documentation and the changelog when user-visible behavior changes. Maintainers coordinate version bumps and releases.

## Bug reports

Include the Toby version, macOS version, Mac architecture, steps to reproduce, and expected versus actual behavior. For provider issues, include the CLI name and version. Remove personal content and credentials from logs before sharing them.

For security issues, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

Contributions are provided under the project's MIT License. Retain attribution and licenses for any third-party code or assets you introduce.
