# Toby design direction

A Mac user works in a dark desktop conversation, switching between named agents
and inspecting work without losing the current thread. Use the approved black
canvas, existing Toby mark, white provider marks and macOS system typography.

The approved reference is the latest compact mockup, `02-compact-v2.png`, from
the October 23, 2026 Toby UI mockup set. Earlier option 02 and compact v1 are not
the implementation target. Translate the reference into real native-window CSS
dimensions rather than scaling or zooming the whole interface.

Use a 244 px team sidebar (236 px in narrower windows), a 68 px conversation
header, and a centered reading column up to 760 px wide. Transcript text is
14 px. Agent avatars are 28 px in the roster, 30 px in the header, and 24 px in
messages. Preserve the original Toby artwork without circular backplates;
initials use small rounded squares. Assistant prose sits directly on the black
canvas. User messages have content-sized charcoal bubbles with soft corners.

The sidebar searches real teammates and groups by name and role independently
of conversation search. Role subtitles use specialization or personality, with
“Your thoughtful teammate” as the fallback. Provider/model selection belongs in
agent settings and workspace details. Bottom controls open Settings, Workspace,
and Add a teammate; “On this Mac” is a status, not an inert navigation button.

The composer uses one roughly 54 px input row for attachments, text, stop, and
send. Replies and selected attachments sit above that row; multiline drafts grow
up to the existing height limit. Keep unavailable voice controls and model IDs
out of the composer. Form controls stay around 40–42 px. Use Lucide icons and
accessible Solid-compatible Kobalte controls; do not migrate to React.

Secondary Reply, Copy, and React text actions appear on hover/focus, with saved
reaction chips visible. Preserve the keyboard-operable reaction picker, clear
copy feedback, and stable action spacing. Date labels reflect real message dates.
Agent names, roles, timestamps and activity use a clear hierarchy. Sanitized
Markdown supports readable prose, code and lists. Streaming updates preserve
stable rows, follow the bottom only while the user is there, and offer a visible
return-to-latest action. Motion is brief and respects reduced motion.

Provider setup downloads run in the background with a small bottom-right pill
showing real progress and retry state. Speech model downloads are removed. Voice
input requires supported provider subscription access and a microphone grant;
all assistant replies are text. Preserve every connected feature while changing
presentation. Build and functional checks do not establish visual fidelity;
visual QA is excluded unless the user explicitly requests it.
