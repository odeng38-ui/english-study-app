document.addEventListener('DOMContentLoaded', () => {
    // Check if vocabData exists (from data.js)
    if (typeof vocabData === 'undefined') {
        alert('데이터를 불러오지 못했습니다. data.js 파일이 올바르게 로드되었는지 확인해주세요.');
        return;
    }

    // --- State ---
    let currentIndex = 0; // index in vocabData array
    let completedDays = JSON.parse(localStorage.getItem('englishAppCompletedDays')) || [];

    // --- DOM Elements ---
    const elements = {
        // Progress
        progressPercentage: document.getElementById('progress-percentage'),
        progressFill: document.getElementById('progress-fill'),
        
        // Controls
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        daySelect: document.getElementById('day-select'),
        
        // Card interactions
        flashcard: document.getElementById('flashcard'),
        frontFace: document.querySelector('.card-front'),
        flipBackBtn: document.getElementById('flip-back-btn'),
        ttsBtn: document.getElementById('tts-btn'),
        completeBtn: document.getElementById('complete-btn'),
        
        // Front Content
        frontDay: document.getElementById('front-day'),
        frontChapter: document.getElementById('front-chapter'),
        frontVerb: document.getElementById('front-verb'),
        frontVerbFull: document.getElementById('front-verb-full'),
        
        // Back Content
        backDay: document.getElementById('back-day'),
        backQuote: document.getElementById('back-quote'),
        backExplanation: document.getElementById('back-explanation'),
        backExamplesList: document.getElementById('back-examples-list')
    };

    // --- Initialization ---
    initDaySelector();
    updateProgress();
    
    // Find first incomplete day or start from 0
    let startIndex = 0;
    while(startIndex < vocabData.length && completedDays.includes(vocabData[startIndex].day)) {
        startIndex++;
    }
    // If all completed, start at 0
    if (startIndex >= vocabData.length) startIndex = 0;
    
    loadCard(startIndex);

    // --- Event Listeners ---
    
    // Flip Card Logic
    // Allow clicking anywhere on the front to flip
    elements.frontFace.addEventListener('click', () => {
        elements.flashcard.classList.add('is-flipped');
    });
    
    // Explicit back button to flip back
    elements.flipBackBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent any parent handlers
        elements.flashcard.classList.remove('is-flipped');
    });

    // Navigation
    elements.prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            elements.flashcard.classList.remove('is-flipped');
            setTimeout(() => loadCard(currentIndex - 1), 300);
        }
    });

    elements.nextBtn.addEventListener('click', () => {
        if (currentIndex < vocabData.length - 1) {
            elements.flashcard.classList.remove('is-flipped');
            setTimeout(() => loadCard(currentIndex + 1), 300);
        }
    });

    elements.daySelect.addEventListener('change', (e) => {
        const newIndex = parseInt(e.target.value, 10);
        elements.flashcard.classList.remove('is-flipped');
        setTimeout(() => loadCard(newIndex), 300);
    });

    // Actions
    elements.completeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCompletion(vocabData[currentIndex].day);
    });

    elements.ttsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playTTS();
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            elements.nextBtn.click();
        } else if (e.key === 'ArrowLeft') {
            elements.prevBtn.click();
        } else if (e.key === ' ' || e.key === 'Enter') {
            // Space or Enter to flip
            if(elements.flashcard.classList.contains('is-flipped')) {
                elements.flashcard.classList.remove('is-flipped');
            } else {
                elements.flashcard.classList.add('is-flipped');
            }
        }
    });

    // --- Functions ---
    
    function initDaySelector() {
        vocabData.forEach((item, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `Day ${item.day} - ${item.verb}`;
            elements.daySelect.appendChild(option);
        });
    }

    function loadCard(index) {
        currentIndex = index;
        const currentData = vocabData[index];
        
        // Populate Front
        elements.frontDay.textContent = `DAY ${currentData.day}`;
        elements.frontChapter.textContent = currentData.chapter;
        elements.frontVerb.textContent = currentData.verb.toUpperCase();
        elements.frontVerbFull.textContent = currentData.korean_meaning; // Using korean meaning for front hint
        
        // Populate Back
        elements.backDay.textContent = `DAY ${currentData.day}`;
        elements.backQuote.textContent = currentData.quote || "예문이 없습니다.";
        elements.backExplanation.textContent = currentData.explanation;
        
        // Populate Examples
        elements.backExamplesList.innerHTML = '';
        if (currentData.examples && currentData.examples.length > 0) {
            currentData.examples.forEach(ex => {
                const li = document.createElement('li');
                li.textContent = ex;
                elements.backExamplesList.appendChild(li);
            });
        }
        
        // Sync Dropdown
        elements.daySelect.value = index;
        
        // Update Nav buttons
        elements.prevBtn.disabled = index === 0;
        elements.nextBtn.disabled = index === vocabData.length - 1;
        
        // Update Completion Status
        updateCompleteBtnState();
    }

    function toggleCompletion(day) {
        const index = completedDays.indexOf(day);
        if (index > -1) {
            completedDays.splice(index, 1);
        } else {
            completedDays.push(day);
            // Add pulse animation
            elements.completeBtn.classList.remove('pulse-animation');
            void elements.completeBtn.offsetWidth; // trigger reflow
            elements.completeBtn.classList.add('pulse-animation');
            
            // Auto next after tiny delay if completing
            if (currentIndex < vocabData.length - 1) {
                setTimeout(() => {
                    elements.nextBtn.click();
                }, 1000);
            }
        }
        
        localStorage.setItem('englishAppCompletedDays', JSON.stringify(completedDays));
        updateProgress();
        updateCompleteBtnState();
    }

    function updateCompleteBtnState() {
        const currentDay = vocabData[currentIndex].day;
        if (completedDays.includes(currentDay)) {
            elements.completeBtn.classList.add('completed');
        } else {
            elements.completeBtn.classList.remove('completed');
        }
    }

    function updateProgress() {
        const total = vocabData.length;
        const completed = completedDays.length;
        const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
        
        elements.progressPercentage.textContent = `${percentage}%`;
        elements.progressFill.style.width = `${percentage}%`;
    }

    function playTTS() {
        if (!('speechSynthesis' in window)) {
            alert('이 브라우저에서는 음성 듣기를 지원하지 않습니다.');
            return;
        }

        const currentData = vocabData[currentIndex];
        // Combine quote and examples for reading
        let textToRead = currentData.quote ? currentData.quote + ". " : "";
        if (currentData.examples) {
            textToRead += currentData.examples.join(". ");
        }

        if (!textToRead) return;

        // Visual feedback
        elements.ttsBtn.style.color = 'var(--primary)';
        
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'en-US';
        utterance.rate = 0.9; // slightly slower for clearer listening
        
        // Attempt to find a good English voice
        const voices = speechSynthesis.getVoices();
        const engVoice = voices.find(voice => voice.lang.includes('en-US') && (voice.name.includes('Google') || voice.name.includes('Samantha')));
        if (engVoice) utterance.voice = engVoice;

        utterance.onend = () => {
             elements.ttsBtn.style.color = '';
        };

        speechSynthesis.cancel(); // Stop any currently playing
        speechSynthesis.speak(utterance);
    }
    
    // Pre-load voices for TTS
    speechSynthesis.onvoiceschanged = () => {
        // Just triggers the browser to load them into the pool
        speechSynthesis.getVoices();
    };
});
