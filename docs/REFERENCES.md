# References and attribution

Toby's desktop layout and process architecture were informed by OpenBot. OpenBot
was inspected as a behavioral and architectural reference; no OpenBot source code
or branding was copied into this implementation. Reference features are not a
claim of Toby feature parity.

[Grok Bot](https://x.ai/bot) informed the persistent-agent and collaboration product
direction. Its hosted computers and services are not supplied by a Grok CLI login.
Toby implements its own local workspace and task handling.

The Toby logo and application icon reuse the project's existing Toby artwork in
`resources/toby.png` and `resources/Toby.icns`. The UI uses system typography.
Provider icons and third-party dependencies have separate notices under
`resources/licenses`; these references do not replace those license terms.

## Provider integration references

- [Codex app-server](https://learn.chatgpt.com/docs/app-server): the OpenAI provider
  process integration.
- [ChatGPT-plan app-server integration](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server):
  subscription authentication and integration guidance.
- [Grok CLI reference](https://docs.x.ai/build/cli/reference): sign-in and CLI behavior.
- [Grok headless and ACP integration](https://docs.x.ai/build/cli/headless-scripting):
  the stdio agent protocol.

These are upstream references, not promises that every documented model or feature
is available to every subscription. Toby's implemented behavior is documented in
[Architecture](ARCHITECTURE.md) and [Current experience](EXPERIENCE_SCOPE.md).
