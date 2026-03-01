import SwiftUI
import SwiftData

struct LibraryView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Book.dateImported, order: .reverse) private var books: [Book]
    
    @Binding var selectedBook: Book?
    @State private var showDocumentPicker = false
    
    @State private var fileContent: String?
    @State private var fileName: String?
    @AppStorage("isDarkTheme") private var isDarkTheme: Bool = true
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()
                
                if books.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "books.vertical")
                            .font(.system(size: 80))
                            .foregroundColor(.gray)
                        Text("Your Library is Empty")
                            .font(.title2)
                            .foregroundColor(.white)
                        Button(action: { showDocumentPicker = true }) {
                            Text("Import Book")
                        }
                        .buttonStyle(BoldButtonStyle())
                    }
                } else {
                    List {
                        ForEach(books) { book in
                            Button(action: {
                                selectedBook = book
                            }) {
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text(book.title)
                                            .font(.headline)
                                            .foregroundColor(isDarkTheme ? .white : .primary)
                                        Text("\(book.fullText.count / 5) words")
                                            .font(.caption)
                                            .foregroundColor(.gray)
                                    }
                                    Spacer()
                                    if book.lastReadPosition > 0 {
                                        Text("\(Int(Double(book.lastReadPosition) / Double(max(1, (book.fullText.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }.count) - 1)) * 100))%")
                                            .font(.caption)
                                            .foregroundColor(.green)
                                    }
                                }
                            }
                            .listRowBackground(Color.white.opacity(0.1))
                        }
                        .onDelete(perform: deleteBooks)
                    }
                    .scrollContentBackground(.hidden)
                }
            }
            .navigationTitle("Library")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showDocumentPicker = true }) {
                        Image(systemName: "plus")
                    }
                    .buttonStyle(BoldIconButtonStyle())
                }
            }
            .sheet(isPresented: $showDocumentPicker) {
                DocumentPicker(fileContent: $fileContent, fileId: $fileName)
            }
            .onChange(of: fileContent) { _, newValue in
                if let content = newValue, let name = fileName {
                    let newBook = Book(title: name, fullText: content)
                    modelContext.insert(newBook)
                    fileContent = nil
                    fileName = nil
                }
            }
        }
    }
    
    private func deleteBooks(offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(books[index])
        }
    }
}
