# Scope and action approvals

This document describes Toby 1.0.6's product boundary and runtime approval behavior.
For implementation details, see [Architecture](ARCHITECTURE.md); for the feature
inventory, see [Current experience](EXPERIENCE_SCOPE.md).

Toby runs on macOS, stores application data locally, and connects to external
OpenAI or Grok services through subscription-authenticated provider CLIs. It has
no Toby account, hosted backend, remote-access service or cloud sync. Assistant
replies are text; voice input is unavailable.

## Runtime approvals

The application asks before its harness runs a shell command, clicks or types on
a webpage, performs a Mac computer action, or creates a routine through an agent.
Agent-created specialists require approval when automatic creation is disabled.
Users can always create agents manually through setup.

Approval requests describe the action and target in ordinary language, without
rendering raw protocol diagnostics. Provider-native requests are translated into
these summaries; requests that cannot be sufficiently
explained have no enabled approval action. For registered Toby tools, Grok's
permission layer routes execution to the task-bound harness, which applies the
action-specific checks instead of showing two prompts for the same action.

Basic workspace operations, memory/skill saves, delegation, group operations and
browser navigation/reading do not each require a prompt. MCP connector processes
and approved commands run with the user's privileges. Approval is an interaction
control, not a guarantee of OS isolation or universal interception of external
side effects. Accessibility and Screen Recording permissions are separate macOS
controls and remain subject to user consent.

## Continuity and deletion

Tasks can continue while the Mac is awake and the host is running, including with
the main window closed. They cannot run while the host is quit or the Mac is off.
Startup marks previously running work interrupted. Continuing it creates a new
assignment asking the agent to inspect prior state; external outcomes still need
review before repeating uncertain actions.

Reset requires a native confirmation and deletes managed local records, workspace
files, downloaded runtimes and browser sessions on relaunch. It retains shared
provider sign-ins, macOS permissions and folders outside Toby storage. Removing an
individual agent instead retains its history and workspace files.

No approval transcript or development-machine evidence is needed to use this
repository. Release verification and installation limits belong in the
[Build report](BUILD_REPORT.md) and repository README.
