document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM Elements ----
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
    const rsvpWordContainer = document.getElementById('rsvpWordContainer');
    const classicView = document.getElementById('classicView');
    const classicPage = document.getElementById('classicPage');
    const focalDot = document.getElementById('focal-dot');

    const jumpBackBtn = document.getElementById('jumpBackBtn');
    const resetBtn = document.getElementById('resetBtn');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIconWrapper = document.getElementById('playIconWrapper');
    const toggleModeBtn = document.getElementById('toggleModeBtn');
    const jumpFwdBtn = document.getElementById('jumpFwdBtn');

    const settingsToggleBtn = document.getElementById('settingsToggleBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const wpmSlider = document.getElementById('wpmSlider');
    const wpmLabel = document.getElementById('wpmLabel');
    const chunkSizeSlider = document.getElementById('chunkSizeSlider');
    const chunkSizeLabel = document.getElementById('chunkSizeLabel');
    const punctuationFilterToggle = document.getElementById('punctuationFilterToggle');
    const dotSizeSlider = document.getElementById('dotSizeSlider');
    const dotSizeLabel = document.getElementById('dotSizeLabel');
    const textSizeSlider = document.getElementById('textSizeSlider');
    const textSizeLabel = document.getElementById('textSizeLabel');
    const focalColorPicker = document.getElementById('focalColor');
    const showFocalDotToggle = document.getElementById('showFocalDotToggle');
    const textColorPicker = document.getElementById('textColor');
    const textBgColorPicker = document.getElementById('textBgColor');

    // ---- Application State ----
    let library = JSON.parse(localStorage.getItem('speedreader_cinematic_library') || '[]');
    let savedSettings = JSON.parse(localStorage.getItem('speedreader_cinematic_settings') || '{}');

    let currentBook = null;
    let words = [];             // Cleaned words for RSVP
    let originalWords = [];     // Raw words with punctuation for Classic mode
    let currentWordIndex = 0;

    let isPlaying = false;
    let timer = null;
    let isClassicMode = false;

    // Load Settings
    let wpm = savedSettings.wpm || 300;
    let wordsPerFlash = savedSettings.wordsPerFlash || 1;
    let filterPunctuation = savedSettings.filterPunctuation !== undefined ? savedSettings.filterPunctuation : true;
    let focalColor = savedSettings.focalColor || '#ff0000';
    let showFocalDot = savedSettings.showFocalDot !== undefined ? savedSettings.showFocalDot : true;
    let textColor = savedSettings.textColor || '#ffffff';
    let textBgColor = savedSettings.textBgColor || 'transparent';
    let dotSize = savedSettings.dotSize || 6;
    let textSize = savedSettings.textSize || 64;

    // ---- Icons ----
    const playIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    const pauseIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

    // ---- Init ----
    applySettingsToUI();
    applyThemeVariables();
    renderLibrary();

    // ---- Event Listeners ----
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

    dotSizeSlider.addEventListener('input', (e) => {
        dotSize = parseInt(e.target.value);
        dotSizeLabel.textContent = dotSize;
        applyThemeVariables();
        saveSettings();
    });

    textSizeSlider.addEventListener('input', (e) => {
        textSize = parseInt(e.target.value);
        textSizeLabel.textContent = textSize;
        applyThemeVariables();
        saveSettings();
    });

    focalColorPicker.addEventListener('input', (e) => {
        focalColor = e.target.value;
        applyThemeVariables();
        saveSettings();
    });

    showFocalDotToggle.addEventListener('change', (e) => {
        showFocalDot = e.target.checked;
        saveSettings();
        applyFocalDotVisibility();
    });

    textColorPicker.addEventListener('input', (e) => {
        textColor = e.target.value;
        applyThemeVariables();
        saveSettings();
    });

    textBgColorPicker.addEventListener('input', (e) => {
        textBgColor = e.target.value;
        applyThemeVariables();
        saveSettings();
    });

    // Spacebar control
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !readerView.classList.contains('hidden')) {
            e.preventDefault();
            togglePlay();
        }
    });

    // ---- Functions ----
    function applySettingsToUI() {
        wpmSlider.value = wpm;
        wpmLabel.textContent = wpm;
        chunkSizeSlider.value = wordsPerFlash;
        chunkSizeLabel.textContent = wordsPerFlash;
        punctuationFilterToggle.checked = filterPunctuation;
        dotSizeSlider.value = dotSize;
        dotSizeLabel.textContent = dotSize;
        textSizeSlider.value = textSize;
        textSizeLabel.textContent = textSize;
        focalColorPicker.value = focalColor;
        showFocalDotToggle.checked = showFocalDot;
        textColorPicker.value = textColor;
        textBgColorPicker.value = textBgColor === 'transparent' ? '#000000' : textBgColor;
        applyFocalDotVisibility();
    }

    function applyFocalDotVisibility() {
        if (showFocalDot) {
            focalDot.classList.remove('hidden');
        } else {
            focalDot.classList.add('hidden');
        }
    }

    function applyThemeVariables() {
        document.documentElement.style.setProperty('--focal-color', focalColor);
        document.documentElement.style.setProperty('--reader-txt-color', textColor);
        document.documentElement.style.setProperty('--reader-bg-color', textBgColor);
        document.documentElement.style.setProperty('--focal-size', `${dotSize}px`);
        document.documentElement.style.setProperty('--reader-txt-size', `${textSize}px`);
    }

    function saveSettings() {
        localStorage.setItem('speedreader_cinematic_settings', JSON.stringify({
            wpm, wordsPerFlash, filterPunctuation, focalColor, textColor, textBgColor, dotSize, textSize, showFocalDot
        }));
    }

    function saveLibrary() {
        localStorage.setItem('speedreader_cinematic_library', JSON.stringify(library));
    }

    // Local file parsing (TXT and PDF)
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

            // Raw word count rough estimate
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
            console.error("Error reading file:", error);
            alert("Could not load the file. Make sure it is a valid text or PDF file.");
        } finally {
            fileInput.value = ''; // reset
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
                    if (yDiff > 12) {
                        pageText += "\n\n";
                    } else if (yDiff > 4) {
                        pageText += "\n";
                    } else {
                        pageText += " ";
                    }
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
            bookList.innerHTML = '<p class="placeholder-text">Click LOAD BOOK to choose a local .TXT or .PDF file.</p>';
            return;
        }

        library.forEach(book => {
            const div = document.createElement('div');
            // Reusing a similar dark aesthetic class style
            div.style.background = '#111';
            div.style.padding = '15px';
            div.style.borderRadius = '6px';
            div.style.marginBottom = '10px';
            div.style.cursor = 'pointer';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';

            const progressInfo = book.wordsCount > 0 ? Math.floor((book.lastPosition / (book.wordsCount - 1)) * 100) : 0;

            div.innerHTML = `
                <div style="text-align: left;">
                    <strong style="font-size: 16px;">${book.title}</strong>
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">${book.wordsCount} words</div>
                </div>
                <div style="color: var(--accent-orange); font-weight: bold;">${progressInfo}%</div>
            `;

            div.onmouseover = () => div.style.background = '#1a1a1a';
            div.onmouseout = () => div.style.background = '#111';
            div.onclick = () => openBook(book);

            bookList.appendChild(div);
        });
    }

    function openBook(book) {
        currentBook = book;
        bookTitle.textContent = book.title;
        processBookContent(book.content);
        currentWordIndex = book.lastPosition || 0;

        // Force RSVP mode on load
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

    function togglePlay() {
        if (words.length === 0) return;
        isPlaying = !isPlaying;
        updatePlayIcon();

        if (isPlaying) {
            if (isClassicMode) toggleViewMode(); // Auto switch to RSVP if playing while in classic
            startTimer();
        } else {
            stopTimer();
        }
    }

    function updatePlayIcon() {
        playIconWrapper.innerHTML = isPlaying ? pauseIcon : playIcon;
    }

    function startTimer() {
        stopTimer();
        const intervalMs = 60000 / wpm;
        timer = setInterval(advanceWord, intervalMs);
    }

    function stopTimer() {
        if (timer) clearInterval(timer);
    }

    function restartTimer() {
        startTimer();
    }

    function advanceWord() {
        if (currentWordIndex + wordsPerFlash >= words.length) {
            currentWordIndex = words.length - 1; // Or close to it
            togglePlay(); // stop
        } else {
            currentWordIndex += wordsPerFlash;
        }
        updateDisplay();
    }

    function jumpWords(amount) {
        jumpTo(currentWordIndex + amount);
    }

    function jumpTo(index) {
        currentWordIndex = Math.max(0, Math.min(index, words.length - 1));
        updateDisplay();
        if (isClassicMode) {
            highlightClassicWord();
            scrollToClassicWord();
        }
    }

    // Mathematical Center Engine
    function renderRSVPWord() {
        // Multi-word logic
        let chunk = words.slice(currentWordIndex, currentWordIndex + wordsPerFlash);
        if (chunk.length === 0) {
            rsvpWordContainer.innerHTML = '';
            rsvpWordContainer.className = 'rsvp-word-wrapper';
            return;
        }

        const formatWord = (word) => {
            return `<span style="margin: 0 8px;">${word}</span>`;
        };

        if (wordsPerFlash === 1) {
            // Standard Single-Word 
            // The absolute positioning of `.rsvp-word-wrapper` centers it automatically over the `#focal-dot`.
            rsvpWordContainer.className = 'rsvp-word-wrapper';
            rsvpWordContainer.innerHTML = `<span>${chunk[0]}</span>`;

        } else {
            // Multi-Word Paragraph Block Layout
            rsvpWordContainer.className = 'rsvp-multi-line';
            let topHTML = '';
            let bottomHTML = '';

            if (chunk.length <= 3) {
                // Single line
                topHTML = chunk.map(word => formatWord(word)).join('');
                rsvpWordContainer.innerHTML = `<div class="rsvp-line">${topHTML}</div>`;
            } else {
                // Two lines
                let lineBreakIndex = 3;
                let topChunk = chunk.slice(0, lineBreakIndex);
                let bottomChunk = chunk.slice(lineBreakIndex);

                topHTML = topChunk.map(word => formatWord(word)).join('');
                bottomHTML = bottomChunk.map(word => formatWord(word)).join('');

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
        if (!isClassicMode) {
            renderRSVPWord();
        }
        updateProgressBar();
    }

    // Classic Mode
    function toggleViewMode() {
        isClassicMode = !isClassicMode;

        if (isClassicMode) {
            if (isPlaying) togglePlay(); // Pause RSVP

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

        updateProgressBar(); // Keep bar synced
    }

    function scrollToClassicWord() {
        const target = classicPage.querySelector(`[data-index="${currentWordIndex}"]`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Auto-save progress periodically
    setInterval(() => {
        if (currentBook && currentWordIndex > 0) {
            currentBook.lastPosition = currentWordIndex;
            saveLibrary();
        }
    }, 5000);
});
