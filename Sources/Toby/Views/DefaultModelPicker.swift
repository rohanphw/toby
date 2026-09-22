import SwiftUI

struct DefaultModelPicker: View {
    let account: AccountConnection
    @Binding var selection: String
    var body: some View {
        Picker("\(account.provider.title) model", selection: $selection) {
            Text("CLI default").tag("")
            ForEach(account.models) { Text($0.name).tag($0.id) }
            if !selection.isEmpty, !account.models.contains(where: { $0.id == selection }) {
                Text(selection).tag(selection)
            }
        }
    }
}
