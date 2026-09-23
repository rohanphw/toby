# Toby workspace rollout · v0.11.0

Version 0.11.0 adds the Mac features below. iPhone support and sync are excluded. Runtime validation limits are documented below.

## Use the features

- **Projects:** Open Projects, create a project, and add existing notes, conversations or meetings. Items belong to one project at a time. You can also assign a project in an item's header. Project context is included in normal questions; removing a project preserves its items and tasks.
- **Ask your library:** Use the box on Home or within a project. Include a useful topic, name, or phrase. Toby searches locally and sends a bounded set of matching passages to the selected provider. Expand Sources supplied under an answer to inspect the excerpts and open originals. Follow-ups search again. No-match results ask for a more specific query.
- **Commitments:** Open a note, conversation or meeting and choose Find commitments. Go to Tasks → Review, inspect the supporting quote, correct the owner or date, and accept. Suggested tasks do not appear as open commitments until accepted. Add tasks manually, complete/reopen them, or dismiss them. A due date also brings the task into the daily overview when due.
- **Meeting preparation:** In Calendar, use Prepare → Find related notes or choose a project. Toby combines the event, matching notes, and relevant accepted tasks in a sourced preparation conversation. Review relevance, especially for generic meeting titles.
- **Daily brief:** Home shows upcoming events and due/overdue accepted tasks. Write my brief creates a written synthesis through the selected provider. Calendar errors remain visible; an empty snapshot does not prove a calendar is empty. The overview refreshes while Toby is open and does not send notifications when the app is closed.
- **Workflows:** Choose an item or project in Workflows, then run a built-in or custom instruction. Edit or create instructions inline. Outputs are saved in new conversations as drafts. Individual items also have a Run workflow menu.
- **Quick capture:** Press Control–Option–C or choose Quick capture from the menu bar. Type, explicitly paste clipboard contents, attach a file, choose a project, or Dictate → Finish dictation. Save & close leaves the note in your library. Selected text/files can be sent through another app's Services → Capture in Toby. Install the bundle in Applications; macOS may need a relaunch before registering Services. You can assign a Services keyboard shortcut in System Settings. Support depends on the sending app. A conflicting global shortcut reports a notice; menu and Services entry points remain available.

## Boundaries

The new records live locally in Workspace.json, beside the existing SwiftData library. There is no migration of the old Toby app. AI features require your configured CLI and provider account; local projects, manual tasks, capture, and workflow editing do not. Shared context is explicit app-supplied excerpts, not access to every workspace directory.

Retrieval matches words, not semantic embeddings. It does not promise to find every relevant note or read binary attachments automatically. Task extraction is also bounded and can miss commitments. Quotes establish provenance, not proof that an AI interpretation is correct. Review before accepting. Generated briefs and workflow outputs require judgment.

Archiving excludes an item from retrieval and hides its linked tasks/source excerpts. Restoring makes them available again. Deleting removes linked tasks, membership and stored source quotations. Existing generated text in another conversation, exports, and provider history remain subject to the existing deletion limitations.

## Validation

Completed by the agent: release compilation, test-target compilation, static inspection, and bundle metadata checks. No app launch, runtime test execution, browser interaction, or visual QA is performed under this repository's instructions.

Before publishing, manually verify:

1. Upgrade from v0.10.1 with a backup. Existing notes, conversations, recordings, account connections and remembered items remain intact. Restart after each new record type is saved.
2. Create/edit/remove a project, move items between projects, and use Back/Forward across project and item views. Removal preserves content. Confirm membership controls are locked during active work.
3. Ask about a distinctive phrase beyond a long note's first page. Inspect [S1] and [S2] against originals. Ask a follow-up, then archive/delete a source and retry. No fresh context includes the withdrawn source; old citation positions do not shift.
4. Extract tasks from explicit commitments and from a note with none. Reject fabricated quotes, review unknown owners/dates, accept/edit/dismiss/complete/reopen, and repeat extraction without duplicates. Archive/restore/delete the source and check the linked tasks.
5. Prepare a meeting with and without matching notes, with a selected project, and with multiple Google accounts. The account and event remain correct; absence of history is acknowledged.
6. Check the brief across midnight, overdue dates, all-day events and calendar sync errors. Manual task completion updates the overview. No unaccepted suggestion appears as a commitment.
7. Create/edit/delete a workflow and run it on an item and a project. Stop a run or disconnect the CLI; no task is marked complete and the source content remains untouched.
8. Capture from the global shortcut and Services in Safari, TextEdit and Finder. Verify text, URL and file handling, unsupported input notices, and denied file access. Inspect that clipboard contents are never read on opening capture alone.
9. Dictate with permission granted/denied. Finish appends once to the note and never starts an AI task. Close/quit mid-dictation, verify saved content on relaunch, then verify normal Talk still sends utterances and replies in text.
10. Check drawers, narrow window navigation, keyboard access and VoiceOver. Verify that existing provider approvals and recording flows still work. Test disk-write failure with an isolated test library, never the real user library.
