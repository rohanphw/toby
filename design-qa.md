# Conversation design verification — 1.0.24

Source visual truth: `docs/design/conversation-reference.png` (1496×1051 pixels), the approved combined flat-conversation/reply-connector mockup. The user confirmed that consecutive replies to the same parent must form one sibling group. The 1.0.23 interpretation of those rules was incorrect and is corrected here.

Implementation evidence: `.local/verification/1.0.24/approved-conversation.png`, the same historical public exchange in the real renderer with isolated fixture data. This legacy text is used only to compare the design; it is not the new agent policy's expected greeting behavior.

## Viewport and comparison

Final conversation CSS crop:1040×730 within a1280×730 renderer content viewport, sidebar240px. Native capture2080×1460 (@2x), downsampled to1040×730. Reference normalized1496×1051→1040×730 with aspect-preserving rounding. Neither screenshot nor source is used as the product UI.

Combined comparison inputs, opened and inspected:
- `.local/verification/1.0.24/comparison.png`: normalized reference and implementation together.
- `.local/verification/1.0.24/comparison-detail.png`: readable conversation/identity/connector/mention detail from both inputs.
- Additional full-workspace captures at1280×768 and960×608 content sizes, plus a long reply at960px. Small viewports scroll the transcript while the composer stays reachable.

## Comparison history

- [P1, 1.0.23] Sibling relationship mismatch missed by the earlier QA pass. Both Jules and Toby replied to the same human post, but only Jules was indented/connected; Toby repeated the parent quote on the main axis. Treating any intervening speaker as unrelated was the wrong rule. The new regression failed before the fix (`none, local, reference`) and passes with both children local.
- [Fixed, 1.0.24] Contiguous same-parent replies now share one stem and indent across authors, preserving chronology and grouped identities. Stem segments span actual row height plus the following gap, with no tail below the last sibling header. Before/after detail and approved-reference comparisons were opened together; both children now clearly share their actual parent. Unrelated, missing/filter, time/date and operational boundaries still break the cluster.

Initial capture had a1272×862CSS conversation with a 688px inner lane. It was inspected together with the source; the aspect mismatch was identified before judging pixel fidelity.

1. [P2] Narrow reading/composer proportions. Fixed both on an 800px maximum inner lane with responsive padding. Final normalized comparison shows aligned reading/input widths and readable message wrapping.
2. [P2] Missing mention hierarchy. Real member mentions now receive restrained neutral highlighting in sanitized text nodes; code/links retain original content. Final detail comparison confirms the treatment.
3. [P2] Repeated older reply context in grouped rows. Shared references now appear once per sender group; renderer interaction regression confirms suppression. No blank action-footer space remains.

## Required fidelity surfaces

- Typography: bundled Nunito Sans,16px transcript,14px strong names,11px quiet times,32px native emoji identities. Clear hierarchy and comfortable wrapping; no clipping in checked states. Native emoji glyphs and system time format differ slightly from generated artwork intentionally.
- Layout/rhythm: flat shared reading axis, tight grouped continuations,24px speaker separation, bounded one-level reply offset. Consecutive same-parent siblings now share a stem, including across different speakers. A compact older-target reference is used only after an unrelated interruption or other cluster boundary. Header retains the real app's full-width controls; Today/date context is retained.
- Colors/tokens: neutral charcoal structural surfaces, grayscale controls, off-white primary action, natural emoji colors. No green tint, ambient glow or inset full-height panels. Empty send control is disabled gray in the capture; populated/active send retains off-white.
- Assets: existing native emoji identities and Lucide UI icons, as explicitly requested by the user. No new logo, avatar raster, decorative illustration or placeholder asset. Curved reply strokes are structural UI relationships rather than decorative artwork.
- Copy/content: original reference exchange reproduced exactly. Real sender names/times and public reply metadata drive the UI. No invented unread/presence state or private work text.

## Functional verification

Passed renderer functional/workflow/layout tests: actual sender grouping, chronology, mentions without invented links, code/link mention safety, adjacent connectors, older-target search navigation/focus, duplicate reference suppression, silent participation vs real work, Stop retention, copy/reply/reactions, draft persistence, approvals alongside new sends, long references and responsive controls. Renderer capture fixture reported no console errors and no horizontal overflow. A fixed-delay focus check raced under concurrent Electron fixtures; bounded polling now checks the actual focus/search outcome.

The new isolated `tests/reply-clusters.integration.cjs` verifies parent/child stem joins within 1 CSS pixel, consistent 44px sibling indent, long Markdown bodies, attachments, wrapped supported reactions, stable hover geometry, grouped continuations, filter boundaries and source navigation. A grouped root continuation that becomes the actual reply parent carries its stem back to the existing visible author identity, keeping the source ID and avoiding a new blank-gutter anchor or duplicate identity.

No actionable P0/P1/P2 findings remain in the checked states. Remaining P3: natural platform emoji/time-format differences from generated artwork; no animation frame-rate measurement. Browser/third-party screenshots and real user profiles were not accessed.

## Implementation checklist

- [x] Apply the approved neutral flat conversation design.
- [x] Enforce real grouping/reply relationships without reordering.
- [x] Compare full view and focused detail after fixes.
- [x] Verify existing core chat controls and narrow layouts.

final result: passed
