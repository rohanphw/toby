# Toby-owned Google Calendar sign-in

Users choose **Settings → Calendars → Connect Google**, authorize Toby in their browser and select calendars. They can add multiple Google accounts. Users never create Cloud projects, import client JSON or manage OAuth credentials.

## Maintainer setup

The maintainer creates one Google Cloud project, enables the Calendar, Drive and Google Picker APIs, configures the OAuth app’s branding/audience and creates a **Desktop app** OAuth client. For personal testing, add the intended accounts as test users. Request OpenID/email identity plus `calendar.calendarlist.readonly` , `calendar.events.readonly` and `drive.file`. The app cannot write calendar events.

Download the Desktop client JSON. Keep it outside Git. To package:

```sh
GOOGLE_OAUTH_CLIENT_FILE=/absolute/path/to/downloaded-client.json scripts/build-app.sh
```

Alternatively keep it in ignored `.local/GoogleOAuthClient.json`. The build validates the client type and embeds the configuration in `Toby.app/Contents/Resources/GoogleOAuthClient.json` before signing. Packaging fails if it is missing; `swift build` remains available without the configuration. Installed/native OAuth clients are public clients, so an embedded desktop client secret is not treated as a confidential server credential. Per-user access/refresh tokens remain in Keychain and are never bundled. Do not bundle a Web client, service-account key or user token file.

This is Toby’s own configuration, shared by its users, not per-user setup. Google’s External Testing mode allows only listed test users and Calendar refresh tokens normally expire after seven days. Before general distribution, complete the applicable OAuth publishing/verification work; organization administrators can separately restrict access. Publishing the Mac app does not perform Google verification.

## Runtime

The flow uses the system browser, random PKCE verifier/state and a three-minute random-port loopback callback bound to `127.0.0.1`. No browser-cookie extraction or service account. Multiple calendars/accounts, paginated lists, recurring instances, cancellation, reconnect and per-calendar selection are supported. Google events refresh about every two minutes; upcoming event data is kept in memory. Account labels/selections persist locally.

Calendar calls are combined with optional EventKit calendars by conference URL/start. Unchecking a Google calendar does not remove its separately synced Mac copy. Disable Include Mac calendars to use only direct Google connections. The seven-day agenda includes all-day and non-call events. Cancelled and personally declined events are excluded; reminders still use timed calls in the next 24 hours. Disconnect deletes the local account token; revoke the server grant separately in Google Account connections.

## Sources

- [Desktop OAuth](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Token expiration](https://developers.google.com/identity/protocols/oauth2#expiration)
- [Calendar lists](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list)
- [Event lists](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)

No live sign-in or account access was tested by the agent. The local 0.9.0 bundle includes the supplied application client; browser consent and multi-account access still require user validation.

## Drive (0.9.0)

Existing users choose **Enable Drive** on each account to grant the new permission. Declining Drive leaves Calendar connected. The app checks actual granted scopes before saving.

Inside an item, expand **Google Drive**, choose an account and **Add from Drive**. The native desktop Picker opens in the browser using `trigger_onepick=true`, a drive.file-only scope, PKCE and the existing loopback callback. Enable [Google Picker API](https://console.cloud.google.com/apis/library/picker.googleapis.com) in the same Cloud project first; no extra API key or Web OAuth client is needed. Picker tokens are temporary and never replace Calendar tokens. Toby verifies the returned Drive email against the selected account. Selected regular files become local attachments; Docs export as text, Sheets as XLSX, Slides as PDF. Attachments are capped at 20 MB; Google may impose smaller export limits. Imported files are snapshots, not live sync. Once attached, files are available to the chosen CLI when the user sends a request.

**Save as Google Doc** creates a new plain-text Google document from the note body or generated meeting notes. If notes do not exist, the action explicitly says **Save transcript as Google Doc**. It does not upload audio or conversation messages. Each click creates a new copy; there is no automatic write retry. Ambiguous failures ask users to check Drive before creating another copy. Documents are limited to 5 MB and saved in the selected account's Drive root.

**Remove account** removes Toby's local Keychain credentials, calendar selections and cached events, and cancels pending Drive operations. It preserves already imported files, captured notes and Google documents. A write already accepted by Google cannot be undone by disconnecting. Google-side revocation remains available in Google Account connections. Mac-synced copies remain if Include Mac calendars is enabled.

References: [native desktop Picker](https://developers.google.com/workspace/drive/picker/guides/desktop-mobile-picker), [Drive uploads](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [export formats](https://developers.google.com/workspace/drive/api/guides/ref-export-formats).
