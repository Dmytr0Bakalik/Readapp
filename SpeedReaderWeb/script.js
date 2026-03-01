document.addEventListener('DOMContentLoaded', () => {

    // 1. PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.error('Service Worker registration failed', err));
    }

    // 2. DOM Elements
    const topProgressBar = document.getElementById('topProgressBar');
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressWordCount = document.getElementById('progressWordCount');

    const libraryView = document.getElementById('libraryView');
    const readerView = document.getElementById('readerView');
    const fileInput = document.getElementById('fileInput');
    const bookList = document.getElementById('bookList');
    const backBtn = document.getElementById('backBtn');
    const bookTitle = document.getElementById('bookTitle');

    const rsvpView = document.getElementById('rsvpView');
    const focalDot = document.getElementById('focal-dot');
    const rsvpWordContainer = document.getElementById('rsvpWordContainer');

    const classicView = document.getElementById('classicView');
    const classicPage = document.getElementById('classicPage');

    const jumpBackBtn = document.getElementById('jumpBackBtn');
    const resetBtn = document.getElementById('resetBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIconWrapper = document.getElementById('playIconWrapper');
    const toggleModeBtn = document.getElementById('toggleModeBtn');
    const jumpFwdBtn = document.getElementById('jumpFwdBtn');

    // Settings Elements
    const settingsToggleBtn = document.getElementById('settingsToggleBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const wpmSlider = document.getElementById('wpmSlider');
    const wpmLabel = document.getElementById('wpmLabel');
    const chunkSizeSlider = document.getElementById('chunkSizeSlider');
    const chunkSizeLabel = document.getElementById('chunkSizeLabel');
    const punctuationFilterToggle = document.getElementById('punctuationFilterToggle');
    const showFocalDotToggle = document.getElementById('showFocalDotToggle');
    const focalColorPicker = document.getElementById('focalColor');
    const dotSizeSlider = document.getElementById('dotSizeSlider');
    const textColorPicker = document.getElementById('textColor');
    const textSizeSlider = document.getElementById('textSizeSlider');

    // 3. Application State
    let library = JSON.parse(localStorage.getItem('speedreader_pwa_library') || '[]');
    let savedSettings = JSON.parse(localStorage.getItem('speedreader_pwa_settings') || '{}');

    let currentBook = null;
    let words = [];
    let originalWords = [];
    let currentWordIndex = 0;
    let isPlaying = false;
    let timer = null;
    let isClassicMode = false;

    // Load Default / Saved Settings
    let wpm = savedSettings.wpm || 300;
    let wordsPerFlash = savedSettings.wordsPerFlash || 1;
    let filterPunctuation = savedSettings.filterPunctuation !== undefined ? savedSettings.filterPunctuation : true;
    let showFocalDot = savedSettings.showFocalDot !== undefined ? savedSettings.showFocalDot : true;
    let focalColor = savedSettings.focalColor || '#ff0000';
    let dotSize = savedSettings.dotSize || 6;
    let textColor = savedSettings.textColor || '#ffffff';
    let textSize = savedSettings.textSize || 64;

    const playIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    const pauseIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

    // 4. Initial Setup
    applySettingsToUI();
    applyThemeVariables();
    renderLibrary();

    // 5. Event Listeners
    fileInput.addEventListener('change', handleFileUpload);
    backBtn.addEventListener('click', closeBook);

    jumpBackBtn.addEventListener('click', () => jumpWords(-500));
    jumpFwdBtn.addEventListener('click', () => jumpWords(500));
    resetBtn.addEventListener('click', () => jumpTo(0));
    playPauseBtn.addEventListener('click', togglePlay);
    toggleModeBtn.addEventListener('click', toggleViewMode);

    settingsToggleBtn.addEventListener('click', () => settingsPanel.classList.toggle('hidden'));

    wpmSlider.addEventListener('input', (e) => {
        wpm = parseInt(e.target.value);
        wpmLabel.textContent = wpm;
        saveSettings();
        if (isPlaying) restartTimer();
    });

    chunkSizeSlider.addEventListener('input', (e) => {
        wordsPerFlash = parseInt(e.target.value);
        chunkSizeLabel.textContent = wordsPerFlash;
        saveSettings();
        updateDisplay();
    });

    punctuationFilterToggle.addEventListener('change', (e) => {
        filterPunctuation = e.target.checked;
        saveSettings();
        if (currentBook) {
            processBookContent(currentBook.content);
            updateDisplay();
        }
    });

    showFocalDotToggle.addEventListener('change', (e) => {
        showFocalDot = e.target.checked;
        saveSettings();
        applyFocalDotVisibility();
    });

    focalColorPicker.addEventListener('input', (e) => {
        focalColor = e.target.value;
        applyThemeVariables();
        saveSettings();
    });

    dotSizeSlider.addEventListener('input', (e) => {
        dotSize = parseInt(e.target.value);
        applyThemeVariables();
        saveSettings();
    });

    textColorPicker.addEventListener('input', (e) => {
        textColor = e.target.value;
        applyThemeVariables();
        saveSettings();
    });

    textSizeSlider.addEventListener('input', (e) => {
        textSize = parseInt(e.target.value);
        applyThemeVariables();
        saveSettings();
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !readerView.classList.contains('hidden')) {
            e.preventDefault();
            togglePlay();
        }
    });

    // 6. Logic Functions
    function applySettingsToUI() {
        wpmSlider.value = wpm;
        wpmLabel.textContent = wpm;
        chunkSizeSlider.value = wordsPerFlash;
        chunkSizeLabel.textContent = wordsPerFlash;
        punctuationFilterToggle.checked = filterPunctuation;
        showFocalDotToggle.checked = showFocalDot;
        focalColorPicker.value = focalColor;
        dotSizeSlider.value = dotSize;
        textColorPicker.value = textColor;
        textSizeSlider.value = textSize;
        applyFocalDotVisibility();
    }

    function applyFocalDotVisibility() {
        if (showFocalDot) focalDot.classList.remove('hidden');
        else focalDot.classList.add('hidden');
    }

    function applyThemeVariables() {
        document.documentElement.style.setProperty('--focal-color', focalColor);
        document.documentElement.style.setProperty('--focal-size', `${dotSize}px`);
        document.documentElement.style.setProperty('--reader-txt-color', textColor);
        document.documentElement.style.setProperty('--reader-txt-size', `${textSize}px`);
    }

    function saveSettings() {
        localStorage.setItem('speedreader_pwa_settings', JSON.stringify({
            wpm, wordsPerFlash, filterPunctuation, showFocalDot, focalColor, dotSize, textColor, textSize
        }));
    }

    function saveLibrary() {
        localStorage.setItem('speedreader_pwa_library', JSON.stringify(library));
    }

    // PDF / TXT Local Parsing
    async function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        let text = "";
        try {
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                text = await extractTextFromPDF(file);
            } else {
                text = await file.text();
            }

            const rawWordsCount = text.trim().split(/\s+/).length;
            const newBook = {
                id: Date.now(),
                title: file.name.replace(/\.(txt|pdf)$/i, ''),
                content: text,
                lastPosition: 0,
                wordsCount: rawWordsCount,
                date: Date.now()
            };

            library.unshift(newBook);
            saveLibrary();
            renderLibrary();
        } catch (error) {
            console.error(error);
            alert("Error loading file.");
        } finally {
            fileInput.value = '';
        }
    }

    async function extractTextFromPDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const typedarray = new Uint8Array(arrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            let lastY = -1;
            let pageText = "";
            for (let item of textContent.items) {
                if (lastY !== -1) {
                    let yDiff = Math.abs(item.transform[5] - lastY);
                    if (yDiff > 12) pageText += "\n\n";
                    else if (yDiff > 4) pageText += "\n";
                    else pageText += " ";
                }
                pageText += item.str;
                lastY = item.transform[5];
            }
            fullText += pageText + "\n\n";
        }
        return fullText;
    }

    function renderLibrary() {
        bookList.innerHTML = '';
        if (library.length === 0) {
            bookList.innerHTML = '<p class="placeholder-text">Click LOAD BOOK to choose a local file.</p>';
            return;
        }

        library.forEach(book => {
            const div = document.createElement('div');
            div.className = 'book-item';
            const progressInfo = book.wordsCount > 0 ? Math.floor((book.lastPosition / (book.wordsCount - 1)) * 100) : 0;
            div.innerHTML = `
                <div style="text-align: left; flex: 1; padding-right: 10px;">
                    <strong style="font-size: 16px;">${book.title}</strong>
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">${book.wordsCount} words</div>
                </div>
                <div class="book-actions">
                    <div style="color: var(--accent-orange); font-weight: bold; margin-right: 10px;">${progressInfo}%</div>
                    <button class="action-btn rename-btn" title="Rename">
                        <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                    <button class="action-btn delete-btn" title="Delete">
                        <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                </div>
            `;

            div.onclick = (e) => {
                if (e.target.closest('.rename-btn')) {
                    e.stopPropagation();
                    const newTitle = prompt("Rename book:", book.title);
                    if (newTitle && newTitle.trim() !== '') {
                        book.title = newTitle.trim();
                        saveLibrary();
                        renderLibrary();
                    }
                    return;
                }

                if (e.target.closest('.delete-btn')) {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete "${book.title}"?`)) {
                        library = library.filter(b => b.id !== book.id);
                        saveLibrary();
                        renderLibrary();
                    }
                    return;
                }

                openBook(book);
            };

            bookList.appendChild(div);
        });
    }

    function openBook(book) {
        currentBook = book;
        bookTitle.textContent = book.title;
        processBookContent(book.content);
        currentWordIndex = book.lastPosition || 0;

        isClassicMode = false;
        rsvpView.classList.remove('hidden');
        classicView.classList.add('hidden');
        libraryView.classList.add('hidden');
        readerView.classList.remove('hidden');
        topProgressBar.classList.remove('hidden');

        updateDisplay();
    }

    function closeBook() {
        stopTimer();
        isPlaying = false;
        updatePlayIcon();
        if (currentBook) {
            currentBook.lastPosition = currentWordIndex;
            saveLibrary();
        }
        readerView.classList.add('hidden');
        topProgressBar.classList.add('hidden');
        libraryView.classList.remove('hidden');
        renderLibrary();
    }

    function processBookContent(textContent) {
        const paragraphs = textContent.replace(/\r\n/g, '\n').split(/\n\s*\n/);
        originalWords = [];
        words = [];

        paragraphs.forEach(para => {
            let paraWords = para.trim().split(/\s+/).filter(w => w.length > 0);
            if (paraWords.length === 0) return;

            let firstWord = true;
            paraWords.forEach(w => {
                originalWords.push({ text: w, paragraphStart: firstWord });
                firstWord = false;

                if (filterPunctuation) {
                    let cleaned = w.replace(/[.,/#!$%^&*;:{}=\-_`~()""'“”]/g, '');
                    words.push(cleaned.length > 0 ? cleaned : w);
                } else {
                    words.push(w);
                }
            });
        });
    }

    // Playback Engine
    function togglePlay() {
        if (words.length === 0) return;
        isPlaying = !isPlaying;
        updatePlayIcon();
        if (isPlaying) {
            if (isClassicMode) toggleViewMode();
            startTimer();
        } else stopTimer();
    }

    function updatePlayIcon() { playIconWrapper.innerHTML = isPlaying ? pauseIcon : playIcon; }

    function startTimer() {
        stopTimer();
        const intervalMs = 60000 / wpm;
        timer = setInterval(advanceWord, intervalMs);
    }

    function stopTimer() { if (timer) clearInterval(timer); }
    function restartTimer() { startTimer(); }

    function advanceWord() {
        if (currentWordIndex + wordsPerFlash >= words.length) {
            currentWordIndex = words.length - 1;
            togglePlay();
        } else {
            currentWordIndex += wordsPerFlash;
        }
        updateDisplay();
    }

    function jumpWords(amount) { jumpTo(currentWordIndex + amount); }

    function jumpTo(index) {
        currentWordIndex = Math.max(0, Math.min(index, words.length - 1));
        updateDisplay();
        if (isClassicMode) {
            highlightClassicWord();
            scrollToClassicWord();
        }
    }

    // Absolute Geometry Center Engine (RSVP)
    function renderRSVPWord() {
        let chunk = words.slice(currentWordIndex, currentWordIndex + wordsPerFlash);
        if (chunk.length === 0) {
            rsvpWordContainer.innerHTML = '';
            return;
        }

        const formatWord = (w) => `<span>${w}</span>`;

        if (wordsPerFlash === 1) {
            // Single word perfectly bound by absolute container coordinates
            rsvpWordContainer.innerHTML = formatWord(chunk[0]);
        } else {
            if (chunk.length <= 3) {
                // One line string array perfectly bound by absolute container
                let html = chunk.map(formatWord).join('');
                rsvpWordContainer.innerHTML = `<div class="rsvp-line">${html}</div>`;
            } else {
                // Two Lines Logic perfectly bound by absolute container over Focal Dot
                let lineBreakIndex = 3; // Enforce top 3 per specs
                let topChunk = chunk.slice(0, lineBreakIndex);
                let bottomChunk = chunk.slice(lineBreakIndex);

                let topHTML = topChunk.map(formatWord).join('');
                let bottomHTML = bottomChunk.map(formatWord).join('');

                rsvpWordContainer.innerHTML = `
                    <div class="rsvp-line">${topHTML}</div>
                    <div class="rsvp-line">${bottomHTML}</div>
                `;
            }
        }
    }

    function updateProgressBar() {
        const total = Math.max(1, words.length - 1);
        const percent = (currentWordIndex / total) * 100;
        progressFill.style.width = `${percent}%`;
        progressPercentage.textContent = `${percent.toFixed(1)}%`;
        progressWordCount.textContent = `${currentWordIndex} / ${words.length}`;
    }

    function updateDisplay() {
        if (!isClassicMode) renderRSVPWord();
        updateProgressBar();
    }

    // Classic Display
    function toggleViewMode() {
        isClassicMode = !isClassicMode;
        if (isClassicMode) {
            if (isPlaying) togglePlay();
            rsvpView.classList.add('hidden');
            classicView.classList.remove('hidden');
            renderClassicPage();
            scrollToClassicWord();
        } else {
            classicView.classList.add('hidden');
            rsvpView.classList.remove('hidden');
            updateDisplay();
        }
    }

    function renderClassicPage() {
        classicPage.innerHTML = '';
        const fragment = document.createDocumentFragment();
        let p = document.createElement('div');
        p.className = 'classic-paragraph';

        originalWords.forEach((wordObj, idx) => {
            if (wordObj.paragraphStart && idx > 0) {
                fragment.appendChild(p);
                p = document.createElement('div');
                p.className = 'classic-paragraph';
            }
            const span = document.createElement('span');
            span.textContent = wordObj.text + ' ';
            span.className = 'classic-word' + (idx === currentWordIndex ? ' active-word' : '');
            span.dataset.index = idx;

            span.onclick = () => {
                currentWordIndex = idx;
                highlightClassicWord();
            };
            p.appendChild(span);
        });
        fragment.appendChild(p);
        classicPage.appendChild(fragment);
    }

    function highlightClassicWord() {
        const prev = classicPage.querySelector('.active-word');
        if (prev) prev.classList.remove('active-word');
        const next = classicPage.querySelector(`[data-index="${currentWordIndex}"]`);
        if (next) next.classList.add('active-word');
        updateProgressBar();
    }

    function scrollToClassicWord() {
        const target = classicPage.querySelector(`[data-index="${currentWordIndex}"]`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setInterval(() => {
        if (currentBook && currentWordIndex > 0) {
            currentBook.lastPosition = currentWordIndex;
            saveLibrary();
        }
    }, 5000);
});
