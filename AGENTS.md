# Toby project instructions

## Current approval boundary

Rohan approved implementation on 2026-10-22, including dependencies, builds, local
packaging, a proper drag-to-Applications DMG, and functional verification.
Rohan separately authorized committing and pushing this new public repository to
`rohanphw/toby`, publishing the 1.0.6 DMG on GitHub Releases and updating the separate
`toby-site` checkout on main on 2026-10-22. Preserve older repositories and releases.
No visual QA or changes to reference checkouts.

## Product constraints

- macOS desktop only. No mobile client or other operating-system target.
- No Toby account, hosted backend, remote access, cloud sync, or mandatory Toby login.
- Keep conversations, agent memory, coordination, and application data on the Mac.
- Model inference uses the user's external provider subscription. Do not claim offline LLM inference.
- Initial providers: OpenAI through ChatGPT/Codex subscription authentication and Grok through
  Grok CLI subscription authentication. No API-key billing fallback or other providers in initial scope.
- The first persistent agent is named Toby. Personality and specialization are optional and editable.
  Provider and model selection are required before AI use.
- Users can create additional agents through an Add agent flow equivalent to first-agent setup:
  avatar, name, optional personality, optional specialization, and required provider/model.
  All agents remain editable. Manual creation works independently of automatic creation being enabled.
- Provide a user-controlled option for agents to create persistent specialist agents as needed,
  with no fixed product cap on the number of agents. Bound concurrent execution separately.
- Agents can create local groups and persistent group chats for cross-provider coordination.
  Persist membership, transcripts, task ownership, and delivery state across restarts.
- Assistant replies are always text. Local speech models and spoken output were removed on 2026-10-22.
- Voice input remains unavailable until supported through existing provider subscriptions. Rohan explicitly rejected separately billed speech API credentials.
- Provider runtime downloads start automatically in the background and expose real progress in a bottom-right pill.
- OpenBot is the layout and desktop-architecture reference. OpenCode was explicitly rejected
  in the latest user correction; do not use its shell geometry.
- Preserve the existing Toby logo, application icon, macOS system typography, and black theme.
  Do not introduce a new logo, font family, mascot asset, or unrelated visual system.

## Implementation direction after approval

- Electron desktop host, TypeScript, SolidJS renderer, typed preload IPC, SQLite, Bun tooling.
- Electron main uses its embedded Node runtime. Do not add a Bun HTTP backend.
- Local provider and voice workers communicate through IPC or standard input/output.
- Keep agent identity, role, memories, and local conversation independent of provider session IDs.
- Use provider adapters and a durable mailbox for cross-model collaboration.
- Agent-created specialists inherit a valid configured provider/model unless another connected,
  supported model is selected. Creation must not widen the creator's permissions.
- Persistent groups and group chats are required scope, not an optional future feature.
- Product target: the full local macOS Grok Bot + OpenBot experience, not only chat and delegation.
  See `docs/EXPERIENCE_SCOPE.md` for the feature baseline and deliberate local-only differences.
- Include browser and macOS computer use, local files/artifacts, connectors/MCP, durable memory,
  reusable skills, workflow teaching, routines, background tasks, and visible human controls.
- Local background work requires an awake Mac and a running Toby host. Do not promise cloud-style
  work while the Mac is asleep/off or per-agent cloud computers. Serialize foreground desktop control.
- Inspect references for behavior and architecture. Do not wholesale copy the OpenBot repository
  or its branding. Record attribution and license requirements for any code or asset actually reused.
- Use GPT-6 Astra (`gpt-6-astra`) at high reasoning for the current UI and heavy architecture pass,
  as Rohan requested. Sub-agents are authorized for this project.

## Work boundaries

- Never modify the old Swift checkout, existing Toby user data, or OpenBot reference checkout.
- Use a separate development data directory and bundle identifier. Migration requires a distinct scope.
- Do not take browser, application, emulator, or third-party screenshots without Rohan's instruction
  or an image supplied as the task's reference.
- Stop development servers started for this task before handoff unless explicitly asked to keep them.
- Keep changes surgical. Run focused checks and report what was actually verified.
- Do not commit, push, publish, or deploy unless separately authorized.
