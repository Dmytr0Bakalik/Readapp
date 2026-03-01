import Foundation
import SwiftData

@Model
final class Book {
    var id: UUID
    var title: String
    var fullText: String
    var lastReadPosition: Int
    var dateImported: Date
    var bookmarks: [Int] // Array of word indices
    
    init(title: String, fullText: String) {
        self.id = UUID()
        self.title = title
        self.fullText = fullText
        self.lastReadPosition = 0
        self.dateImported = Date()
        self.bookmarks = []
    }
}
