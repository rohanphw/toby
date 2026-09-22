# Toby design language

## Scene and direction

A personal Mac workspace for thinking between calls and returning to unfinished ideas in the evening. Flat black surfaces, restrained solid borders and soft native typography give Toby a distinct personal Mac identity. The original Toby logo sits immediately left of the header wordmark.

## Palette

Neutral black canvas #000000, surfaces around #0E0E0E, drawer #131313, text #F5F5F5, secondary #A3A3A3, silver-blue accent #D4E0F0. No gradients anywhere, including background, surface borders or hover states. Use solid black/neutral fills and thin solid borders. The header logo is 48 points.

## Type

Use one native SF family throughout; semibold for headings and titles, regular for prose, medium for controls. No serif display headings, uppercase letterspaced labels or monospaced decorative shortcuts. Home hero 36, onboarding/page titles 30–32, item titles 28, section headings 18–20, row titles 15, body 14–16, metadata 12–13. Body columns capped around 760 points.

## Layout

Top navigation uses a larger logo next to Toby. Provider selection uses custom segments; models use a searchable custom list. Search fields have custom solid backgrounds, focus borders and clear actions. Home has a clear voice entry, an understated writing input, and a chronological shelf of actual work. Notes and meetings use grouped rows rather than a repeated card grid. Thread content is readable, left-aligned and centered within the available page.

## Voice

Talk opens a new thread in the workspace. An inline capture surface expands with a short fade/translation and real audio-level animation. Mic status, recognized words, Send now and End voice are together. Replies always appear in text. The microphone returns after a completed answer, until End voice. An active capture remains accessible when browsing other pages.

## Settings and recording

Settings slide in from the right with no dimming scrim and no separate window. Existing workspace state remains in place. Automatic-recording consent is inline in that drawer. Meeting recording stays on its thread page with persistent controls. macOS permission dialogs remain system-managed.

## Motion and interactions

220–280ms ease-out transitions, no spring bounce. Voice opening animates once per capture start; wave activity follows microphone input. Reduced Motion removes movement and continuous waveform animation. Buttons have visible hover, press, focus and disabled states. Native controls handle keyboard focus.

## First-launch setup

A full in-app page uses the existing flat black surfaces, logo and consistent SF typography. Three numbered steps cover voice, files and providers; a fixed footer offers Back, Continue/Finish and Skip, with an explicit dismiss control in the header. Each permission has a plain-language purpose and current status. Provider setup links sit beside actionable login/recheck controls. No app-owned onboarding modal or new window is used.

## Semantic states and hierarchy

Success uses green (#5ED194) with a check icon; failure or denied/restricted access uses red (#FA666E) with a cross; unresolved choices, missing decisions and deferred optional access use yellow (#F0C24F) with an attention icon. Loading stays neutral. No state relies solely on color. Provider errors and failed task messages are red; user interruption is yellow.

A light solid primary button identifies the main next action; secondary actions use quiet dark controls, tertiary details use text buttons. Successful permissions replace disabled controls with a green state. Connected providers show a concise status; executable paths and repair controls live under Connection details.

Use one purposeful writing surface on Home, with model controls inside it. Onboarding permissions and providers use aligned sections, not repetitive rounded cards. Conversations use open prose and role labels, reserving a surface for the composer. Borders remain subtle and solid; no gradients.
