import SwiftUI

struct ProjectsView: View {
    @Bindable var model: AppModel
    @State private var editing: TobyProject?
    @State private var managing = false
    @State private var removing = false
    private var project: TobyProject? {
        model.workspace.data.projects.first { $0.id == model.selectedProjectID }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            HStack {
                Text(project?.name ?? "Projects").font(Theme.heading(32))
                Spacer()
                if let project {
                    Button("All projects") { model.openProject(nil) }
                    Button("Edit") { editing = project }
                } else {
                    Button("New project") { editing = TobyProject(name: "") }
                }
            }.buttonStyle(QuietButtonStyle())
            if let editing {
                ProjectEditor(project: editing) { project in
                    let saved = model.workspace.update { data in
                        if let index = data.projects.firstIndex(where: { $0.id == project.id }) {
                            data.projects[index] = project
                        } else {
                            data.projects.append(project)
                        }
                    }
                    if saved {
                        self.editing = nil
                        model.openProject(project.id)
                    }
                } cancel: {
                    self.editing = nil
                }
                .id(editing.id)
            }
            if let project {
                if !project.detail.isEmpty { Text(project.detail).foregroundStyle(Theme.secondary) }
                AskLibraryBox(model: model, projectID: project.id)
                HStack {
                    Button("New note") { model.newProjectNote(project.id) }
                    Button(managing ? "Done organizing" : "Add existing items") { managing.toggle() }
                    Spacer()
                    Button("Remove project") { removing.toggle() }.foregroundStyle(Theme.secondary)
                }.buttonStyle(QuietButtonStyle()).disabled(!model.canOrganizeLibrary)
                if removing {
                    HStack {
                        Text("Remove this project? Notes and tasks will stay in your library.").font(
                            Theme.caption)
                        Button("Cancel") { removing = false }
                        Button("Remove", role: .destructive) {
                            if model.workspace.removeProject(project.id) {
                                model.openProject(nil)
                                removing = false
                                for item in model.library.items { item.threadID = nil }
                                model.library.save()
                            }
                        }
                    }.surface()
                }
                if managing { ProjectMembership(model: model, project: project) }
                let items = model.workspace.items(in: project.id, library: model.library)
                if items.isEmpty {
                    Text("Add a note, conversation, or meeting to give this project context.")
                        .foregroundStyle(Theme.secondary)
                }
                ForEach(items.sorted { $0.updatedAt > $1.updatedAt }) { item in
                    LibraryRow(model: model, item: item) { model.openItem(item) }
                }
                let tasks = model.workspace.visibleTasks(library: model.library).filter {
                    $0.projectID == project.id && $0.status == .open
                }
                if !tasks.isEmpty {
                    Text("Open commitments").font(Theme.heading(20))
                    ForEach(tasks) { task in TaskRow(model: model, task: task) }
                }
            } else {
                Text("Keep related notes, conversations, meetings, and commitments together.")
                    .foregroundStyle(Theme.secondary)
                if model.workspace.data.projects.isEmpty {
                    Text("Create your first project to start building shared context.").padding(.vertical, 24)
                }
                ForEach(model.workspace.data.projects) { project in
                    Button {
                        model.openProject(project.id)
                    } label: {
                        HStack {
                            Image(systemName: "folder")
                            VStack(alignment: .leading, spacing: 6) {
                                Text(project.name).font(Theme.heading(20))
                                Text(
                                    project.detail.isEmpty
                                        ? "\(model.workspace.items(in: project.id, library: model.library).count) items"
                                        : project.detail
                                )
                                .font(Theme.caption).foregroundStyle(Theme.secondary).lineLimit(2)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                        }.surface()
                    }.buttonStyle(.plain)
                }
            }
        }
        .onChange(of: model.selectedProjectID) { _, _ in
            managing = false
            removing = false
        }
    }
}

private struct ProjectEditor: View {
    @State var project: TobyProject
    let save: (TobyProject) -> Void
    let cancel: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            TextField("Project name", text: $project.name).textFieldStyle(.roundedBorder)
            TextField("What are you working toward?", text: $project.detail, axis: .vertical).lineLimit(2...5)
            HStack {
                Button("Cancel", action: cancel)
                Button("Save project") {
                    project.name = project.name.trimmingCharacters(in: .whitespacesAndNewlines)
                    save(project)
                }.disabled(project.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }.buttonStyle(QuietButtonStyle())
        }.surface()
    }
}

private struct ProjectMembership: View {
    let model: AppModel
    let project: TobyProject
    @State private var search = ""
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            TextField("Find items to add…", text: $search)
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 12) {
                    ForEach(
                        model.library.activeItems.filter {
                            search.isEmpty || $0.title.localizedCaseInsensitiveContains(search)
                        }
                    ) { item in
                        Toggle(
                            isOn: Binding(
                                get: { model.workspace.project(for: item)?.id == project.id },
                                set: { model.assign(item, projectID: $0 ? project.id : nil) })
                        ) {
                            VStack(alignment: .leading) {
                                Text(item.title)
                                if let current = model.workspace.project(for: item), current.id != project.id
                                {
                                    Text("Move from \(current.name)").font(Theme.caption).foregroundStyle(
                                        Theme.secondary)
                                }
                            }
                        }
                    }
                }
            }.frame(maxHeight: 260)
        }.surface()
    }
}

struct AskLibraryBox: View {
    let model: AppModel
    var projectID: UUID? = nil
    @State private var query = ""
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(projectID == nil ? "Ask your library" : "Ask this project", systemImage: "books.vertical")
                .font(Theme.label)
            HStack {
                TextField("What did we decide about…", text: $query, axis: .vertical).textFieldStyle(.plain)
                    .lineLimit(1...4)
                Button("Find an answer") { model.askLibrary(query, projectID: projectID) }
                    .buttonStyle(QuietButtonStyle()).disabled(
                        query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            || !model.canStartWorkspaceTask)
            }
            Text(
                "Searches active notes and conversations locally, then sends matching excerpts to your selected provider. Answers include sources."
            )
            .font(Theme.caption).foregroundStyle(Theme.secondary)
        }.surface()
    }
}
