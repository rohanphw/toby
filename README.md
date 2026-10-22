# Toby

**Your own team of AI agents on Mac.**

Toby is an open-source desktop workspace for persistent personal agents. Start with Toby, add specialists, and let them coordinate in shared conversations using your existing **ChatGPT/Codex or Grok subscription**. Teammates can use different providers.

[Download for Mac](https://github.com/rohanphw/toby/releases/download/v1.0.6/Toby-1.0.6-arm64.dmg) · [Release notes](https://github.com/rohanphw/toby/releases/tag/v1.0.6) · [Website](https://www.thetoby.app) · [Documentation](docs/README.md)

## Install

Requires an **Apple Silicon Mac running macOS 14 or later**.

1. Download the DMG, open it, and drag Toby into Applications.
2. Choose Toby's optional personality and specialization.
3. Connect a supported subscription and select an available model.
4. Start a conversation, add teammates, or create a group.

Missing provider runtimes prepare automatically, with actual download and verification progress. No Toby account or API key is needed. Model availability and usage limits depend on your provider subscription.

**Version 1.0.6 is Developer ID signed, but is not Apple-notarized or stapled.** macOS may block opening it. Install future releases manually; no automatic updater is included. This Electron rebuild uses separate storage from earlier Swift versions and does not migrate their data.

## What you can do

- Create agents with their own avatar, personality, specialization, model and workspace. Optionally allow Toby to create specialists.
- Coordinate across providers through direct messages and persistent local group chats. Delegated results return to the requesting agent.
- Read streaming Markdown, attach files, reply, search, copy answers and add reactions. Tool activity uses readable descriptions.
- Save memories and written workflows, and schedule recurring tasks while Toby runs on an awake Mac. Stop, continue or reassign work.
- Use workspace files, approved commands, an embedded browser and approved Mac actions. Configure local stdio MCP connectors for additional tools.

**Voice input is unavailable.** Replies are always text. There are no speech models, meeting recordings, Apple speech recognition, spoken replies or separately billed speech API fallbacks. See [voice availability](docs/VOICE.md).

## Local data and privacy

Conversations, settings, memories, tasks and managed files stay on your Mac. Toby has no hosted backend, cloud sync or mobile client. Model inference uses your provider's servers; relevant conversation and tool context can be sent to that provider. Connected tools and websites have their own data handling.

Production data: `~/Library/Application Support/Toby Next`. Development data: `~/Library/Application Support/Toby Next Development`. `TOBY_DATA_DIR` selects an isolated profile. Provider-managed authentication remains with its CLI, separate from Toby's database.

Settings → Start over → **Reset Toby…** confirms before deleting chats, agents, groups, settings, drafts, browser sessions, downloaded runtimes and Toby-managed files, then restarts at onboarding. Shared provider sign-ins, macOS grants and external workspace folders are preserved. Reset cannot be undone.

Agents share your Mac and permissions. They are not separate operating-system users or security sandboxes. Read the [architecture and trust boundaries](docs/ARCHITECTURE.md).

## Build from source

Use macOS, Xcode Command Line Tools, Bun 1.3.6+ and Node.js 22.13+. Node runs the SQLite tests; the packaged app uses Electron's embedded runtime.

```sh
git clone https://github.com/rohanphw/toby.git
cd toby
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run build
bun run dev
```

For a signed DMG, configure your own Developer ID identity in `package.json`, `scripts/sign-app.cjs` and `scripts/build-dmg.sh`, then run `bun run package:dmg`. Signing requires the corresponding Keychain identity; no certificates, private keys or provider credentials are included. Notarization is not configured. See [development and releases](docs/DEVELOPMENT.md).

## Documentation and support

[Architecture](docs/ARCHITECTURE.md) · [Current scope](docs/EXPERIENCE_SCOPE.md) · [Development](docs/DEVELOPMENT.md) · [Verification](docs/BUILD_REPORT.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

Report reproducible bugs in [GitHub Issues](https://github.com/rohanphw/toby/issues), including app/macOS versions and reproduction steps. Do not post provider tokens, private chats or sensitive files. Support: [rohanphww@gmail.com](mailto:rohanphww@gmail.com).

## License and acknowledgments

Original Toby code is [MIT licensed](LICENSE). Dependencies and provider marks retain their own terms; see [notices](resources/NOTICES.md) and [references](docs/REFERENCES.md). OpenBot and Grok Bot informed the product direction; no OpenBot implementation or branding is bundled. Toby is not affiliated with or endorsed by OpenAI or xAI.
