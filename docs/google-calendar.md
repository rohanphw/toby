# Connect Google Calendar directly to Toby

The integration supports multiple Google accounts, and multiple calendars per account. You do not need to add those accounts to macOS Calendar.

## One-time Google Cloud setup

1. Open [Google Cloud](https://console.cloud.google.com/) and create/select a project for Toby.
2. Enable the [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com).
3. In **Google Auth Platform**, configure Branding and Audience. For a personal External project in Testing, add every Google account you want to connect as a test user.
4. In Data Access, configure the read scopes `calendar.calendarlist.readonly` and `calendar.events.readonly`, plus OpenID/email identity. Toby cannot create, edit or delete calendar events.
5. In Clients, create an OAuth client with application type **Desktop app**. Download its JSON. A Web application client will not work with Toby’s desktop callback.
6. In **Toby → Settings → Meetings → Google connection setup**, choose **Import client JSON…** and select that download. The app stores the configuration in Keychain; do not put it in this repository.
7. Choose **Connect Google account**. Complete Google consent in your default browser, granting both calendar read permissions, then return to Toby.
8. Use **Add another Google account** for additional accounts. Each account lists its calendars with independent checkboxes. Newly discovered calendars are selected by default. Uncheck calendars you don’t want included.

Toby uses Google’s [desktop OAuth flow](https://developers.google.com/identity/protocols/oauth2/native-app), PKCE and a temporary random-port callback bound to `127.0.0.1`. Sign-in can be cancelled and times out after three minutes. Access/refresh tokens stay in the Mac’s Keychain. No service account, browser-cookie extraction, or third-party calendar connector is used.

External OAuth projects in Testing issue refresh tokens that [expire after seven days](https://developers.google.com/identity/protocols/oauth2#expiration). Reconnect when needed. Public distribution requires completing Google’s applicable publishing/verification process; Workspace administrators may also block authorization. This local build does not include a preconfigured Google OAuth project.

## Calendar and prompt behavior

Calendar lists and event lists are paginated. Recurring events are expanded for the next 24 hours; all-day, cancelled and personally declined events are excluded. Supported meeting links: Google Meet, Zoom, Microsoft Teams and Webex. Account/calendar labels and selections persist; upcoming event details are held in memory and refreshed about every two minutes while Toby runs.

Google calls and optional Mac calendar calls are combined by conference host/path and occurrence start time, ignoring tracking queries. Turn off **Also include macOS calendars** if you only want directly connected Google calendars. Deselecting a Google calendar does not deselect its separate Mac-synced copy.

**Show meeting reminders** displays a compact desktop panel roughly one minute before a call (checked every 20 seconds). At launch/wake, calls that started within five minutes are also eligible. The panel expires after 45 seconds. Dismissed/shown occurrences are remembered across relaunch; **In 5 minutes** snoozes until then while Toby stays running. Overlapping calls are offered sequentially. The main workspace does not take focus merely because a reminder appears.

**Join & take notes** opens the meeting link and starts recording in Toby, with normal capture permissions. Joining the browser/native meeting and granting access are still your actions. Finish the recording in Toby. Calendar-based automatic recording remains a separate explicit opt-in and uses the scheduled end time; reminder-started recordings are finished manually.

**Detect possible calls on this Mac** is opt-in. On macOS 14.2+, Toby polls Core Audio process microphone-use metadata every five seconds, waits for sustained activity, and recognizes Zoom, Teams, Webex, FaceTime, Slack and common browser bundle IDs. It prompts once per detected activity session and rearms after a minute without activity. Some helper processes/browsers may not be attributed to their parent app. Muted calls may be missed; dictation or other microphone use may also trigger a prompt. No microphone stream, screen inspection, audio samples or browser contents are read by detection. It cannot detect every meeting or prove attendance.

Prompts are suppressed during onboarding and Toby recording/voice sessions. Calendar/call detection never silently enables recording. Custom panels are not Notification Center alerts: they do not request notification permission or automatically follow Focus settings. Turn off the corresponding reminder settings when unwanted. Toby must be running and the Mac awake.

## Reconnect and disconnect

Each account reports sync failures separately. Revoked/expired access asks you to reconnect; network/API errors retry on the next periodic sync. Failed account sync clears its upcoming events to avoid acting on stale calendars. Choose Refresh for a manual retry.

Disconnect removes the account, its calendar choices and tokens from this Mac. To revoke the server grant too, use [Google account connections](https://myaccount.google.com/connections). Disconnect all accounts before importing a different OAuth client.

## References

- [Google Calendar list](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list)
- [Google events list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)
- [Apple Core Audio input activity](https://developer.apple.com/documentation/coreaudio/audiohardwareprocess/isrunninginput)

Validation for this change is compilation and bundle/static checks only. No Google account was authorized and no popup or meeting was exercised by the agent.
