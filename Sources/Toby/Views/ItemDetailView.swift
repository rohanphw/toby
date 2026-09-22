import SwiftUI

struct ItemDetailView: View {
    let model: AppModel
    @Bindable var item: LibraryItem
    @State private var confirmDelete = false
    @State private var showTranscript = false
    @State private var files: [URL] = []
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            HStack {
                Button {
                    model.goBack()
                } label: {
                    Label("Back", systemImage: "arrow.left")
                }.buttonStyle(.plain).foregroundStyle(Theme.secondary)
                Spacer()
                Button {
                    item.isPinned.toggle()
                    model.library.changed(item, immediately: true)
                } label: {
                    Image(systemName: item.isPinned ? "pin.fill" : "pin")
                }.help(item.isPinned ? "Unpin" : "Pin").accessibilityLabel("Toggle pinned")
                Menu {
                    Button(item.isMemory ? "Stop remembering this" : "Remember this") {
                        item.isMemory.toggle()
                        model.library.changed(item, immediately: true)
                    }
                    Button("Export as Markdown") { model.library.export(item) }
                    Button("Show workspace in Finder") { revealWorkspace() }
                    Divider()
                    Button("Delete", role: .destructive) { confirmDelete = true }.disabled(isBusy)
                } label: {
                    Image(systemName: "ellipsis")
                }.menuStyle(.borderlessButton).fixedSize().accessibilityLabel("Item actions")
            }.font(.system(size: 12)).buttonStyle(.plain)
            HStack(spacing: 10) {
                Eyebrow(text: item.kind.label)
                Text("·").foregroundStyle(Theme.secondary)
                Text(item.createdAt, format: .dateTime.month(.wide).day().year()).font(.system(size: 11))
                    .foregroundStyle(Theme.secondary)
                if item.isMemory {
                    Label("Remembered", systemImage: "sparkle").font(.system(size: 11)).foregroundStyle(
                        Theme.accent)
                }
            }
            TextField("Untitled", text: $item.title, axis: .vertical).font(Theme.heading(28))
                .textFieldStyle(.plain).lineLimit(1...3)
                .onChange(of: item.title) { _, _ in model.library.changed(item) }
            if model.voice.active, model.voice.item?.id == item.id {
                VoiceCaptureView(model: model)
            }
            if item.kind == .thought {
                TextEditor(text: $item.body).font(.system(size: 16)).lineSpacing(7).scrollContentBackground(
                    .hidden
                )
                .frame(minHeight: 260).padding(12).background(
                    Theme.surface.opacity(0.35), in: RoundedRectangle(cornerRadius: 8)
                )
                .overlay(alignment: .topLeading) {
                    if item.body.isEmpty {
                        Text("Let the thought take shape…").foregroundStyle(Theme.secondary).padding(18)
                            .allowsHitTesting(false)
                    }
                }
                .onChange(of: item.body) { _, _ in model.library.changed(item) }
            }
            if item.kind == .meeting {
                MeetingDocument(model: model, item: item, showTranscript: $showTranscript)
            }
            if !files.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Eyebrow(text: "Files from this work")
                    ForEach(files, id: \.path) { url in
                        HStack {
                            Image(systemName: "doc").foregroundStyle(Theme.secondary)
                            Button(url.lastPathComponent) { NSWorkspace.shared.open(url) }.buttonStyle(.plain)
                            Spacer()
                            Button {
                                NSWorkspace.shared.activateFileViewerSelecting([url])
                            } label: {
                                Image(systemName: "folder")
                            }.buttonStyle(.plain).accessibilityLabel("Reveal \(url.lastPathComponent)")
                        }.font(.system(size: 12)).padding(10).background(
                            Theme.surface, in: RoundedRectangle(cornerRadius: 6))
                    }
                }
            }
            if !item.messages.isEmpty {
                ConversationContent(messages: item.orderedMessages)
            }
            DriveToolsView(model: model, item: item)
            ItemComposer(model: model, item: item)
        }
        .confirmationDialog("Delete ‘\(item.title)’?", isPresented: $confirmDelete) {
            Button("Delete item and move its files to Trash", role: .destructive) {
                model.goBack()
                model.library.delete(item)
            }
        } message: {
            Text(
                "This removes its notes and conversation from your library. Files and recordings go to the Mac’s Trash."
            )
        }
        .task(id: model.agent.isRunning) { await loadFiles() }
        .onAppear { showTranscript = model.meetings.active && model.meetings.item?.id == item.id }
        .onDisappear { model.library.save() }
    }
    private var isBusy: Bool {
        (model.drive.busy && model.drive.itemID == item.id) || model.agent.activeItemID == item.id
            || model.meetings.item?.id == item.id
            || (model.voice.item?.id == item.id && model.voice.active)
    }
    private func revealWorkspace() {
        let url = AppPaths.workspace(item.id)
        do {
            try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
            NSWorkspace.shared.open(url)
        } catch { model.notice = error.localizedDescription }
    }
    private func loadFiles() async {
        let root = AppPaths.workspace(item.id)
        files = await Task.detached {
            let outputs = root.appendingPathComponent("Outputs")
            let enumerator = FileManager.default.enumerator(
                at: outputs, includingPropertiesForKeys: [.isRegularFileKey, .isSymbolicLinkKey],
                options: [.skipsHiddenFiles, .skipsPackageDescendants])
            var results: [URL] = []
            while let url = enumerator?.nextObject() as? URL, results.count < 200 {
                let values = try? url.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
                if values?.isRegularFile == true, values?.isSymbolicLink != true { results.append(url) }
            }
            return results.sorted { $0.lastPathComponent < $1.lastPathComponent }
        }.value
    }
}

private struct MeetingDocument: View {
    let model: AppModel
    @Bindable var item: LibraryItem
    @Binding var showTranscript: Bool
    @State private var editingNotes = false
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                Text(
                    item.recordingState == "interrupted"
                        ? "Recording interrupted · saved material is below" : "Your meeting, distilled."
                ).font(.system(size: 13)).foregroundStyle(Theme.secondary)
                Spacer()
                Button(item.notes.isEmpty ? "Generate notes" : "Regenerate notes") {
                    model.generateNotes(item)
                }
                .buttonStyle(QuietButtonStyle()).disabled(
                    model.agent.isRunning || model.meetings.item?.id == item.id || item.body.isEmpty)
            }
            if !item.notes.isEmpty || editingNotes {
                HStack {
                    Eyebrow(text: "Notes")
                    Spacer()
                    Button(editingNotes ? "Done" : "Edit notes") {
                        editingNotes.toggle()
                        model.library.save()
                    }.buttonStyle(.plain)
                }
                if editingNotes {
                    TextEditor(text: $item.notes).font(.system(size: 14)).scrollContentBackground(.hidden)
                        .frame(minHeight: 240).surface()
                        .onChange(of: item.notes) { _, _ in model.library.changed(item) }
                } else {
                    MarkdownDocument(text: item.notes).surface()
                }
            }
            DisclosureGroup("Transcript", isExpanded: $showTranscript) {
                Text(
                    item.body.isEmpty
                        ? "The transcript will appear here as the meeting progresses." : item.body
                )
                .font(.system(size: 13)).lineSpacing(6).textSelection(.enabled).frame(
                    maxWidth: .infinity, alignment: .leading
                ).padding(.vertical, 14)
                if model.meetings.item?.id == item.id {
                    ForEach(model.meetings.partials.keys.sorted(), id: \.self) { key in
                        Text("\(key): \(model.meetings.partials[key] ?? "")").foregroundStyle(Theme.secondary)
                    }
                }
            }
            Text(
                "Audio is saved in this item’s workspace → Recording. Microphone and meeting audio are separate tracks; these are channels, not individual speaker labels."
            )
            .font(.system(size: 11)).foregroundStyle(Theme.secondary)
        }
    }
}

private struct ItemComposer: View {
    let model: AppModel
    @Bindable var item: LibraryItem
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if !item.attachmentNames.isEmpty {
                ForEach(item.attachmentNames, id: \.self) { name in
                    HStack {
                        Image(systemName: "paperclip")
                        Text(name).lineLimit(1)
                        Spacer()
                    }.font(.system(size: 11)).foregroundStyle(Theme.secondary)
                }
            }
            HStack(alignment: .bottom, spacing: 14) {
                Button {
                    model.library.attach(to: item)
                } label: {
                    Image(systemName: "plus")
                }.buttonStyle(.plain).accessibilityLabel("Attach files").disabled(model.agent.isRunning)
                TextField(
                    item.kind == .conversation ? "Continue the thought…" : "Ask Toby about this…",
                    text: $item.draft, axis: .vertical
                )
                .textFieldStyle(.plain).lineLimit(2...8).onChange(of: item.draft) { _, _ in
                    model.library.changed(item)
                }
                Button {
                    model.agent.send(item.draft, to: item)
                } label: {
                    Image(systemName: "arrow.up.circle.fill").font(.system(size: 25))
                }
                .buttonStyle(.plain).keyboardShortcut(.return, modifiers: .command).accessibilityLabel(
                    "Send to Toby"
                )
                .disabled(
                    item.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        || model.agent.isRunning || (model.drive.busy && model.drive.itemID == item.id)
                        || model.voice.active || model.meetings.item?.id == item.id)
            }
            HStack {
                Text(
                    model.voice.active
                        ? "End voice to send a typed message" : "This item, attached files & remembered notes"
                ).font(.system(size: 10)).foregroundStyle(
                    Theme.secondary)
                Spacer()
                Text("⌘ Return").font(.system(size: 10)).foregroundStyle(Theme.secondary)
            }
        }.surface()
    }
}
