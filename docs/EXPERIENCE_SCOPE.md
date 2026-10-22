# Current experience and limits

This is the implemented scope of Toby 1.0.6, not a promise of feature parity with
its references. Toby is a macOS agent workspace using ChatGPT/Codex or Grok
subscription sign-in. Application records live locally; inference uses external
provider services. No Toby account is required.

| Area | Current behavior | Boundary |
| --- | --- | --- |
| Agents | Create and edit name, avatar, personality, specialization, provider and model; pin, hide and restore agents. | Setup requires a connected provider and a model from its catalog. The first agent cannot be removed. Removing another agent retains its history and workspace files. |
| Specialist creation | Agents can create persistent specialists with their own provider/model configuration inherited from the creator. | Automatic creation is optional; when off, an agent request prompts for approval. Manual creation remains available. |
| Conversation | Streamed Markdown, code blocks, copy, quoted replies, reactions, attachments and conversation search. | Attachments are local file copies. Reading a file's contents depends on available tools and provider capabilities. |
| Groups | Persistent membership, instructions and attributed messages. An `@name` in user text selects a member; otherwise the first member receives the task. | Groups do not automatically broadcast every request to all members. |
| Delegation | Queue work for another agent and return results through a new synthesis task for the requester. | Parent/child tasks and duplicate-brief checks are not a general delivery-receipt system or exactly-once guarantee. |
| Parallel work | One active task per agent, with 1–8 concurrent tasks overall; default 3. | Browser state and Mac interaction are shared resources, not separate agent computers. |
| Supervision | Activity states, action approvals, stop, and continuation/reassignment of failed or interrupted work. | Restart marks uncertain running work interrupted; it does not automatically reconcile external effects. |
| Browser | Separate Electron browser window with persistent session, page reading, indexed element clicks and typing. | Click/type actions ask for approval; password inputs require manual entry. No per-agent isolated browser profile. |
| Computer use | Screen capture, active-app description, pointer/keyboard/scroll operations through local helpers. | Each harness computer action asks for approval and needs the applicable macOS permission. |
| Files and artifacts | Agent workspace selection, file listing, UTF-8 preview, artifact writes, file sharing and opening attachments. | Text previews/writes are bounded; arbitrary document rendering and editing suites are not built in. |
| Connectors | Configure, edit, enable and remove local stdio MCP commands. | No bundled app catalog, generic OAuth setup wizard or connector health dashboard. A configured command is not proof an integration works. |
| Memory | Agent-scoped text records that users can add, edit and remove; agents can save memories. | Records are included in context directly. There is no semantic retrieval index or automatic memory verification. |
| Skills | Shared reusable text instructions, editable by users and saveable by agents. | All saved skills are supplied to agents. There is no per-agent enablement, demonstration recorder or enforced review/test gate. |
| Routines | Agent-owned repeating instructions with minute interval, pause/resume and run-now controls. | Requires an awake Mac and running host. No timezone/cron scheduling or cloud execution. |
| Voice | Disabled input control and explicit unavailable state. Replies are text. | No dictation, spoken conversation, local speech models, or paid voice API fallback. |
| Reset | Confirm deletion of managed local data and browser sessions, then return to onboarding. | External workspace folders, shared provider sign-ins and macOS permissions remain. |

The application does not provide mobile/web clients, remote Mac access, cloud sync,
cloud computers, hosted webhooks, other model providers or API-key billing fallback.
The current package target is Apple silicon macOS; do not infer Intel or other
platform support from Electron's broader capabilities.

Local ownership is not offline inference or OS isolation. Providers receive the
context needed for a task, and configured connectors may contact their own services.
Approved commands and connector processes run as the Mac user. The current approval
and ownership boundaries are described in [Architecture](ARCHITECTURE.md).

Workflow demonstration capture, per-agent skill grants, richer scheduling and
stronger external-action recovery are possible future work, not delivered features.
Implementation descriptions here are based on source inspection; they do not certify
every provider account, website, connector or Mac environment. See
[Build report](BUILD_REPORT.md) for recorded verification boundaries.
