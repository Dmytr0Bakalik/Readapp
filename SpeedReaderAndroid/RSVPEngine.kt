package com.example.speedreader

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.max
import kotlin.math.min

class RSVPEngine : ViewModel() {

    var words = emptyList<String>()
    var currentBook: Book? = null

    private val _currentChunk = MutableStateFlow<List<String>>(emptyList())
    val currentChunk: StateFlow<List<String>> = _currentChunk.asStateFlow()

    private val _isPlaying = MutableStateFlow(false)
    val isPlaying: StateFlow<Boolean> = _isPlaying.asStateFlow()

    private val _currentProgress = MutableStateFlow(0f)
    val currentProgress: StateFlow<Float> = _currentProgress.asStateFlow()

    private val _currentWordIndex = MutableStateFlow(0)
    val currentWordIndex: StateFlow<Int> = _currentWordIndex.asStateFlow()

    // Settings
    var wpm = MutableStateFlow(300f)
    var wordsPerChunk = MutableStateFlow(1)
    var textSize = MutableStateFlow(56f)
    var showORP = MutableStateFlow(true)
    var focalColor = MutableStateFlow(0xFFEAA023)
    var textColor = MutableStateFlow(0xFFFFFFFF)
    var textBgColor = MutableStateFlow(0x00000000)
    var isDarkTheme = MutableStateFlow(true)

    private var timerJob: Job? = null

    fun loadBook(book: Book) {
        currentBook = book
        processText(book.fullText)
        _currentWordIndex.value = book.lastReadPosition
        
        if (_currentWordIndex.value >= words.size) {
            _currentWordIndex.value = 0
        }

        stopTimer()
        updateDisplay()
    }

    private fun processText(text: String) {
        val cleanRegex = Regex("[.,/#!$%^&*;:{}=\\\\-_`~()\"'“”]")
        val cleanedText = text.replace(cleanRegex, " ")
        words = cleanedText.split(Regex("\\s+")).filter { it.isNotEmpty() }
    }

    fun jumpTo(index: Int) {
        _currentWordIndex.value = max(0, min(index, words.size - 1))
        updateDisplay()
        saveProgress()
    }

    fun jumpByVirtualPage(forward: Boolean) {
        val pageSize = 500
        val delta = if (forward) pageSize else -pageSize
        jumpTo(_currentWordIndex.value + delta)
    }

    fun toggleBookmark() {
        val book = currentBook ?: return
        val current = _currentWordIndex.value
        val newList = book.bookmarks.toMutableList()
        if (newList.contains(current)) {
            newList.remove(current)
        } else {
            newList.add(current)
            newList.sort()
        }
        book.bookmarks = newList
    }

    fun togglePlayPause() {
        if (words.isEmpty()) return
        if (_isPlaying.value) stopTimer() else startTimer()
    }

    fun reset() {
        stopTimer()
        _currentWordIndex.value = 0
        updateDisplay()
        saveProgress()
    }

    fun startTimer() {
        if (words.isEmpty()) return
        _isPlaying.value = true
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (isActive && _isPlaying.value) {
                val interval = 60000L / wpm.value.toLong() * wordsPerChunk.value
                delay(interval)
                advance()
            }
        }
    }

    fun stopTimer() {
        _isPlaying.value = false
        timerJob?.cancel()
        timerJob = null
    }

    private fun advance() {
        if (_currentWordIndex.value + wordsPerChunk.value >= words.size) {
            _currentWordIndex.value = max(0, words.size - 1)
            stopTimer()
        } else {
            _currentWordIndex.value += wordsPerChunk.value
        }
        updateDisplay()
        saveProgress()
    }

    fun updateDisplay() {
        if (words.isEmpty()) {
            _currentChunk.value = emptyList()
            _currentProgress.value = 0f
            return
        }
        val startIndex = _currentWordIndex.value
        val endIndex = min(startIndex + wordsPerChunk.value, words.size)
        _currentChunk.value = words.subList(startIndex, endIndex)
        _currentProgress.value = startIndex.toFloat() / max(1, words.size - 1).toFloat()
    }

    fun saveProgress() {
        currentBook?.lastReadPosition = _currentWordIndex.value
        // In a real app, you'd trigger a DAO update here.
    }
}
