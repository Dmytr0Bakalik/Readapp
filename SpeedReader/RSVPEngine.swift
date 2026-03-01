import Foundation
import SwiftUI
import SwiftData

@Observable
class RSVPEngine {
    var words: [String] = []
    var currentWordIndex: Int = 0
    var isPlaying: Bool = false
    
    var wpm: Double = 300 {
        didSet { if isPlaying { startTimer() } }
    }
    var wordsPerChunk: Int = 1 {
        didSet { 
            updateDisplay()
            if isPlaying { startTimer() } 
        }
    }
    var showORP: Bool = true
    var textSize: Double = 48.0
    
    var currentChunk: [String] = []
    var currentProgress: Double = 0.0
    
    private var timer: Timer?
    var currentBook: Book?
    
    func loadBook(_ book: Book) {
        self.currentBook = book
        processText(book.fullText)
        self.currentWordIndex = book.lastReadPosition
        
        if self.currentWordIndex >= self.words.count {
            self.currentWordIndex = 0
        }
        
        self.isPlaying = false
        stopTimer()
        updateDisplay()
    }
    
    private func processText(_ text: String) {
        // Clean punctuation: remove commas, periods, exclamation marks
        let punctuationToRemove = CharacterSet(charactersIn: ".,/#!$%^&*;:{}=\\-_`~()\"'“”")
        let cleanedText = text.components(separatedBy: punctuationToRemove).joined(separator: " ")
        
        // Split into words
        self.words = cleanedText.components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }
    }
    
    func jumpTo(index: Int) {
        guard !words.isEmpty else { return }
        currentWordIndex = max(0, min(index, words.count - 1))
        updateDisplay()
        saveProgress()
    }
    
    func jumpByPercentage(_ percentage: Double) {
        let index = Int(Double(words.count) * percentage)
        jumpTo(index: index)
    }
    
    func jumpByVirtualPage(forward: Bool) {
        let pageSize = 500
        let delta = forward ? pageSize : -pageSize
        jumpTo(index: currentWordIndex + delta)
    }
    
    func toggleBookmark() {
        guard let book = currentBook else { return }
        if let existing = book.bookmarks.firstIndex(of: currentWordIndex) {
            book.bookmarks.remove(at: existing)
        } else {
            book.bookmarks.append(currentWordIndex)
            book.bookmarks.sort()
        }
    }
    
    func playPause() {
        guard !words.isEmpty else { return }
        isPlaying.toggle()
        if isPlaying {
            startTimer()
        } else {
            stopTimer()
        }
    }
    
    func reset() {
        stopTimer()
        currentWordIndex = 0
        updateDisplay()
        saveProgress()
    }
    
    private func startTimer() {
        stopTimer()
        let intervalPerWord = 60.0 / wpm
        let timerInterval = intervalPerWord * Double(wordsPerChunk)
        
        timer = Timer.scheduledTimer(withTimeInterval: timerInterval, repeats: true) { [weak self] _ in
            self?.advance()
        }
    }
    
    private func stopTimer() {
        timer?.invalidate()
        timer = nil
        isPlaying = false
    }
    
    private func advance() {
        if currentWordIndex + wordsPerChunk >= words.count {
            currentWordIndex = max(0, words.count - 1)
            stopTimer()
        } else {
            currentWordIndex += wordsPerChunk
        }
        updateDisplay()
        saveProgress()
    }
    
    func updateDisplay() {
        guard !words.isEmpty else {
            currentChunk = []
            currentProgress = 0
            return
        }
        
        let endIndex = min(currentWordIndex + wordsPerChunk, words.count)
        currentChunk = Array(words[currentWordIndex..<endIndex])
        currentProgress = Double(currentWordIndex) / Double(max(1, words.count - 1))
    }
    
    func saveProgress() {
        if let book = currentBook {
            book.lastReadPosition = currentWordIndex
        }
    }
}
