import SwiftUI

struct MarkdownDocument: View {
    let text: String
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(Array(blocks.enumerated()), id: \.offset) { _, block in
                switch block {
                case .heading(let text, let level):
                    Text(inline(text)).font(Theme.heading(level == 1 ? 27 : level == 2 ? 23 : 19)).padding(
                        .top, 6)
                case .paragraph(let text):
                    Text(inline(text)).font(.system(size: 15)).lineSpacing(6)
                case .code(let text):
                    ScrollView(.horizontal) {
                        Text(text).font(.system(size: 12, design: .monospaced)).padding(14)
                    }.background(Theme.surface, in: RoundedRectangle(cornerRadius: 7))
                case .bullet(let text):
                    HStack(alignment: .top, spacing: 10) {
                        Text("•").foregroundStyle(Theme.secondary)
                        Text(inline(text)).lineSpacing(5)
                    }.font(.system(size: 14))
                case .quote(let text):
                    HStack(spacing: 12) {
                        Rectangle().fill(Theme.accent.opacity(0.5)).frame(width: 2)
                        Text(inline(text)).italic().foregroundStyle(Theme.secondary)
                    }.fixedSize(horizontal: false, vertical: true)
                }
            }
        }.textSelection(.enabled).frame(maxWidth: .infinity, alignment: .leading)
    }
    private enum Block {
        case heading(String, Int)
        case paragraph(String)
        case code(String)
        case bullet(String)
        case quote(String)
    }
    private func inline(_ text: String) -> AttributedString {
        (try? AttributedString(
            markdown: text, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)))
            ?? AttributedString(text)
    }
    private var blocks: [Block] {
        var output: [Block] = []
        var paragraph: [String] = []
        var code: [String] = []
        var inCode = false
        func flush() {
            if !paragraph.isEmpty {
                output.append(.paragraph(paragraph.joined(separator: "\n")))
                paragraph = []
            }
        }
        for line in text.components(separatedBy: "\n") {
            if line.hasPrefix("```") {
                flush()
                if inCode {
                    output.append(.code(code.joined(separator: "\n")))
                    code = []
                }
                inCode.toggle()
                continue
            }
            if inCode {
                code.append(line)
                continue
            }
            if line.isEmpty {
                flush()
                continue
            }
            let level = line.prefix(while: { $0 == "#" }).count
            if (1...6).contains(level), line.dropFirst(level).hasPrefix(" ") {
                flush()
                output.append(.heading(String(line.dropFirst(level + 1)), level))
            } else if line.hasPrefix("- ") || line.hasPrefix("* ") {
                flush()
                output.append(.bullet(String(line.dropFirst(2))))
            } else if line.hasPrefix("> ") {
                flush()
                output.append(.quote(String(line.dropFirst(2))))
            } else {
                paragraph.append(line)
            }
        }
        flush()
        if inCode { output.append(.code(code.joined(separator: "\n"))) }
        return output
    }
}
