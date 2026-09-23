import SwiftUI

struct QuickCaptureView: View {
    let model: AppModel
    @Bindable var item: LibraryItem
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                Text("Keep the thought.").font(Theme.heading(24))
                Spacer()
                Button {
                    model.finishCapture(open: false)
                } label: {
                    Image(systemName: "xmark")
                }
                .buttonStyle(.plain).accessibilityLabel("Close quick capture")
            }
            Text("Saved locally as you write. Nothing is sent to AI.").font(Theme.caption).foregroundStyle(
                Theme.secondary)
            TextField("Title", text: $item.title).onChange(of: item.title) { _, _ in
                model.library.changed(item)
            }
            ProjectPicker(
                model: model,
                selection: Binding(
                    get: { model.workspace.project(for: item)?.id },
                    set: { model.assign(item, projectID: $0) }))
            TextEditor(text: $item.body).scrollContentBackground(.hidden).font(Theme.body).frame(
                minHeight: 200
            )
            .onChange(of: item.body) { _, _ in model.library.changed(item) }
            if !item.attachmentNames.isEmpty {
                ForEach(item.attachmentNames, id: \.self) { Text($0).font(Theme.caption).lineLimit(1) }
            }
            if model.voice.active && model.voice.item?.id == item.id {
                Text(model.voice.transcript).font(Theme.body).foregroundStyle(Theme.secondary)
                Button("Finish dictation") { model.voice.sendNow() }.disabled(model.voice.phase != .listening)
                    .buttonStyle(QuietButtonStyle())
            } else {
                HStack {
                    Button("Paste clipboard") { model.addCapture(.general) }
                    Button("Attach file") { model.library.attach(to: item) }
                    Button("Dictate") { model.dictateCapture() }.disabled(!model.canStartWorkspaceTask)
                }.buttonStyle(QuietButtonStyle())
            }
            if let error = model.voice.error { ErrorNotice(message: error) }
            if let error = model.library.error { ErrorNotice(message: error) }
            if let notice = model.notice {
                ErrorNotice(message: notice, tone: .warning) { model.notice = nil }
            }
            Spacer(minLength: 0)
            HStack {
                Button("Save & close") { model.finishCapture(open: false) }
                Spacer()
                Button("Open note") { model.finishCapture(open: true) }
            }.buttonStyle(QuietButtonStyle())
            Text(
                "Select text or files in another app → Services → Capture in Toby. Clipboard capture is explicit."
            )
            .font(Theme.caption).foregroundStyle(Theme.secondary)
        }.padding(24).frame(width: 440).background(Theme.drawer)
    }
}
