package com.example.speedreader

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val engine: RSVPEngine = viewModel()
            val isDarkTheme by engine.isDarkTheme.collectAsState()
            
            val colors = if (isDarkTheme) {
                darkColorScheme(background = Color.Black, onBackground = Color.White)
            } else {
                lightColorScheme(background = Color.White, onBackground = Color.Black)
            }

            MaterialTheme(colorScheme = colors) {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    MainNavigation(engine)
                }
            }
        }
    }
}

@Composable
fun MainNavigation(engine: RSVPEngine) {
    var selectedBook by remember { mutableStateOf<Book?>(null) }
    
    // Naive local list since Room setup requires manifest/context
    val books = remember { mutableStateListOf<Book>() }
    
    if (selectedBook == null) {
        LibraryScreen(books) { book ->
            selectedBook = book
            engine.loadBook(book)
        }
    } else {
        ReaderScreen(engine, selectedBook!!) {
            selectedBook = null
        }
    }
}

@Composable
fun LibraryScreen(books: MutableList<Book>, onSelect: (Book) -> Unit) {
    val coroutineScope = rememberCoroutineScope()
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? -> 
        // Logic to extract and add book to list
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("My Library", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.weight(1f))
            BoldIconButton("+") { filePickerLauncher.launch(arrayOf("text/plain", "application/pdf")) }
        }
        
        Spacer(Modifier.height(16.dp))
        
        LazyColumn(modifier = Modifier.fillMaxSize()) {
            items(books) { book ->
                Card(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable { onSelect(book) },
                    colors = CardDefaults.cardColors(containerColor = if (MaterialTheme.colorScheme.background == Color.Black) Color(0xFF1E1E1E) else Color(0xFFE0E0E0))
                ) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(book.title, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                            Text("${book.fullText.length / 5} words", color = Color.Gray, fontSize = 12.sp)
                        }
                        Text("${(book.lastReadPosition.toFloat() / maxOf(1, book.fullText.length/5) * 100).toInt()}%", color = Color(0xFFEAA023))
                    }
                }
            }
        }
    }
}

@Composable
fun ReaderScreen(engine: RSVPEngine, book: Book, onBack: () -> Unit) {
    val currentChunk by engine.currentChunk.collectAsState()
    val isPlaying by engine.isPlaying.collectAsState()
    val progress by engine.currentProgress.collectAsState()
    val currentIndex by engine.currentWordIndex.collectAsState()
    val textSize by engine.textSize.collectAsState()
    val wpm by engine.wpm.collectAsState()
    val wordsPerChunk by engine.wordsPerChunk.collectAsState()
    val showORP by engine.showORP.collectAsState()
    
    val focalColor by engine.focalColor.collectAsState()
    val textColor by engine.textColor.collectAsState()
    val textBgColor by engine.textBgColor.collectAsState()
    val isDarkTheme by engine.isDarkTheme.collectAsState()
    
    var showFullText by remember { mutableStateOf(false) }
    var showSettings by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        // Header
        Row(verticalAlignment = Alignment.CenterVertically) {
            BoldIconButton("<") { onBack() }
            Spacer(Modifier.width(8.dp))
            Text(book.title, modifier = Modifier.weight(1f), maxLines = 1, color = Color.Gray)
            Spacer(Modifier.width(8.dp))
            BoldIconButton(if (book.bookmarks.contains(currentIndex)) "★" else "☆") { engine.toggleBookmark() }
        }

        // Progress & Seek
        Column(modifier = Modifier.padding(vertical = 8.dp)) {
            LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth(), color = Color(focalColor))
            Row(Modifier.fillMaxWidth()) {
                Text("${(progress * 100).toInt()}%", fontSize = 10.sp, color = Color.Gray)
                Spacer(Modifier.weight(1f))
                Text("$currentIndex / ${engine.words.size}", fontSize = 10.sp, color = Color.Gray)
            }
            Slider(
                value = currentIndex.toFloat(),
                onValueChange = { engine.jumpTo(it.toInt()) },
                valueRange = 0f..maxOf(1f, engine.words.size.toFloat() - 1)
            )
        }

        Spacer(Modifier.weight(1f))

        // RSVP Display
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            if (currentChunk.isNotEmpty()) {
                if (currentChunk.size == 1) {
                    ORPWordView(currentChunk[0], showORP, textSize, Color(focalColor), Color(textColor), Color(textBgColor))
                } else {
                    val combined = currentChunk.joinToString(" ")
                    ORPWordView(combined, showORP, textSize, Color(focalColor), Color(textColor), Color(textBgColor))
                }
            }
        }

        Spacer(Modifier.weight(1f))

        // Controls
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
            BoldIconButton("<<") { engine.jumpByVirtualPage(false) }
            BoldIconButton("↺") { engine.reset() }
            BoldButton(if (isPlaying) "||" else "►") { engine.togglePlayPause() }
            BoldIconButton("≡") { showFullText = true }
            BoldIconButton(">>") { engine.jumpByVirtualPage(true) }
        }
        
        Spacer(Modifier.height(16.dp))
        BoldButton("Settings") { showSettings = true }
    }

    if (showSettings) {
        SettingsDialog(engine) { showSettings = false }
    }

    if (showFullText) {
        FullTextDialog(engine.words, currentIndex) {
            engine.jumpTo(it)
            showFullText = false
        }
    }
}

@Composable
fun FullTextDialog(words: List<String>, currentIndex: Int, onSelect: (Int) -> Unit) {
    AlertDialog(
        onDismissRequest = {},
        confirmButton = { TextButton(onClick = {}) { Text("Close") } },
        text = {
            val state = rememberLazyListState()
            LaunchedEffect(Unit) { state.scrollToItem(currentIndex) }
            LazyColumn(state = state, modifier = Modifier.height(400.dp)) {
                items(words.size) { index ->
                    Text(
                        words[index],
                        modifier = Modifier.fillMaxWidth().background(if(index == currentIndex) Color.White.opacity(0.2f) else Color.Transparent).clickable { onSelect(index) }.padding(4.dp),
                        color = Color.White
                    )
                }
            }
        }
    )
}

@Composable
fun ORPWordView(word: String, showORP: Boolean, textSize: Float, focalColor: Color, textColor: Color, textBgColor: Color) {
    if (showORP && word.isNotEmpty()) {
        val orpIndex = (word.length - 1) / 2
        val prefix = word.substring(0, orpIndex)
        val center = word[orpIndex].toString()
        val suffix = word.substring(orpIndex + 1)
        
        Row(
            modifier = Modifier.fillMaxWidth().background(textBgColor),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(text = prefix, color = textColor, fontSize = textSize.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.End)
            Text(text = center, color = focalColor, fontSize = textSize.sp, fontWeight = FontWeight.Bold)
            Text(text = suffix, color = textColor, fontSize = textSize.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Start)
        }
    } else {
        Row(
            modifier = Modifier.fillMaxWidth().background(textBgColor),
            horizontalArrangement = Arrangement.Center
        ) {
            Text(text = word, fontSize = textSize.sp, fontWeight = FontWeight.Bold, color = textColor)
        }
    }
}

// "NEVER" Button Styles
@Composable
fun BoldButton(text: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEAA023), contentColor = Color(0xFF111111)),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(4.dp),
        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp, pressedElevation = 0.dp)
    ) {
        Text(text, fontWeight = FontWeight.ExtraBold, letterSpacing = 1.sp)
    }
}

@Composable
fun BoldIconButton(text: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEAA023), contentColor = Color(0xFF111111)),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(4.dp),
        contentPadding = PaddingValues(16.dp),
        modifier = Modifier.defaultMinSize(minWidth = 56.dp, minHeight = 56.dp),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp, pressedElevation = 0.dp)
    ) {
        Text(text, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
    }
}

@Composable
fun SettingsDialog(engine: RSVPEngine, onDismiss: () -> Unit) {
    val showORP by engine.showORP.collectAsState()
    val isDarkTheme by engine.isDarkTheme.collectAsState()
    val textSize by engine.textSize.collectAsState()
    
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = { BoldButton("Close", onDismiss) },
        title = { Text("Settings") },
        text = {
            Column {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Dark Theme", Modifier.weight(1f))
                    Switch(checked = isDarkTheme, onCheckedChange = { engine.isDarkTheme.value = it })
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("ORP Highlight", Modifier.weight(1f))
                    Switch(checked = showORP, onCheckedChange = { engine.showORP.value = it })
                }
                Spacer(Modifier.height(16.dp))
                Text("Theme Colors (Tap to Cycle)", fontWeight = FontWeight.Bold)
                
                Button(onClick = { engine.focalColor.value = if(engine.focalColor.value == 0xFFEAA023) 0xFFFF3B30 else 0xFFEAA023 }) { Text("Toggle Focal Color") }
                Button(onClick = { engine.textColor.value = if(engine.textColor.value == 0xFFFFFFFF) 0xFFCCCCCC else 0xFFFFFFFF }) { Text("Toggle Text Color") }
                Button(onClick = { engine.textBgColor.value = if(engine.textBgColor.value == 0x00000000) 0xFF222222 else 0x00000000 }) { Text("Toggle Text BG Color") }
                
            }
        }
    )
}
