# Toby design direction

A Mac user works in a dark desktop conversation, switching between named agents
and inspecting work without losing the current thread. Use the approved black
canvas, existing Toby mark, white provider marks and macOS system typography.

The target is a compact, friendly desktop workspace: approximately 248 px team
sidebar, 14 px transcript text, 40–44 px form controls, content-driven message
spacing and a composer that grows with the draft. Corners remain soft without
inflating every row or bubble. Use Lucide icons and accessible Solid-compatible
Kobalte controls; do not migrate to React to obtain shadcn components.

Secondary message actions appear on hover/focus, with saved reactions visible.
Agent names, roles, timestamps and activity use a clear hierarchy. Sanitized
Markdown supports readable prose, code and lists. Streaming updates preserve
stable rows, follow the bottom only while the user is there, and offer a visible
return-to-latest action. Motion is brief and respects reduced motion.

Provider setup downloads run in the background with a small bottom-right pill
showing real progress and retry state. Speech model downloads are removed. Voice
input requires supported provider subscription access and a microphone grant;
all assistant replies are text.
