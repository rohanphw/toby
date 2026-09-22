import SwiftUI

struct WorkspaceSearchField: View {
    let placeholder: String
    @Binding var text: String
    var autofocus = false
    @FocusState private var focused: Bool
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "magnifyingglass").foregroundStyle(Theme.secondary)
            TextField(placeholder, text: $text).textFieldStyle(.plain)
                .font(.system(size: 14)).focused($focused).accessibilityLabel(placeholder)
            if !text.isEmpty {
                Button {
                    text = ""
                    focused = true
                } label: {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(Theme.secondary)
                }.buttonStyle(.plain).accessibilityLabel("Clear search")
            }
        }.padding(.horizontal, 14).frame(height: 44)
            .background(Theme.surface, in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(focused ? Theme.secondary : Theme.line))
            .onAppear { if autofocus { focused = true } }
    }
}
