import SwiftUI
import SwiftData

@main
struct SpeedReaderApp: App {
    @AppStorage("isDarkTheme") private var isDarkTheme: Bool = true
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(isDarkTheme ? .dark : .light)
                .modelContainer(for: Book.self)
        }
    }
}
