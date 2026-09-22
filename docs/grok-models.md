# Grok model selection — research, 2026-09-22

The installed `grok agent --help` advertises `--model`. For Toby’s existing ACP connection, xAI also exposes catalog discovery and per-session selection, so no API key or separate HTTP model service is needed.

## Implementation contract

- Authenticate through the existing `cached_token` method.
- Automatic startup model loading calls `_x.ai/models/list`. ACP adds the leading underscore for extension methods; the Rust handler is named `x.ai/models/list`.
- The handler returns an `ExtMethodResult` inside the JSON-RPC result. Read `result.availableModels`, preserving each `modelId` and `name`. Do not hardcode product names or infer model IDs.
- Save the choice under `grokModel`, separately from `codexModel`. An unset choice is initialized from the catalog’s `currentModelId`; the UI always presents an actual model and preserves explicit saved selections.
- After `session/new`, call `session/set_model` with `sessionId` and `modelId` before `session/prompt`. A rejected selection fails visibly before prompting.
- Discovery creates no conversation and sends no prompt. It uses a separate process and cannot change an active task’s model.
- Missing catalogs, empty lists, and CLI errors are shown inline. A saved choice stays visible before loading; its validity is checked by the CLI when applied.

## Sources

- [xAI ACP documentation](https://docs.x.ai/build/cli/headless-scripting)
- [ACP extension wire names](https://agentclientprotocol.com/protocol/v1/extensibility)
- [xAI model catalog handler](https://github.com/xai-org/grok-build/blob/4247f661689354b831191f11eeeac8424993fe3d/crates/codegen/xai-grok-shell/src/agent/handlers/models.rs)
- [xAI ACP routing and model setter](https://github.com/xai-org/grok-build/blob/4247f661689354b831191f11eeeac8424993fe3d/crates/codegen/xai-grok-shell/src/agent/mvp_agent/acp_agent.rs)
- [xAI extension response envelope](https://github.com/xai-org/grok-build/blob/4247f661689354b831191f11eeeac8424993fe3d/crates/codegen/xai-grok-shell/src/session/result.rs)

Research used public documentation/source and installed CLI help. No account discovery or model prompt was executed during implementation, per the user’s functionality-test boundary. Compilation establishes Swift compatibility, not live provider acceptance. Older Grok CLIs without the catalog extension require an update.

Codex default resolution uses `config/read.config.model`, or the catalog `isDefault` when unset. Confirmed against locally generated app-server protocol types and [official documentation](https://learn.chatgpt.com/docs/app-server). No credential files are read.
