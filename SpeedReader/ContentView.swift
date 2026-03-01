import SwiftUI
import SwiftData

struct ContentView: View {
    @State private var selectedBook: Book?
    
    var body: some View {
        if let book = selectedBook {
            ReaderView(book: book, selectedBook: $selectedBook)
        } else {
            LibraryView(selectedBook: $selectedBook)
        }
    }
}

struct ReaderView: View {
    let book: Book
    @Binding var selectedBook: Book?
    
    @State private var engine = RSVPEngine()
    @State private var showFullText = false
    @State private var summaryText: String = ""
    @State private var showSettings = false
    
    @AppStorage("focalColor") var focalColor: Color = Color(red: 0.917, green: 0.627, blue: 0.137)
    @AppStorage("textColor") var textColor: Color = .primary
    @AppStorage("textBgColor") var textBgColor: Color = .clear
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()
                
                VStack(spacing: 20) {
                    
                    // Header with Book Title and Back Button
                    HStack {
                        Button(action: { selectedBook = nil }) {
                            Image(systemName: "chevron.left")
                        }
                        .buttonStyle(BoldIconButtonStyle())
                        Spacer()
                        Text(book.title)
                            .font(.headline)
                            .foregroundColor(.gray)
                            .lineLimit(1)
                        Spacer()
                        Button(action: { engine.toggleBookmark() }) {
                            Image(systemName: book.bookmarks.contains(engine.currentWordIndex) ? "bookmark.fill" : "bookmark")
                        }
                        .buttonStyle(BoldIconButtonStyle())
                    }
                    .padding(.horizontal)
                    
                    // Progress and Seek Slider
                    VStack(spacing: 8) {
                        ProgressView(value: engine.currentProgress)
                            .progressViewStyle(LinearProgressViewStyle(tint: .white))
                        
                        HStack {
                            Text("\(Int(engine.currentProgress * 100))%")
                            Spacer()
                            Text("\(engine.currentWordIndex) / \(engine.words.count)")
                        }
                        .font(.caption2)
                        .foregroundColor(.gray)
                        
                        Slider(value: Binding(
                            get: { Double(engine.currentWordIndex) },
                            set: { engine.jumpTo(index: Int($0)) }
                        ), in: 0...Double(max(1, engine.words.count - 1)), step: 1)
                        .accentColor(focalColor)
                    }
                    .padding(.horizontal)
                    
                    if !summaryText.isEmpty {
                        Text(summaryText)
                            .font(.footnote)
                            .foregroundColor(.gray)
                            .padding()
                            .background(Color.white.opacity(0.1))
                            .cornerRadius(8)
                            .padding(.horizontal)
                    }
                    
                    Spacer()
                    
                    // RSVP Display
                    HStack(spacing: 8) {
                        if engine.words.isEmpty {
                            Text("Processing...")
                        } else {
                            if engine.currentChunk.count == 1 {
                                ORPWordView(word: engine.currentChunk[0], showORP: engine.showORP, textSize: engine.textSize, textColor: textColor, textBgColor: textBgColor, focalColor: focalColor)
                            } else {
                                // If multiple words, combine them to find the true center
                                let combined = engine.currentChunk.joined(separator: " ")
                                ORPWordView(word: combined, showORP: engine.showORP, textSize: engine.textSize, textColor: textColor, textBgColor: textBgColor, focalColor: focalColor)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    
                    Spacer()
                    
                    // Controls
                    VStack(spacing: 20) {
                        HStack(spacing: 30) {
                            Button(action: { engine.jumpByVirtualPage(forward: false) }) {
                                Image(systemName: "gobackward.500")
                                    .font(.title2)
                            }
                            .buttonStyle(BoldIconButtonStyle())
                            
                            Button(action: { engine.reset() }) {
                                Image(systemName: "arrow.counterclockwise")
                                    .font(.title2)
                            }
                            .buttonStyle(BoldIconButtonStyle())
                            
                            Button(action: { engine.playPause() }) {
                                Image(systemName: engine.isPlaying ? "pause.fill" : "play.fill")
                                    .font(.title) // Bold button doesn't need huge circle anymore
                            }
                            .buttonStyle(BoldButtonStyle())
                            
                            Button(action: { showFullText = true }) {
                                Image(systemName: "text.justify.left")
                                    .font(.title2)
                            }
                            .buttonStyle(BoldIconButtonStyle())
                            
                            Button(action: { engine.jumpByVirtualPage(forward: true) }) {
                                Image(systemName: "goforward.500")
                                    .font(.title2)
                            }
                            .buttonStyle(BoldIconButtonStyle())
                        
                        Button("Settings") {
                            showSettings.toggle()
                        }
                        .buttonStyle(BoldButtonStyle())
                    }
                    .padding(.bottom)
                }
            }
            .onAppear {
                engine.loadBook(book)
            }
            .sheet(isPresented: $showSettings) {
                SettingsView(engine: engine)
                    .presentationDetents([.medium])
            }
            .sheet(isPresented: $showFullText) {
                FullTextView(words: engine.words, currentIndex: $engine.currentWordIndex) { index in
                    engine.jumpTo(index: index)
                    showFullText = false
                }
            }
        }
    }
}

struct SettingsView: View {
    @Bindable var engine: RSVPEngine
    @AppStorage("isDarkTheme") var isDarkTheme: Bool = true
    @AppStorage("focalColor") var focalColor: Color = Color(red: 0.917, green: 0.627, blue: 0.137)
    @AppStorage("textColor") var textColor: Color = .primary
    @AppStorage("textBgColor") var textBgColor: Color = .clear
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text("Settings")
                    .font(.headline)
                    .padding(.top)
            
            VStack(alignment: .leading) {
                Text("Text Size: \(Int(engine.textSize))")
                Slider(value: $engine.textSize, in: 24...96, step: 2)
            }
            
            VStack(alignment: .leading) {
                Text("Speed: \(Int(engine.wpm)) WPM")
                Slider(value: $engine.wpm, in: 100...1000, step: 25)
            }
            
            HStack {
                Text("Words per view")
                Spacer()
                Picker("", selection: $engine.wordsPerChunk) {
                    ForEach(1...10, id: \.self) { Text("\($0)").tag($0) }
                }
                .pickerStyle(MenuPickerStyle())
            }
            
                Toggle("ORP Highlight", isOn: $engine.showORP)
                Toggle("Dark Theme", isOn: $isDarkTheme)
                
                ColorPicker("Focal Color", selection: $focalColor)
                ColorPicker("Text Color", selection: $textColor)
                ColorPicker("Text Background", selection: $textBgColor)
                
                Spacer()
            }
            .padding()
        }
        .preferredColorScheme(isDarkTheme ? .dark : .light)
    }
}

struct FullTextView: View {
    let words: [String]
    @Binding var currentIndex: Int
    var onSelect: (Int) -> Void
    
    var body: some View {
        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    FlowLayout(spacing: 4) {
                        ForEach(0..<words.count, id: \.self) { index in
                            Text(words[index])
                                .padding(4)
                                .background(currentIndex == index ? Color.white.opacity(0.3) : Color.clear)
                                .cornerRadius(4)
                                .onTapGesture {
                                    onSelect(index)
                                }
                                .id(index)
                        }
                    }
                    .padding()
                }
                .onAppear {
                    proxy.scrollTo(currentIndex, anchor: .center)
                }
            }
            .navigationTitle("Seek Text")
            .navigationBarTitleDisplayMode(.inline)
            .background(Color.black)
            .foregroundColor(.white)
        }
    }
}

// Simple FlowLayout for the full text view
struct FlowLayout: Layout {
    var spacing: CGFloat
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0
        var totalHeight: CGFloat = 0
        
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > width {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
        }
        totalHeight = currentY + lineHeight
        return CGSize(width: width, height: totalHeight)
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var currentX: CGFloat = bounds.minX
        var currentY: CGFloat = bounds.minY
        var lineHeight: CGFloat = 0
        
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > bounds.maxX {
                currentX = bounds.minX
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            subview.place(at: CGPoint(x: currentX, y: currentY), proposal: .unspecified)
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
        }
    }
}

struct ORPWordView: View {
    let word: String
    let showORP: Bool
    let textSize: Double
    let textColor: Color
    let textBgColor: Color
    let focalColor: Color
    
    var body: some View {
        HStack(spacing: 0) {
            if showORP, word.count > 0 {
                let orpIndex = (word.count - 1) / 2
                let prefix = String(word.prefix(orpIndex))
                let orpChar = String(word[word.index(word.startIndex, offsetBy: orpIndex)])
                let suffix = String(word.suffix(word.count - orpIndex - 1))
                
                Text(prefix)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                Text(orpChar)
                    .foregroundColor(focalColor)
                    .fixedSize()
                Text(suffix)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                Text(word)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
        }
        .font(.system(size: textSize, weight: .black, design: .default))
        .foregroundColor(textColor)
        .background(textBgColor)
    }
}

// "NEVER" Button Styles
struct BoldButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .black))
            .padding(.vertical, 12)
            .padding(.horizontal, 24)
            .background(configuration.isPressed ? Color(red: 1.0, green: 0.71, blue: 0.19) : Color(red: 0.917, green: 0.627, blue: 0.137))
            .foregroundColor(Color(red: 0.05, green: 0.05, blue: 0.05))
            .cornerRadius(4)
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeOut(duration: 0.2), value: configuration.isPressed)
    }
}

struct BoldIconButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(14)
            .background(configuration.isPressed ? Color(red: 1.0, green: 0.71, blue: 0.19) : Color(red: 0.917, green: 0.627, blue: 0.137))
            .foregroundColor(Color(red: 0.05, green: 0.05, blue: 0.05))
            .cornerRadius(4)
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeOut(duration: 0.2), value: configuration.isPressed)
    }
}

// Color AppStorage Persistence support
extension Color: RawRepresentable {
    public init?(rawValue: String) {
        guard let data = Data(base64Encoded: rawValue) else { return nil }
        do {
            let color = try NSKeyedUnarchiver.unarchivedObject(ofClass: UIColor.self, from: data) ?? .white
            self = Color(color)
        } catch { return nil }
    }
    public var rawValue: String {
        do {
            let data = try NSKeyedArchiver.archivedData(withRootObject: UIColor(self), requiringSecureCoding: false)
            return data.base64EncodedString()
        } catch { return "" }
    }
}
