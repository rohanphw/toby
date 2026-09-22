import SwiftUI

struct DefaultModelPicker: View {
    let account: AccountConnection
    @Binding var selection: String
    @State private var expanded = false
    @Environment(\.isEnabled) private var isEnabled
    private var title: String {
        account.models.first(where: { $0.id == selection })?.name
            ?? (selection.isEmpty ? (account.isBusy ? "Finding models…" : "Models unavailable") : selection)
    }
    var body: some View {
        Button {
            expanded.toggle()
        } label: {
            HStack(spacing: 10) {
                ProviderMark(provider: account.provider, size: 18)
                Text(title).lineLimit(1)
                Spacer(minLength: 4)
                if account.isBusy {
                    ProgressView().controlSize(.mini)
                } else {
                    Image(systemName: "chevron.down").font(.system(size: 10, weight: .semibold))
                }
            }.font(.system(size: 13, weight: .medium)).padding(.horizontal, 14).frame(height: 42)
                .background(Theme.surface, in: RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(expanded ? Theme.secondary : Theme.line))
                .contentShape(RoundedRectangle(cornerRadius: 12))
        }.buttonStyle(.plain).disabled(account.models.isEmpty)
            .opacity(isEnabled ? 1 : 0.45)
            .accessibilityLabel("\(account.provider.title) model").accessibilityValue(title)
            .popover(isPresented: $expanded, arrowEdge: .bottom) {
                ModelOptions(account: account, selection: $selection) { expanded = false }
                    .presentationBackground(Theme.surface)
            }
            .onChange(of: isEnabled) { _, enabled in if !enabled { expanded = false } }
    }
}

private struct ModelOptions: View {
    let account: AccountConnection
    @Binding var selection: String
    let dismiss: () -> Void
    @State private var query = ""
    @State private var highlighted: String?
    private var matches: [ModelOption] {
        account.models.filter {
            query.isEmpty || ($0.name + " " + $0.id).localizedCaseInsensitiveContains(query)
        }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("\(account.provider.title) models").font(Theme.heading(18)).padding(.horizontal, 4)
            WorkspaceSearchField(placeholder: "Find a model", text: $query, autofocus: true)
                .onKeyPress(.downArrow) {
                    move(1)
                    return .handled
                }
                .onKeyPress(.upArrow) {
                    move(-1)
                    return .handled
                }
                .onSubmit {
                    if let id = highlighted ?? matches.first?.id {
                        selection = id
                        dismiss()
                    }
                }
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 4) {
                        ForEach(matches) { option in
                            Button {
                                selection = option.id
                                dismiss()
                            } label: {
                                HStack(spacing: 12) {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(option.name).font(.system(size: 13, weight: .medium))
                                        if option.id == account.defaultModelID {
                                            Text("Configured in CLI").font(.system(size: 11)).foregroundStyle(
                                                Theme.secondary)
                                        }
                                    }
                                    Spacer()
                                    if selection == option.id {
                                        Image(systemName: "checkmark").font(
                                            .system(size: 12, weight: .semibold))
                                    }
                                }.padding(12).frame(maxWidth: .infinity, alignment: .leading)
                                    .background(
                                        highlighted == option.id ? Color(white: 0.13) : .clear,
                                        in: RoundedRectangle(cornerRadius: 9)
                                    )
                                    .contentShape(Rectangle())
                            }.buttonStyle(.plain).id(option.id)
                                .onHover { if $0 { highlighted = option.id } }
                                .accessibilityAddTraits(selection == option.id ? .isSelected : [])
                        }
                        if matches.isEmpty {
                            Text("No matching models").foregroundStyle(Theme.secondary).padding(16)
                        }
                    }
                }.frame(maxHeight: 280)
                    .onChange(of: highlighted) { _, id in if let id { proxy.scrollTo(id) } }
            }
        }.padding(16).frame(width: 320).foregroundStyle(Theme.ink).background(Theme.surface)
            .onAppear { highlighted = selection }
            .onChange(of: query) { _, _ in highlighted = matches.first?.id }
            .onExitCommand(perform: dismiss)
    }
    private func move(_ offset: Int) {
        guard !matches.isEmpty else { return }
        let index = matches.firstIndex(where: { $0.id == highlighted }) ?? (offset > 0 ? -1 : matches.count)
        highlighted = matches[min(max(index + offset, 0), matches.count - 1)].id
    }
}

struct ProviderSelector: View {
    @Binding var selection: String
    var body: some View {
        HStack(spacing: 4) {
            ForEach(CLIProvider.allCases) { provider in
                Button {
                    selection = provider.rawValue
                } label: {
                    HStack(spacing: 8) {
                        ProviderMark(provider: provider, size: 16)
                        Text(provider.title).font(.system(size: 13, weight: .medium)).fixedSize()
                    }
                    .padding(.horizontal, 14)
                    .frame(minWidth: 104, maxWidth: .infinity, minHeight: 34)
                    .background(
                        selection == provider.rawValue ? Color(white: 0.16) : .clear,
                        in: RoundedRectangle(cornerRadius: 9)
                    )
                    .foregroundStyle(selection == provider.rawValue ? Theme.ink : Theme.secondary)
                    .contentShape(Rectangle())
                }.buttonStyle(.plain).accessibilityAddTraits(
                    selection == provider.rawValue ? .isSelected : [])
            }
        }.padding(4).background(Theme.surface, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.line))
            .accessibilityLabel("Provider")
    }
}
