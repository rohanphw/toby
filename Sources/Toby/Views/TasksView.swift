import SwiftUI

struct TasksView: View {
    let model: AppModel
    @State private var filter: TobyTask.Status = .open
    @State private var projectID: UUID?
    @State private var adding = false
    private var tasks: [TobyTask] {
        model.workspace.visibleTasks(library: model.library)
            .filter { $0.status == filter && (projectID == nil || $0.projectID == projectID) }
            .sorted { ($0.due ?? .distantFuture, $0.createdAt) < ($1.due ?? .distantFuture, $1.createdAt) }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            HStack {
                Text("Commitments, kept.").font(Theme.heading(32))
                Spacer()
                Button("New task") { adding.toggle() }.buttonStyle(QuietButtonStyle())
            }
            Text("Review suggested actions before adding them. Keep the source beside the commitment.")
                .foregroundStyle(Theme.secondary)
            HStack {
                Picker("Show", selection: $filter) {
                    Text("Open").tag(TobyTask.Status.open)
                    Text("Review").tag(TobyTask.Status.suggested)
                    Text("Completed").tag(TobyTask.Status.done)
                    Text("Dismissed").tag(TobyTask.Status.dismissed)
                }.pickerStyle(.segmented)
                ProjectPicker(model: model, selection: $projectID, emptyLabel: "All projects")
            }
            if adding {
                TaskEditor(model: model, task: TobyTask(title: "", projectID: projectID)) { adding = false }
            }
            if tasks.isEmpty {
                Text(
                    filter == .suggested
                        ? "No suggestions to review. Open a note or meeting and choose Find commitments."
                        : "Nothing here yet."
                )
                .foregroundStyle(Theme.secondary).padding(.vertical, 24)
            }
            ForEach(tasks) { task in TaskRow(model: model, task: task) }
        }
    }
}

struct ProjectPicker: View {
    let model: AppModel
    @Binding var selection: UUID?
    var emptyLabel = "No project"
    var body: some View {
        Picker("Project", selection: $selection) {
            Text(emptyLabel).tag(nil as UUID?)
            ForEach(model.workspace.data.projects) { Text($0.name).tag(Optional($0.id)) }
        }.labelsHidden().frame(maxWidth: 230)
            .onChange(of: model.workspace.data.projects.map(\.id)) { _, ids in
                if let selection, !ids.contains(selection) { self.selection = nil }
            }
    }
}

struct TaskRow: View {
    let model: AppModel
    let task: TobyTask
    @State private var editing = false
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if editing {
                TaskEditor(model: model, task: task) { editing = false }.id(task.id)
            } else {
                HStack(alignment: .top, spacing: 12) {
                    if task.status == .open || task.status == .done {
                        Button {
                            var changed = task
                            changed.status = task.status == .done ? .open : .done
                            changed.completedAt = changed.status == .done ? .now : nil
                            model.workspace.saveTask(changed)
                        } label: {
                            Image(systemName: task.status == .done ? "checkmark.circle.fill" : "circle")
                        }
                        .buttonStyle(.plain).accessibilityLabel(
                            task.status == .done ? "Reopen task" : "Complete task")
                    }
                    VStack(alignment: .leading, spacing: 5) {
                        Text(task.title).font(Theme.label).strikethrough(task.status == .done)
                        HStack {
                            if !task.owner.isEmpty { Text(task.owner) }
                            if let due = task.due {
                                Text(due, format: .dateTime.month(.abbreviated).day().year())
                                    .foregroundStyle(
                                        task.status == .open && due < Calendar.current.startOfDay(for: .now)
                                            ? Theme.warning : Theme.secondary)
                            }
                            if let project = model.workspace.data.projects.first(where: {
                                $0.id == task.projectID
                            }) {
                                Text(project.name)
                            }
                        }.font(Theme.caption).foregroundStyle(Theme.secondary)
                    }
                    Spacer()
                    Button(task.status == .suggested ? "Review" : "Edit") { editing = true }.buttonStyle(
                        QuietButtonStyle())
                }
                if let source = task.source { SourceLink(model: model, source: source) }
            }
        }.surface()
    }
}

struct TaskEditor: View {
    let model: AppModel
    @State var task: TobyTask
    let done: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            TextField("What needs doing?", text: $task.title, axis: .vertical).lineLimit(1...3)
            TextField("Owner (optional)", text: $task.owner)
            ProjectPicker(model: model, selection: $task.projectID)
            Toggle(
                "Set a due date / bring this back",
                isOn: Binding(get: { task.due != nil }, set: { task.due = $0 ? .now : nil }))
            if task.due != nil {
                DatePicker(
                    "Due", selection: Binding(get: { task.due ?? .now }, set: { task.due = $0 }),
                    displayedComponents: .date)
            }
            if let source = task.source { SourceLink(model: model, source: source) }
            if task.status == .suggested {
                Text("Check the quoted commitment, owner, and date. Nothing is tracked until you accept.")
                    .font(Theme.caption).foregroundStyle(Theme.secondary)
            }
            HStack {
                Button("Cancel", action: done)
                if task.status != .dismissed {
                    Button("Dismiss") {
                        task.status = .dismissed
                        if model.workspace.saveTask(task) { done() }
                    }
                }
                Spacer()
                Button(task.status == .suggested ? "Accept task" : "Save") {
                    task.title = task.title.trimmingCharacters(in: .whitespacesAndNewlines)
                    if task.status == .suggested || task.status == .dismissed { task.status = .open }
                    if task.status == .open { task.completedAt = nil }
                    if model.workspace.saveTask(task) { done() }
                }.disabled(task.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }.buttonStyle(QuietButtonStyle())
        }
    }
}

struct SourceLink: View {
    let model: AppModel
    let source: SourceReference
    var label: String? = nil
    private var item: LibraryItem? { model.library.activeItems.first { $0.id == source.itemID } }
    var body: some View {
        if let item {
            DisclosureGroup(label.map { $0 + " · " + item.title } ?? "Source · \(item.title)") {
                VStack(alignment: .leading, spacing: 10) {
                    Text(source.excerpt).font(Theme.caption).textSelection(.enabled)
                    Text(
                        "Excerpt saved \(source.capturedAt.formatted(date: .abbreviated, time: .shortened)). The original may have changed."
                    )
                    .font(.system(size: 10)).foregroundStyle(Theme.secondary)
                    Button("Open original") { model.openItem(item) }.buttonStyle(QuietButtonStyle())
                }.padding(.top, 8)
            }.font(Theme.caption).foregroundStyle(Theme.secondary)
        } else {
            Text("Source unavailable · archived or deleted").font(Theme.caption).foregroundStyle(
                Theme.secondary)
        }
    }
}
