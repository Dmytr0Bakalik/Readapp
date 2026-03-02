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

    // PDF View Elements
    const pdfView = document.getElementById('pdfView');
    const pdfBackBtn = document.getElementById('pdfBackBtn');
    const pdfPrevBtn = document.getElementById('pdfPrevBtn');
    const pdfNextBtn = document.getElementById('pdfNextBtn');
    const pdfPageInput = document.getElementById('pdfPageInput');
    const pdfPageCount = document.getElementById('pdfPageCount');
    const pdfZoomOutBtn = document.getElementById('pdfZoomOutBtn');
    const pdfZoomInBtn = document.getElementById('pdfZoomInBtn');
    const pdfFitBtn = document.getElementById('pdfFitBtn');
    const pdfSearchInput = document.getElementById('pdfSearchInput');
    const pdfSearchPrev = document.getElementById('pdfSearchPrev');
    const pdfSearchNext = document.getElementById('pdfSearchNext');
    const startRsvpFromPageBtn = document.getElementById('startRsvpFromPageBtn');
    const pdfCanvas = document.getElementById('pdfCanvas');
    const pdfTextLayer = document.getElementById('pdfTextLayer');
    const ctx = pdfCanvas.getContext('2d');

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

    // PDF State
    let pdfDoc = null;
    let pageNum = 1;
    let pageRendering = false;
    let pageNumPending = null;
    let pdfScale = 1.0;
    let textMatches = [];
    let currentMatchIdx = -1;

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

        try {
            let isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            let newBook;

            if (isPdf) {
                // Store base64 or ArrayBuffer for native rendering
                const arrayBuffer = await file.arrayBuffer();
                const base64String = btoa(
                    new Uint8Array(arrayBuffer)
                        .reduce((data, byte) => data + String.fromCharCode(byte), '')
                );

                newBook = {
                    id: Date.now(),
                    title: file.name.replace(/\.(txt|pdf)$/i, ''),
                    isPdf: true,
                    pdfData: base64String, // Store raw for PDF.js
                    lastPdfPage: 1, // Smart Bookmarking
                    date: Date.now()
                };
            } else {
                let text = await file.text();
                const rawWordsCount = text.trim().split(/\s+/).length;
                newBook = {
                    id: Date.now(),
                    title: file.name.replace(/\.(txt|pdf)$/i, ''),
                    isPdf: false,
                    content: text,
                    lastPosition: 0,
                    wordsCount: rawWordsCount,
                    date: Date.now()
                };
            }

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

    // Removed `extractTextFromPDF` block entirely because we will read raw base64.

    function renderLibrary() {
        bookList.innerHTML = '';
        if (library.length === 0) {
            bookList.innerHTML = '<p class="placeholder-text">Click LOAD BOOK to choose a local file.</p>';
            return;
        }

        library.forEach(book => {
            const div = document.createElement('div');
            div.className = 'book-item';

            let metadataHTML = '';
            if (book.isPdf) {
                metadataHTML = `<div style="font-size: 12px; color: var(--accent-orange); margin-top: 4px;">PDF Document - Paused on Page ${book.lastPdfPage || 1}</div>`;
            } else {
                const progressInfo = book.wordsCount > 0 ? Math.floor((book.lastPosition / (book.wordsCount - 1)) * 100) : 0;
                metadataHTML = `
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">${book.wordsCount} words</div>
                    <div style="color: var(--accent-orange); font-weight: bold; position: absolute; right: 100px;">${progressInfo}%</div>
                `;
            }

            div.innerHTML = `
                <div style="text-align: left; flex: 1; padding-right: 10px; position:relative;">
                    <strong style="font-size: 16px;">${book.title}</strong>
                    ${metadataHTML}
                </div>
                <div class="book-actions">
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

        if (book.isPdf) {
            libraryView.classList.add('hidden');
            readerView.classList.remove('hidden');
            rsvpView.classList.add('hidden');
            classicView.classList.add('hidden');
            topProgressBar.classList.add('hidden');
            pdfView.classList.remove('hidden');

            // Re-hide NEVER Control bar while in PDF mode
            document.querySelector('.controls-bar').classList.add('hidden');
            document.getElementById('settingsToggleBtn').classList.add('hidden');

            loadPdfDocument(book);

        } else {
            processBookContent(book.content);
            currentWordIndex = book.lastPosition || 0;

            isClassicMode = false;
            libraryView.classList.add('hidden');
            readerView.classList.remove('hidden');
            pdfView.classList.add('hidden');
            classicView.classList.add('hidden');
            rsvpView.classList.remove('hidden');
            topProgressBar.classList.remove('hidden');

            // Restore Control Bar
            document.querySelector('.controls-bar').classList.remove('hidden');
            document.getElementById('settingsToggleBtn').classList.remove('hidden');

            updateDisplay();
        }
    }

    function closeBook() {
        stopTimer();
        isPlaying = false;
        updatePlayIcon();
        if (currentBook) {
            if (currentBook.isPdf) currentBook.lastPdfPage = pageNum;
            else currentBook.lastPosition = currentWordIndex;
            saveLibrary();
        }
        readerView.classList.add('hidden');
        pdfView.classList.add('hidden');
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
        if (currentBook && currentWordIndex > 0 && !currentBook.isPdf) {
            currentBook.lastPosition = currentWordIndex;
            saveLibrary();
        }
    }, 5000);

    // ----------------------------------------------------
    // PDF NATIVE RENDERING ENGINE
    // ----------------------------------------------------
    function loadPdfDocument(book) {
        // Decode base64
        const binaryString = atob(book.pdfData);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        loadingTask.promise.then(function (pdf) {
            pdfDoc = pdf;
            pdfPageCount.textContent = pdf.numPages;
            pdfPageInput.max = pdf.numPages;

            // Smart Bookmarking: Resume from saved page
            pageNum = book.lastPdfPage || 1;
            renderPage(pageNum);
        }).catch(function (error) {
            console.error('Error opening PDF:', error);
            alert("Could not render the PDF document.");
        });
    }

    function renderPage(num) {
        pageRendering = true;

        pdfDoc.getPage(num).then(function (page) {
            // Adaptive scale based on screen width
            const containerWidth = document.getElementById('pdfViewerWrapper').clientWidth || window.innerWidth;
            const unscaledViewport = page.getViewport({ scale: 1.0 });

            // Adjust scale if not manually zoomed
            if (pdfScale === 1.0) {
                pdfScale = (containerWidth * 0.9) / unscaledViewport.width;
                if (pdfScale > 2) pdfScale = 2; // Sanity max
                if (pdfScale < 0.5) pdfScale = 0.5; // Sanity min
            }

            const viewport = page.getViewport({ scale: pdfScale });
            pdfCanvas.height = viewport.height;
            pdfCanvas.width = viewport.width;

            // Render PDF page into canvas context
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            const renderTask = page.render(renderContext);

            renderTask.promise.then(function () {
                pageRendering = false;
                if (pageNumPending !== null) {
                    renderPage(pageNumPending);
                    pageNumPending = null;
                }

                // Clear and render text layer for search selection
                return page.getTextContent();
            }).then(function (textContent) {
                pdfTextLayer.innerHTML = '';
                pdfTextLayer.style.left = pdfCanvas.offsetLeft + 'px';
                pdfTextLayer.style.top = pdfCanvas.offsetTop + 'px';
                pdfTextLayer.style.height = pdfCanvas.offsetHeight + 'px';
                pdfTextLayer.style.width = pdfCanvas.offsetWidth + 'px';

                pdfjsLib.renderTextLayer({
                    textContent: textContent,
                    container: pdfTextLayer,
                    viewport: viewport,
                    textDivs: []
                });
            });
        });

        // Update page counters
        pdfPageInput.value = num;
        pdfPageInput.blur();
        if (currentBook) {
            currentBook.lastPdfPage = num;
            saveLibrary();
        }
    }

    function queueRenderPage(num) {
        if (pageRendering) {
            pageNumPending = num;
        } else {
            renderPage(num);
        }
    }

    // PDF Toolbar Actions
    pdfPrevBtn.addEventListener('click', () => {
        if (pageNum <= 1) return;
        pageNum--;
        queueRenderPage(pageNum);
    });

    pdfNextBtn.addEventListener('click', () => {
        if (pageNum >= pdfDoc.numPages) return;
        pageNum++;
        queueRenderPage(pageNum);
    });

    pdfPageInput.addEventListener('change', (e) => {
        let desiredPage = parseInt(e.target.value);
        if (desiredPage >= 1 && desiredPage <= pdfDoc.numPages) {
            pageNum = desiredPage;
            queueRenderPage(pageNum);
        } else {
            e.target.value = pageNum;
        }
    });

    pdfBackBtn.addEventListener('click', closeBook);

    pdfZoomInBtn.addEventListener('click', () => {
        pdfScale += 0.2;
        queueRenderPage(pageNum);
    });

    pdfZoomOutBtn.addEventListener('click', () => {
        if (pdfScale <= 0.4) return;
        pdfScale -= 0.2;
        queueRenderPage(pageNum);
    });

    pdfFitBtn.addEventListener('click', () => {
        pdfScale = 1.0;
        queueRenderPage(pageNum);
    });

    // ----------------------------------------------------
    // PDF NATIVE SEARCH (Highlighting the Text Layer)
    // ----------------------------------------------------
    function performPdfSearch() {
        // Clear old highlights
        const textDivs = pdfTextLayer.querySelectorAll('span');
        textDivs.forEach(div => {
            div.innerHTML = div.textContent; // reset to raw text
            div.classList.remove('highlight', 'selected');
        });

        const query = pdfSearchInput.value.toLowerCase().trim();
        if (!query) return;

        textMatches = [];
        textDivs.forEach((div, index) => {
            const text = div.textContent.toLowerCase();
            if (text.includes(query)) {
                // Wrap matching substring in highlight span
                const rawText = div.textContent;
                const matchIndex = text.indexOf(query);
                const before = rawText.substring(0, matchIndex);
                const match = rawText.substring(matchIndex, matchIndex + query.length);
                const after = rawText.substring(matchIndex + query.length);

                div.innerHTML = `${before}<span class="highlight" data-match-idx="${textMatches.length}">${match}</span>${after}`;
                textMatches.push(div.querySelector('.highlight'));
            }
        });

        if (textMatches.length > 0) {
            currentMatchIdx = 0;
            focusSearchMatch();
        } else {
            currentMatchIdx = -1;
        }
    }

    function focusSearchMatch() {
        if (textMatches.length === 0 || currentMatchIdx < 0) return;
        textMatches.forEach(el => el.classList.remove('selected'));
        const activeMatch = textMatches[currentMatchIdx];
        activeMatch.classList.add('selected');
        activeMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    pdfSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performPdfSearch();
    });

    pdfSearchNext.addEventListener('click', () => {
        if (textMatches.length === 0) return;
        currentMatchIdx = (currentMatchIdx + 1) % textMatches.length;
        focusSearchMatch();
    });

    pdfSearchPrev.addEventListener('click', () => {
        if (textMatches.length === 0) return;
        currentMatchIdx = (currentMatchIdx - 1 + textMatches.length) % textMatches.length;
        focusSearchMatch();
    });

    // ----------------------------------------------------
    // PDF TO RSVP SYNCING ("Read from this page")
    // ----------------------------------------------------
    startRsvpFromPageBtn.addEventListener('click', async () => {
        if (!pdfDoc) return;

        // Capture user selected text before DOM changes
        const userSelection = window.getSelection().toString().trim();

        startRsvpFromPageBtn.textContent = 'EXTRACTING...';
        startRsvpFromPageBtn.disabled = true;

        let fullText = "";
        try {
            // Extract from CURRENT page to END
            for (let i = pageNum; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
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

            // Sync into RSVP Engine
            processBookContent(fullText);
            currentWordIndex = 0; // Starts at 0 relative to the extracted sequence

            // If user highlighted a specific word to start from
            if (userSelection) {
                // Grab the first word of their selection to match against our parsed array
                const firstSelectedWord = userSelection.split(/\s+/)[0];

                // We only search the start of the extracted text (the current page) to avoid jumping to another page's duplicate word
                const limit = Math.min(originalWords.length, 1000);
                for (let i = 0; i < limit; i++) {
                    if (originalWords[i].text.includes(firstSelectedWord)) {
                        currentWordIndex = i;
                        break;
                    }
                }
            }

            isClassicMode = false;
            pdfView.classList.add('hidden');
            rsvpView.classList.remove('hidden');
            topProgressBar.classList.remove('hidden');

            // Restore Controls
            document.querySelector('.controls-bar').classList.remove('hidden');
            document.getElementById('settingsToggleBtn').classList.remove('hidden');

            // Clear the browser selection so it doesn't linger
            window.getSelection().removeAllRanges();

            updateDisplay();

        } catch (error) {
            console.error("Error extracting text for RSVP: ", error);
            alert("Failed to extract text from this PDF page.");
        } finally {
            startRsvpFromPageBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" style="margin-right:8px;"><path d="M8 5v14l11-7z"/></svg> READ FROM HERE`;
            startRsvpFromPageBtn.disabled = false;
        }
    });

});
