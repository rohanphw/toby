# Voice input

Voice input is unavailable in the current Toby release. The composer shows a disabled microphone
control, and all assistant replies are text.

Toby's provider integrations use existing subscriptions. No supported
subscription-backed transcription route has been integrated. Successful text
sign-in does not establish audio capability, and Toby does not use a separately
billed speech API as a fallback.

The application has no active microphone capture flow, local speech-model download,
transcription worker, audio upload, speech synthesis or playback. The voice service
returns an unavailable state and rejects transcription requests. Legacy voice types
and permission declarations do not indicate a working voice feature.

A future implementation would need a supported subscription authentication path,
verified transcription behavior, cancellation and permission handling. No delivery
date or language coverage is promised.
