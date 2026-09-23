import SwiftUI

struct WorkflowsView: View {
    let model: AppModel
    @State private var editing: TobyWorkflow?
    @State private var projectID: UUID?
    @State private var itemID: UUID?
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            HStack {
                Text("Your way of working.").font(Theme.heading(32))
                Spacer()
                Button("New workflow") { editing = TobyWorkflow(name: "", instruction: "") }.buttonStyle(
                    QuietButtonStyle())
            }
            Text(
                "Save a useful instruction, choose its context, and run it again. Results are drafts in a new conversation."
            )
            .foregroundStyle(Theme.secondary)
            HStack {
                ProjectPicker(model: model, selection: $projectID, emptyLabel: "All active items")
                Picker("Context", selection: $itemID) {
                    Text(projectID == nil ? "Choose an item" : "Entire project").tag(nil as UUID?)
                    ForEach(model.projectItems(projectID)) { Text($0.title).tag(Optional($0.id)) }
                }
            }
            .onChange(of: projectID) { _, _ in itemID = nil }
            if let editing {
                WorkflowEditor(workflow: editing) { workflow in
                    if model.workspace.update({ data in
                        if let index = data.workflows.firstIndex(where: { $0.id == workflow.id }) {
                            data.workflows[index] = workflow
                        } else {
                            data.workflows.append(workflow)
                        }
                    }) {
                        self.editing = nil
                    }
                } cancel: {
                    self.editing = nil
                }.id(editing.id)
            }
            ForEach(model.workspace.data.workflows) { workflow in
                VStack(alignment: .leading, spacing: 14) {
                    Text(workflow.name).font(Theme.heading(20))
                    Text(workflow.instruction).font(Theme.body).foregroundStyle(Theme.secondary)
                    HStack {
                        Button("Run workflow") {
                            model.runWorkflow(workflow, itemID: itemID, projectID: projectID)
                        }
                        .disabled(!model.canStartWorkspaceTask || (itemID == nil && projectID == nil))
                        Button("Edit") { editing = workflow }
                        Spacer()
                        Button("Delete", role: .destructive) {
                            model.workspace.update { $0.workflows.removeAll { $0.id == workflow.id } }
                        }
                    }.buttonStyle(QuietButtonStyle())
                }.surface()
            }
            if model.workspace.data.workflows.isEmpty {
                Text("Create a workflow with the instructions you want to reuse.").foregroundStyle(
                    Theme.secondary)
            }
        }
    }
}

private struct WorkflowEditor: View {
    @State var workflow: TobyWorkflow
    let save: (TobyWorkflow) -> Void
    let cancel: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            TextField("Workflow name", text: $workflow.name)
            TextEditor(text: $workflow.instruction).scrollContentBackground(.hidden).frame(minHeight: 120)
            Text(
                "Describe the result you want. Toby supplies the selected context and saves the response as a draft."
            ).font(Theme.caption).foregroundStyle(Theme.secondary)
            HStack {
                Button("Cancel", action: cancel)
                Button("Save workflow") {
                    workflow.name = workflow.name.trimmingCharacters(in: .whitespacesAndNewlines)
                    save(workflow)
                }.disabled(
                    workflow.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        || workflow.instruction.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }.buttonStyle(QuietButtonStyle())
        }.surface()
    }
}
