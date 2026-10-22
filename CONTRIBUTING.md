# Contributing

Use GitHub Issues to discuss substantial changes first. Focused fixes and documentation improvements are welcome through pull requests.

Read the [scope](docs/EXPERIENCE_SCOPE.md), [architecture](docs/ARCHITECTURE.md) and [development guide](docs/DEVELOPMENT.md). Toby is a local macOS app with subscription providers, no hosted Toby service and no speech API billing fallback.

Use an isolated data profile for tests. Never commit credentials, signing material, recordings, chat exports or private files. Run `bun run typecheck`, `bun run test` and `bun run build`; run the relevant Electron fixtures when changing execution, cancellation or provider permissions.

Explain the problem, resulting behavior, checks performed and remaining limitations. Distinguish functional checks from visual or real-provider verification. Keep changes focused, preserve attribution and existing typography/components, and keep actions understandable to users.

Contributions to original Toby code are under the repository's MIT License.
