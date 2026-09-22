# Toby-owned Google Calendar sign-in

Users choose **Settings → Calendars → Connect Google**, authorize Toby in their browser and select calendars. They can add multiple Google accounts. Users never create Cloud projects, import client JSON or manage OAuth credentials.

## Maintainer setup (pending for 0.8.0)

The maintainer creates one Google Cloud project, enables the Calendar API, configures the OAuth app’s branding/audience and creates a **Desktop app** OAuth client. For personal testing, add the intended accounts as test users. Request OpenID/email identity plus `calendar.calendarlist.readonly` and `calendar.events.readonly`. The app cannot write calendar events.

Download the Desktop client JSON. Keep it outside Git. To package:

```sh
GOOGLE_OAUTH_CLIENT_FILE=/absolute/path/to/downloaded-client.json scripts/build-app.sh
```

Alternatively keep it in ignored `.local/GoogleOAuthClient.json`. The build validates the client type and embeds the configuration in `Toby.app/Contents/Resources/GoogleOAuthClient.json` before signing. Packaging fails if it is missing; `swift build` remains available without the configuration. Installed/native OAuth clients are public clients, so an embedded desktop client secret is not treated as a confidential server credential. Per-user access/refresh tokens remain in Keychain and are never bundled. Do not bundle a Web client, service-account key or user token file.

This is Toby’s own configuration, shared by its users, not per-user setup. Google’s External Testing mode allows only listed test users and Calendar refresh tokens normally expire after seven days. Before general distribution, complete the applicable OAuth publishing/verification work; organization administrators can separately restrict access. Publishing the Mac app does not perform Google verification.

## Runtime

The flow uses the system browser, random PKCE verifier/state and a three-minute random-port loopback callback bound to `127.0.0.1`. No browser-cookie extraction or service account. Multiple calendars/accounts, paginated lists, recurring instances, cancellation, reconnect and per-calendar selection are supported. Google events refresh about every two minutes; upcoming event data is kept in memory. Account labels/selections persist locally.

Calendar calls are combined with optional EventKit calendars by conference URL/start. Unchecking a Google calendar does not remove its separately synced Mac copy. Disable Include Mac calendars to use only direct Google connections. Cancelled, all-day and personally declined events are excluded. Disconnect deletes the local account token; revoke the server grant separately in Google Account connections.

## Sources

- [Desktop OAuth](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Token expiration](https://developers.google.com/identity/protocols/oauth2#expiration)
- [Calendar lists](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list)
- [Event lists](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)

No live sign-in or account access was tested by the agent. Configure the application client before final packaging.
