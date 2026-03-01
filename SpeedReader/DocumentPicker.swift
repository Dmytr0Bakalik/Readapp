import SwiftUI
import UniformTypeIdentifiers
import PDFKit

struct DocumentPicker: UIViewControllerRepresentable {
    @Binding var fileContent: String?
    @Binding var fileId: String?
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.plainText, .pdf], asCopy: true)
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {}

    class Coordinator: NSObject, UIDocumentPickerDelegate {
        var parent: DocumentPicker

        init(_ parent: DocumentPicker) {
            self.parent = parent
        }

        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            guard let url = urls.first else { return }
            
            // Securely access the file
            if url.startAccessingSecurityScopedResource() {
                defer { url.stopAccessingSecurityScopedResource() }
                
                let fileExtension = url.pathExtension.lowercased()
                parent.fileId = url.lastPathComponent
                
                if fileExtension == "pdf" {
                    if let pdfDocument = PDFDocument(url: url) {
                        var fullText = ""
                        for i in 0..<pdfDocument.pageCount {
                            if let page = pdfDocument.page(at: i) {
                                fullText += page.string ?? ""
                            }
                        }
                        parent.fileContent = fullText
                    }
                } else if fileExtension == "txt" {
                    if let content = try? String(contentsOf: url) {
                        parent.fileContent = content
                    }
                }
            }
        }
    }
}
