import AppKit

extension AppModel {
    var canStartWorkspaceTask: Bool {
        !agent.isRunning && !voice.active && !meetings.active && !onboarding.isPresented
    }
    func projectItems(_ projectID: UUID?) -> [LibraryItem] {
        projectID.map { workspace.items(in: $0, library: library) } ?? library.activeItems
    }
    func assign(_ item: LibraryItem, projectID: UUID?) {
        guard canOrganizeLibrary else {
            notice = "Finish the current work before changing projects."
            return
        }
        if workspace.assign(item, to: projectID) {
            for item in library.items { item.threadID = nil }
            library.save()
        }
    }
    func newProjectNote(_ projectID: UUID) {
        let item = library.create(.thought, title: "Untitled note")
        if workspace.assign(item, to: projectID) { openItem(item) }
    }
    @discardableResult func runWithSources(
        title: String, prompt: String, sources: [SourceReference],
        projectID: UUID? = nil, extra: String = "", retrievalScope: String? = nil,
        displayPrompt: String? = nil,
        completion: ((String) -> Void)? = nil
    ) -> LibraryItem? {
        guard canStartWorkspaceTask else {
            notice = "Finish the current recording or AI task first."
            return nil
        }
        let item = library.create(.conversation, title: title)
        if let projectID, !workspace.assign(item, to: projectID) { return nil }
        if let retrievalScope, !workspace.update({ $0.scopes[item.id.uuidString] = retrievalScope }) {
            return nil
        }
        contextSources[item.id] = sources
        openItem(item)
        let context = LibraryContext.citationRule + "\n" + extra + "\n\n" + LibraryContext.prompt(sources)
        agent.send(prompt, to: item, context: context, displayPrompt: displayPrompt, completion: completion)
        return item
    }
    func askLibrary(_ query: String, projectID: UUID?) {
        let query = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return }
        let sources = LibraryContext.retrieve(
            query, documents: LibraryContext.documents(projectItems(projectID)))
        guard !sources.isEmpty else {
            notice = "No matching passages in this scope. Try a name, topic, or phrase from your notes."
            return
        }
        runWithSources(
            title: String(query.prefix(70)), prompt: query, sources: sources, projectID: projectID,
            retrievalScope: projectID?.uuidString ?? "all")
    }
    func suggestTasks(from item: LibraryItem) {
        guard !item.isArchived, canStartWorkspaceTask else {
            notice = "Finish the current work first."
            return
        }
        let sources = LibraryContext.retrieve(
            "", documents: LibraryContext.documents([item]), limit: 40, requireMatch: false)
        guard !sources.isEmpty else {
            notice = "Add notes or a conversation before looking for commitments."
            return
        }
        let projectID = workspace.project(for: item)?.id
        let prompt = """
            Extract explicit commitments or action items from the supplied excerpts. Do not create tasks for hypothetical suggestions or facts. Return only JSON:
            {"tasks":[{"title":"action","source_id":"exact Source ID","quote":"exact supporting substring from that source","owner":null,"due_date":null}]}
            Use an explicitly named owner only; otherwise null. due_date must be YYYY-MM-DD only if an absolute date is explicit and unambiguous in the source; leave relative dates null. No invented owners or deadlines. Return {"tasks":[]} when none exist. At most 30 tasks. These are suggestions for user review, not accepted commitments.
            """
        var resultItem: LibraryItem?
        resultItem = runWithSources(
            title: "Suggested tasks · \(item.title)", prompt: prompt, sources: sources,
            projectID: projectID,
            extra: "For this extraction, output the requested JSON instead of inline citations.",
            displayPrompt: "Find explicit commitments in \(item.title) for me to review."
        ) { [weak self] text in
            guard let self, library.activeItems.contains(where: { $0.id == item.id }) else { return }
            do {
                let suggestions = try TaskExtraction.parse(text, sources: sources, projectID: projectID)
                var added = 0
                let saved = workspace.update { data in
                    for task in suggestions {
                        let duplicate = data.tasks.contains {
                            $0.source?.itemID == task.source?.itemID
                                && $0.source?.excerpt == task.source?.excerpt
                                && $0.title.lowercased() == task.title.lowercased()
                        }
                        if !duplicate {
                            data.tasks.append(task)
                            added += 1
                        }
                    }
                }
                if let resultItem,
                    let response = resultItem.orderedMessages.last(where: { $0.role == "assistant" })
                {
                    response.text =
                        suggestions.isEmpty
                        ? "No supported commitments found in the selected excerpts."
                        : suggestions.map { "- " + $0.title }.joined(separator: "\n")
                            + "\n\nReview the source, owner, and due date in Tasks → Review before accepting."
                    library.changed(resultItem, immediately: true)
                }
                if saved {
                    notice =
                        added == 0
                        ? "No new supported commitments found in the selected excerpts."
                        : "\(added) suggestions are ready in Tasks → Review. Check the source, owner and date before accepting."
                }
            } catch {
                notice = "Toby could not read the task suggestions. Try Find commitments again."
                if let resultItem,
                    let response = resultItem.orderedMessages.last(where: { $0.role == "assistant" })
                {
                    response.text =
                        "Task extraction could not be read. No suggestions were added. Try Find commitments again."
                    library.changed(resultItem, immediately: true)
                }
            }
        }
    }
    func runWorkflow(_ workflow: TobyWorkflow, itemID: UUID?, projectID: UUID?) {
        let items = itemID.map { id in library.activeItems.filter { $0.id == id } } ?? projectItems(projectID)
        let sources = LibraryContext.retrieve(
            workflow.instruction, documents: LibraryContext.documents(items), limit: 20, requireMatch: false)
        guard !sources.isEmpty else {
            notice = "Choose a note or project with content first."
            return
        }
        runWithSources(
            title: workflow.name, prompt: workflow.instruction, sources: sources,
            projectID: projectID,
            extra: "Produce a draft only. Do not send messages, publish, or change external accounts.")
    }
    func prepareMeeting(_ entry: CalendarEntry, projectID: UUID? = nil) {
        let related = LibraryContext.retrieve(
            entry.title, documents: LibraryContext.documents(projectItems(projectID)))
        let tasks = workspace.visibleTasks(library: library).filter {
            $0.status == .open && (projectID == nil || $0.projectID == projectID)
                && (projectID != nil
                    || !LibraryContext.words($0.title).isDisjoint(with: LibraryContext.words(entry.title)))
        }
        let taskSources = tasks.prefix(20).compactMap(\.source)
        let evidence =
            related + taskSources.filter { source in !related.contains(where: { $0.id == source.id }) }
        let taskText = tasks.prefix(20).map { task in
            "\(task.title) | owner: \(task.owner.isEmpty ? "unspecified" : task.owner) | due: \(task.due?.formatted(date: .abbreviated, time: .omitted) ?? "unspecified")"
        }.joined(separator: "\n")
        let details =
            "Event: \(entry.title)\nWhen: \(entry.start.formatted())\nCalendar: \(entry.calendarName)\nAccount: \(entry.account)\nOrganizer: \(entry.organizer ?? "Unknown")\nDescription: \(entry.details ?? "None")\nOpen user-approved tasks:\n\(taskText)"
        let item = runWithSources(
            title: "Prepare · \(entry.title)",
            prompt:
                "Prepare a concise meeting brief: relevant previous decisions, outstanding commitments, and questions to ask. Cite previous notes. Mark suggested questions as suggestions. If no previous notes match, say so and use only the event details. Do not invent a relationship between similarly named events.",
            sources: evidence, projectID: projectID, extra: details)
        if let item {
            item.calendarOccurrenceKey = entry.occurrenceKey
            library.changed(item, immediately: true)
        }
    }
    func dailyBrief() {
        let now = Date()
        let tomorrow =
            Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: now)) ?? now
        let entries = schedule.agenda.filter { $0.start < tomorrow && $0.end > now }
        let tasks = workspace.visibleTasks(library: library).filter {
            $0.status == .open && $0.due.map { $0 < tomorrow } == true
        }
        let sources = tasks.compactMap(\.source)
        let agenda = entries.prefix(30).map {
            "\($0.start.formatted(date: .omitted, time: .shortened)) · \($0.title) · \($0.account)"
        }.joined(separator: "\n")
        let commitments = tasks.prefix(50).map {
            "\($0.title) · owner: \($0.owner.isEmpty ? "unspecified" : $0.owner) · due: \($0.due?.formatted(date: .abbreviated, time: .omitted) ?? "unspecified")"
        }.joined(separator: "\n")
        runWithSources(
            title: "Daily brief · \(now.formatted(date: .abbreviated, time: .omitted))",
            prompt:
                "Write a short daily brief from the provided calendar and accepted tasks. Separate overdue items from today's commitments, mention upcoming meetings, and suggest a realistic order. Do not invent meetings or claim that calendar data is complete. Cite task sources where available.",
            sources: Array(sources.prefix(20)),
            extra:
                "Today: \(now.formatted())\nCalendar snapshot:\n\(agenda)\nOpen commitments due by today:\n\(commitments)"
        )
    }
}
