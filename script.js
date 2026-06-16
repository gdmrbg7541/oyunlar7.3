// OYUN İSKELETİNİ GİZLEME VE DİNAMİK YÜKLEME FONKSİYONU
function buildHTMLSkeleton() {
    const gameWrapper = document.createElement('div');
    gameWrapper.innerHTML = `
        <div class="game-card" id="startScreen">
            <a href="index.html" class="home-button">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
            </a>
            <h1>لُعْبَة السَّفَر </h1>
            <button onclick="startGame()">اِبْدَأْ</button>
        </div>

        <div class="game-card hidden" id="gameScreen">
            <a href="#" onclick="location.reload()" class="back-button">
                <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
            </a>
            <div class="instructions">
                💡 <b>اِخْتَر الصّور المُناسِبَة لِلْجُمْلَة.</b>
            </div>
            <div class="progress-container" id="progressBar">
                <div class="progress-step"></div>
                <div class="progress-step"></div>
                <div class="progress-step"></div>
            </div>
            <div class="sentence-box" id="targetSentence">جاري التحميل...</div>
            <div class="pickers-container">
                 <div class="picker-column" id="person-picker"></div>
                 <div class="selection-overlay"></div>
                 <div class="picker-column" id="place-picker"></div>
                 <div class="picker-column" id="transport-picker"></div>
            </div>
            <div class="controls">
                <button id="checkBtn" onclick="checkAnswer()">تَأْكيد</button>
                <button id="nextBtn" class="hidden" onclick="nextQuestion()">السُّؤال التّالي</button>
            </div>
        </div>

        <div class="game-card hidden" id="nextStudentScreen">
            <h2 style="font-size: 3rem; color: var(--success);">أَحْسَنْت! 🎉</h2>
            <p style="font-size: 1.5rem;">لَقَد أَكْمَلْت جَميع الأَسْئِلَة.</p>
            <button onclick="resetGame()">تَغْيير الطّالِب</button>
        </div>

        <audio id="soundGuide" src="yonergeseyahat.mp3"></audio>
        <audio id="soundCorrect" src="https://freesound.org/data/previews/270/270402_5123851-lq.mp3" crossorigin="anonymous"></audio>
        <audio id="soundWrong" src="https://freesound.org/data/previews/415/415764_6081716-lq.mp3" crossorigin="anonymous"></audio>
        <audio id="soundSpin" src="kadran.m4a"></audio>
    `;
    document.body.appendChild(gameWrapper);
}

// OYUN MANTIĞI
let currentQuestion = 0;
let questions = [];
let audioCtx;

// Sayfa yüklendiğinde iskeleti kur
document.addEventListener('DOMContentLoaded', () => {
    buildHTMLSkeleton();
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
});

function playTone(type) {
    if (audioCtx.state === 'suspended') { audioCtx.resume(); }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine'; 
    const now = audioCtx.currentTime;
    
    if (type === 'correct') {
        oscillator.frequency.setValueAtTime(440, now);
        oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
    } else {
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.2);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        oscillator.start(now);
        oscillator.stop(now + 0.4);
    }
}

function startGame() {
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    const guideAudio = document.getElementById('soundGuide');
    guideAudio.play().catch(e => console.log("Ses çalınamadı (Etkileşim gerekiyor)"));
    initPickers();
    generateRound();
    spinPickers();
}

function initPickers() {
    fillColumn('person-picker', data.persons);
    fillColumn('place-picker', data.places);
    fillColumn('transport-picker', data.transports);
    
    document.querySelectorAll('.picker-column').forEach(col => {
        col.addEventListener('scroll', () => {
            const itemHeight = 120;
            const totalItems = col.querySelectorAll('.picker-item').length;
            const originalCount = totalItems - 6;

            if (col.scrollTop >= (originalCount + 3) * itemHeight) { col.scrollTop = 3 * itemHeight; }
            if (col.scrollTop <= 0) { col.scrollTop = originalCount * itemHeight; }
            updateActiveItem(col);
        });
    });
}

function fillColumn(id, items) {
    const col = document.getElementById(id);
    const clonesBefore = items.slice(-3);
    const clonesAfter = items.slice(0, 3);
    const combined = [...clonesBefore, ...items, ...clonesAfter];

    col.innerHTML = combined.map(item => `<div class="picker-item" data-val="${item.ar}">${item.emoji}</div>`).join('');
    setTimeout(() => { col.scrollTop = 120 * 3; }, 10);
}

function spinPickers() {
    const spinAudio = document.getElementById('soundSpin');
    spinAudio.currentTime = 0; 
    spinAudio.play().catch(() => {}); 
    let maxDuration = 0; 

    document.querySelectorAll('.picker-column').forEach((col, index) => {
        col.style.scrollSnapType = 'none';
        col.style.overflowY = 'hidden';
        
        const duration = 2 + Math.random();
        if (duration > maxDuration) maxDuration = duration; 

        const items = col.querySelectorAll('.picker-item');
        const animationName = index === 1 ? 'spinUp' : 'spinDown';

        items.forEach(item => {
            item.style.animation = `${animationName} ${duration}s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`;
        });
        setTimeout(() => { stopAndRelease(col); }, duration * 1000);
    });

    setTimeout(() => {
        spinAudio.pause();
        spinAudio.currentTime = 0;
    }, maxDuration * 1000);
}

function stopAndRelease(col) {
    if (col.style.overflowY === 'scroll') return;
    const itemHeight = 120;
    const items = col.querySelectorAll('.picker-item');
    items.forEach(item => item.style.animation = 'none');
    const randomIndex = Math.floor(Math.random() * (items.length - 6)) + 3;
    col.style.overflowY = 'scroll';
    col.scrollTop = randomIndex * itemHeight;
    col.style.scrollSnapType = 'y mandatory';
    updateActiveItem(col);
}

function updateActiveItem(col) {
    const items = col.querySelectorAll('.picker-item');
    let closest = null;
    let minDistance = Infinity;
    const containerCenter = col.getBoundingClientRect().top + col.getBoundingClientRect().height / 2;

    items.forEach(item => {
        const rect = item.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const distance = Math.abs(center - containerCenter);
        if (distance < minDistance) { minDistance = distance; closest = item; }
        item.classList.remove('active');
    });
    if (closest) closest.classList.add('active');
}

function generateRound() {
    const shuffled = [...presetSentences].sort(() => 0.5 - Math.random());
    questions = shuffled.slice(0, 3).map(item => {
        const verb = item.g === 'm' ? item.v_m : item.v_f;
        const transportClean = item.t.replace(/\./g, '').trim();
        return {
            sentence: `${verb} ${item.p} ${item.l} ${transportClean}.`, 
            p: item.p.trim(), l: item.l.trim(), t: transportClean
        };
    });
    showQuestion();
}

function showQuestion() {
    const q = questions[currentQuestion];
    const targetBox = document.getElementById('targetSentence');
    const verb = q.sentence.split(' ')[0];
    let cleanPlace = q.l.replace(/^إِلى\s+/, '').trim();

    targetBox.innerHTML = `
        <span class="static-word">${verb}</span>
        <span class="flash-red">${q.p}</span>
        <span class="static-word">إِلى</span>
        <span class="flash-blue">${cleanPlace}</span>
        <span class="flash-green no-margin">${q.t}</span><span class="static-word no-margin">.</span>
    `;
    resetUI();
}

function resetUI() {
    document.querySelectorAll('.picker-column').forEach(c => c.classList.remove('correct', 'wrong'));
    document.getElementById('checkBtn').classList.remove('hidden');
    document.getElementById('nextBtn').classList.add('hidden');
}

function checkAnswer() {
    const q = questions[currentQuestion];
    const selP = document.querySelector('#person-picker .picker-item.active')?.getAttribute('data-val');
    const selL = document.querySelector('#place-picker .picker-item.active')?.getAttribute('data-val');
    const selT = document.querySelector('#transport-picker .picker-item.active')?.getAttribute('data-val');
    const clean = (str) => str ? str.replace(/\./g, '').trim() : "";

    const isP = clean(selP) === clean(q.p);
    const isL = clean(selL) === clean(q.l);
    const isT = clean(selT) === clean(q.t);

    const pCol = document.getElementById('person-picker');
    const lCol = document.getElementById('place-picker');
    const tCol = document.getElementById('transport-picker');

    pCol.classList.remove('correct', 'wrong'); lCol.classList.remove('correct', 'wrong'); tCol.classList.remove('correct', 'wrong');
    pCol.classList.add(isP ? 'correct' : 'wrong'); lCol.classList.add(isL ? 'correct' : 'wrong'); tCol.classList.add(isT ? 'correct' : 'wrong');

    const step = document.querySelectorAll('.progress-step')[currentQuestion];
    if (isP && isL && isT) {
        playTone('correct');
        step.style.background = 'var(--success)';
        document.getElementById('checkBtn').classList.add('hidden');
        document.getElementById('nextBtn').classList.remove('hidden');
    } else {
        playTone('wrong');
        step.style.background = 'var(--error)';
    }
}

function nextQuestion() {
    currentQuestion++;
    if (currentQuestion < 3) { showQuestion(); spinPickers(); } 
    else { document.getElementById('gameScreen').classList.add('hidden'); document.getElementById('nextStudentScreen').classList.remove('hidden'); }
}

function resetGame() {
    currentQuestion = 0;
    document.querySelectorAll('.progress-step').forEach(s => s.style.background = '#ddd');
    document.getElementById('nextStudentScreen').classList.add('hidden');
    startGame();
}