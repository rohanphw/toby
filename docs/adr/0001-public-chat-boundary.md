# ADR-0001: Publish final replies separately from private execution

Status: implemented and approved for the 1.0.24 release.

## Context

Toby's provider adapters merged intermediate and final text. Delegation briefs,
worker responses and task result bodies could also reach the public renderer.
Folding those records into an accordion would leave the same disclosure problem.
The application must remain local, keep its existing approval restrictions and
preserve agent identity across providers.

## Decision

Buffer provider text until successful terminal completion, using protocol identity
and phase/work boundaries rather than text heuristics. Keep pending output and
delegated exchanges internal. Wait for every direct subtask before the same owner
resumes synthesis. Apply an explicit public projection before IPC and defensively
in the renderer. Display only benign structured action summaries in a collapsed,
keyboard-operable disclosure. Never put raw reasoning in that disclosure.

## Consequences

The renderer receives less private material, and out-of-order worker completion
does not cause multiple premature syntheses. Existing Markdown deliverables and
approval policies remain intact. The cost is delayed answer display: text becomes
visible after completion, rather than streaming provisional tokens. ACP and legacy
Codex response classification retain the limits documented in the review.

Waiting work pauses on restart rather than repeating uncertain external actions.
This is application-level coordination, not an OS permission sandbox or an
exactly-once guarantee for arbitrary external side effects.

## Alternatives

- CSS hiding or folding raw text: rejected because it still discloses private
  content through the DOM, search, copying or future render paths.
- Prompt-only filtering: useful instruction, insufficient as an enforced boundary.
- Porting the reference applications' orchestration stacks: unnecessary complexity
  for this local Electron application, and their visibility policies differ.
- Removing words that look like reasoning: rejected because it damages legitimate
  prose/code and cannot reliably identify a message's intended audience.

See [the source review and verification boundaries](../CHAT_HARDENING.md).
