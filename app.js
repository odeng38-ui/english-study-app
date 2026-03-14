document.addEventListener('DOMContentLoaded', () => {
    // Check if vocabData exists (from data.js)
    if (typeof vocabData === 'undefined') {
        alert('데이터를 불러오지 못했습니다. data.js 파일이 올바르게 로드되었는지 확인해주세요.');
        return;
    }

    // --- State ---
    let currentIndex = 0; // index in vocabData array
    let completedDays = JSON.parse(localStorage.getItem('englishAppCompletedDays')) || [];
    let userName = localStorage.getItem('englishAppUserName') || null;
    let lastTestDate = parseInt(localStorage.getItem('englishAppLastTestDate')) || 0;
    
    // --- Test State ---
    const TEST_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
    let testQuestions = [];
    let currentTestIndex = 0;
    let testScore = 0;
    let wrongAnswers = [];

    // --- DOM Elements ---
    const elements = {
        // User & Modals
        loginModal: document.getElementById('login-modal'),
        usernameInput: document.getElementById('username-input'),
        startLearningBtn: document.getElementById('start-learning-btn'),
        userProfile: document.getElementById('user-profile'),
        userNameDisplay: document.getElementById('user-name-display'),
        
        testModal: document.getElementById('test-modal'),
        testResultModal: document.getElementById('test-result-modal'),
        manualTestBtn: document.getElementById('manual-test-btn'),
        
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
        backExamplesList: document.getElementById('back-examples-list'),
        
        // Test Elements
        currentQuestionNum: document.getElementById('current-question-num'),
        totalQuestionNum: document.getElementById('total-question-num'),
        testQuestion: document.getElementById('test-question'),
        testOptions: document.getElementById('test-options'),
        testScore: document.getElementById('test-score'),
        testFeedback: document.getElementById('test-feedback'),
        wrongAnswersSection: document.getElementById('wrong-answers-section'),
        wrongAnswersList: document.getElementById('wrong-answers-list'),
        finishTestBtn: document.getElementById('finish-test-btn')
    };

    // --- Initialization ---
    initApp();

    function initApp() {
        initDaySelector();
        updateProgress();
        
        if (!userName) {
            // Show login
            elements.loginModal.style.display = 'flex';
        } else {
            // User exists, setup UI and check test
            elements.loginModal.style.display = 'none';
            elements.userProfile.style.display = 'flex';
            elements.userNameDisplay.textContent = userName;
            elements.manualTestBtn.style.display = 'flex';
            
            checkAndStartTest();
        }
        
        // Find first incomplete day or start from 0
        let startIndex = 0;
        while(startIndex < vocabData.length && completedDays.includes(vocabData[startIndex].day)) {
            startIndex++;
        }
        // If all completed, start at 0
        if (startIndex >= vocabData.length) startIndex = 0;
        
        loadCard(startIndex);
    }

    // --- Event Listeners ---
    
    // Login
    elements.startLearningBtn.addEventListener('click', handleLogin);
    elements.usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
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
        if (elements.loginModal.style.display !== 'none' || 
            elements.testModal.style.display !== 'none' || 
            elements.testResultModal.style.display !== 'none') {
            return; // Disable keyboard nav during modals
        }
        
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

    // Test specific
    if (elements.manualTestBtn) {
        elements.manualTestBtn.addEventListener('click', () => {
            if (completedDays.length < 5) {
                alert('테스트를 진행하려면 최소 5개의 단어를 학습 완료해야 합니다.');
                return;
            }
            startTest();
        });
    }

    elements.finishTestBtn.addEventListener('click', () => {
        elements.testResultModal.style.display = 'none';
        lastTestDate = Date.now();
        localStorage.setItem('englishAppLastTestDate', lastTestDate);
    });

    // --- Functions ---
    
    function handleLogin() {
        const name = elements.usernameInput.value.trim();
        if (name) {
            userName = name;
            localStorage.setItem('englishAppUserName', userName);
            
            // Set initial test date to now, so first test is 3 days from login
            if (!lastTestDate) {
                lastTestDate = Date.now();
                localStorage.setItem('englishAppLastTestDate', lastTestDate);
            }
            
            elements.loginModal.style.display = 'none';
            elements.userProfile.style.display = 'flex';
            elements.userNameDisplay.textContent = userName;
            elements.manualTestBtn.style.display = 'flex';
        } else {
            alert('이름을 입력해주세요.');
        }
    }
    
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
    
    // --- Test Features ---
    function checkAndStartTest() {
        if (completedDays.length < 5) return; // Need at least 5 words to test
        
        const now = Date.now();
        if (!lastTestDate) {
             lastTestDate = now;
             localStorage.setItem('englishAppLastTestDate', lastTestDate);
             return;
        }
        
        // DEV OVERRIDE (For manual verification, uncomment line below to force test)
         // lastTestDate = now - TEST_INTERVAL_MS - 1000;
        
        if (now - lastTestDate >= TEST_INTERVAL_MS) {
            startTest();
        }
    }
    
    function startTest() {
        // Select 10 random words from completed or all vocab if not enough completed
        let pool = vocabData.filter(v => completedDays.includes(v.day));
        if (pool.length < 10) pool = [...vocabData]; // fallback
        
        // Shuffle and pick 10
        const shuffled = pool.sort(() => 0.5 - Math.random());
        const selectedForTest = shuffled.slice(0, Math.min(10, shuffled.length));
        
        testQuestions = selectedForTest.map(item => {
            // Generate 3 wrong options
            const otherVerbs = vocabData.filter(v => v.verb !== item.verb).map(v => v.verb);
            const wrongOptions = otherVerbs.sort(() => 0.5 - Math.random()).slice(0, 3);
            const options = [...wrongOptions, item.verb].sort(() => 0.5 - Math.random());
            
            return {
                question: item.korean_meaning,
                answer: item.verb,
                options: options,
                day: item.day
            };
        });
        
        currentTestIndex = 0;
        testScore = 0;
        wrongAnswers = [];
        
        elements.totalQuestionNum.textContent = testQuestions.length;
        elements.testModal.style.display = 'flex';
        loadTestQuestion();
    }
    
    function loadTestQuestion() {
        const q = testQuestions[currentTestIndex];
        elements.currentQuestionNum.textContent = currentTestIndex + 1;
        elements.testQuestion.innerHTML = `다음 중 <strong>"${q.question}"</strong>의 뜻을 가진 동사는?`;
        
        elements.testOptions.innerHTML = '';
        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.textContent = opt.toUpperCase();
            btn.onclick = () => handleTestAnswer(btn, opt === q.answer, q);
            elements.testOptions.appendChild(btn);
        });
    }
    
    function handleTestAnswer(btn, isCorrect, questionData) {
        // Disable all buttons immediately
        const allBtns = elements.testOptions.querySelectorAll('.option-btn');
        allBtns.forEach(b => b.style.pointerEvents = 'none');
        
        if (isCorrect) {
            btn.classList.add('correct');
            testScore++;
        } else {
            btn.classList.add('wrong');
            wrongAnswers.push(questionData);
            // Highlight correct one
            allBtns.forEach(b => {
                 if (b.textContent === questionData.answer.toUpperCase()) {
                     b.classList.add('correct');
                 }
            });
        }
        
        setTimeout(() => {
            currentTestIndex++;
            if (currentTestIndex < testQuestions.length) {
                loadTestQuestion();
            } else {
                finishTest();
            }
        }, 1000);
    }
    
    function finishTest() {
        elements.testModal.style.display = 'none';
        
        const finalScore = Math.round((testScore / testQuestions.length) * 100);
        elements.testScore.textContent = finalScore;
        
        if (finalScore === 100) {
            elements.testFeedback.textContent = "완벽합니다! 학습을 아주 잘하고 계시네요. 🎉";
            elements.testFeedback.style.color = "var(--success)";
            elements.wrongAnswersSection.style.display = 'none';
        } else if (finalScore >= 70) {
            elements.testFeedback.textContent = "훌륭해요! 조금만 더 복습하면 완벽하겠어요. 👍";
            elements.testFeedback.style.color = "var(--primary)";
        } else {
            elements.testFeedback.textContent = "복습이 조금 더 필요해보이네요. 할 수 있어요! 💪";
            elements.testFeedback.style.color = "var(--secondary)";
        }
        
        if (wrongAnswers.length > 0) {
            elements.wrongAnswersList.innerHTML = '';
            wrongAnswers.forEach(wa => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${wa.answer.toUpperCase()}</strong>: ${wa.question} (Day ${wa.day})`;
                elements.wrongAnswersList.appendChild(li);
            });
            elements.wrongAnswersSection.style.display = 'block';
        } else {
            elements.wrongAnswersSection.style.display = 'none';
        }
        
        elements.testResultModal.style.display = 'flex';
    }
    
    // Pre-load voices for TTS
    speechSynthesis.onvoiceschanged = () => {
        // Just triggers the browser to load them into the pool
        speechSynthesis.getVoices();
    };
});
