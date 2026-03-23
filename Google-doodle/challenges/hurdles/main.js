const player = document.getElementById('player');
const road = document.getElementById('road-main');
const scoreEl = document.getElementById('score-val');
const locationEl = document.querySelector('#location span');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const pauseMenuEl = document.getElementById('pause-menu');

// Game State
let score = 0;
let isGameOver = false;
let gameActive = true;
let playerX = 50; // Percentage 0-100
let baseSpeed = 5;
let speed = baseSpeed;
let nextMilestone = 1000;
let vehicles = [];
let keys = {};
let gameLoopId = null;
let lastFrameTime = performance.now();
let currentGameTime = 0;
let isJunctionActive = false;
let junctionDecisionMade = false;
let roadSplitLEl = document.getElementById('road-split-l');
let roadSplitREl = document.getElementById('road-split-r');
let billboardOverlayEl = document.getElementById('billboard-overlay');
let roadWrapperEl = document.getElementById('road-wrapper');
let navFeedbackEl = document.getElementById('nav-feedback');

// Swipe Handler
class SwipeHandler {
    constructor() {
        this.startX = 0;
        this.startTime = 0;
        this.threshold = 50; // Required distance
        this.timeThreshold = 300; // Max time for a "hard" swipe
    }

    start(x) {
        this.startX = x;
        this.startTime = Date.now();
    }

    end(x) {
        const diffX = x - this.startX;
        const diffTime = Date.now() - this.startTime;

        if (Math.abs(diffX) > this.threshold && diffTime < this.timeThreshold) {
            return diffX > 0 ? 'right' : 'left';
        }
        return null;
    }
}
const swipeHandler = new SwipeHandler();

// Junction Manager
const JunctionManager = {
    state: 'NORMAL',
    options: [],
    timer: 0,
    isInputLocked: false,
    _timerIdCounter: 0,
    _pendingTimers: [],

    _setTimeout(fn, ms) {
        this._timerIdCounter++;
        const targetTime = currentGameTime + ms;
        this._pendingTimers.push({ id: this._timerIdCounter, target: targetTime, fn });
        return this._timerIdCounter;
    },

    _clearTimeout(id) {
        this._pendingTimers = this._pendingTimers.filter(t => t.id !== id);
    },

    clearTimers() {
        this._pendingTimers = [];
    },

    processTimers(currentTime) {
        const expired = this._pendingTimers.filter(t => currentTime >= t.target);
        this._pendingTimers = this._pendingTimers.filter(t => currentTime < t.target);
        expired.forEach(t => t.fn());
    },

    spawn() {
        if (this.state !== 'NORMAL') return;
        this.enterPreview();
    },

    enterPreview() {
        this.state = 'PREVIEW';
        isJunctionActive = true;
        const options = roadMap[currentCity] || ['MG Road', 'Indiranagar'];
        
        // Pick two distinct options
        const shuffled = [...options].sort(() => 0.5 - Math.random());
        this.options = [shuffled[0], shuffled[1] || shuffled[0]];
        
        this.showBoards();
        // Preview phase: show boards early, narrow road
        road.classList.add('narrowing'); // Optional: can add narrowing style
        this._setTimeout(() => this.enterSplit(), 1000);
    },

    enterSplit() {
        this.state = 'SPLIT';
        // Show side road arms in game-viewport
        document.getElementById('game-viewport').classList.add('splitting');
        // Dim forward road — player must turn
        road.classList.add('blocked');
        
        document.getElementById('game-viewport').classList.add('zoomed');
        this._setTimeout(() => this.enterDecision(), 500);
    },

    enterDecision() {
        this.state = 'DECISION';
        this.isInputLocked = true;
        this.decisionEndTime = currentGameTime + 800; // 800ms window
        // Ensure player is centered for the fork
        playerX = 50;
        player.style.left = '50%';
    },

    showBoards() {
        billboardOverlayEl.innerHTML = `
            <div class="overhead-board board-left visible"><span>TO</span> ${this.options[0]}</div>
            <div class="overhead-board board-right visible"><span>TO</span> ${this.options[1]}</div>
        `;
    },

    update() {
        if (this.state !== 'DECISION') return;
        
        // Enforce 800ms decision window via target time
        if (currentGameTime > this.decisionEndTime) {
            this.fail("Too Late!");
        }
    },

    handleSwipe(direction) {
        if (this.state !== 'DECISION') return;
        this.resolve(direction);
    },

    resolve(direction) {
        this.state = 'RESOLVE';
        const chosen = direction === 'left' ? this.options[0] : this.options[1];
        
        // Highlight chosen arm, fade other
        if (direction === 'left') {
            roadSplitLEl.classList.add('highlight');
            roadSplitREl.classList.add('fading');
        } else {
            roadSplitREl.classList.add('highlight');
            roadSplitLEl.classList.add('fading');
        }

        // Temple Run world rotation — world turns, player stays centered
        const angle = direction === 'left' ? '-90deg' : '90deg';
        roadWrapperEl.style.transform = `rotateZ(${angle})`;

        this._setTimeout(() => {
            this.success(chosen);
        }, 650);
    },

    success(city) {
        currentCity = city;
        if (currentCity === targetCity) {
            winGame();
        } else {
            locationEl.innerHTML = `From: <b>${currentCity}</b><br>To: <b style="color:var(--primary-red)">${targetCity}</b>`;
            speed += 0.5;
            nextMilestone = score + 1500;
            this.reset();
        }
    },

    fail(reason) {
        navFeedbackEl.textContent = reason;
        navFeedbackEl.classList.remove('hidden');
        document.getElementById('game-viewport').classList.add('shake');
        this._setTimeout(() => {
            document.getElementById('game-viewport').classList.remove('shake');
            endGame();
        }, 1200);
    },

    reset() {
        this.clearTimers();
        this.state = 'NORMAL';
        this.isInputLocked = false;
        isJunctionActive = false;
        this.timer = 0;

        // Remove junction states from DOM
        const viewport = document.getElementById('game-viewport');
        viewport.classList.remove('splitting', 'zoomed');
        // Instantly reset rotation (disable transition briefly, then re-enable)
        roadWrapperEl.style.transition = 'none';
        roadWrapperEl.style.transform = '';
        requestAnimationFrame(() => {
            roadWrapperEl.style.transition = '';
        });

        // Un-dim road and clear narrowing class
        road.classList.remove('blocked', 'narrowing');

        if (roadSplitLEl) roadSplitLEl.classList.remove('highlight', 'fading');
        if (roadSplitREl) roadSplitREl.classList.remove('highlight', 'fading');
        if (billboardOverlayEl) billboardOverlayEl.innerHTML = '';
        if (navFeedbackEl) navFeedbackEl.classList.add('hidden');

        // Reset player x to center
        playerX = 50;
        player.style.left = '50%';
    }
};

// Bangalore Navigation Graph
const locations = [
    'Vidhan Sabha', 'Church Street', 'Brigade Road', 'MG Road', 'Indiranagar',
    'Koramangala', 'Malleshwaram', 'Jayanagar', 'Cubbon Park', 'Lalbagh',
    'Commercial Street', 'Whitefield'
];

const roadMap = {
    'Vidhan Sabha': ['Cubbon Park', 'MG Road', 'Malleshwaram'],
    'Cubbon Park': ['Vidhan Sabha', 'Church Street', 'Lalbagh'],
    'Church Street': ['Cubbon Park', 'MG Road', 'Brigade Road'],
    'MG Road': ['Vidhan Sabha', 'Church Street', 'Commercial Street'],
    'Brigade Road': ['Church Street', 'Commercial Street', 'Indiranagar'],
    'Commercial Street': ['MG Road', 'Brigade Road', 'Indiranagar'],
    'Indiranagar': ['Brigade Road', 'Koramangala', 'Whitefield'],
    'Koramangala': ['Indiranagar', 'Jayanagar', 'Lalbagh', 'Brigade Road'],
    'Jayanagar': ['Koramangala', 'Lalbagh', 'Malleshwaram'],
    'Lalbagh': ['Jayanagar', 'Cubbon Park', 'Koramangala'],
    'Malleshwaram': ['Vidhan Sabha', 'Jayanagar', 'MG Road'],
    'Whitefield': ['Indiranagar', 'Commercial Street']
};

let currentCity = 'Vidhan Sabha';
let targetCity = 'Whitefield';

function initGame() {
    currentCity = locations[Math.floor(Math.random() * locations.length)];
    targetCity = locations[Math.floor(Math.random() * locations.length)];
    while (targetCity === currentCity) {
        targetCity = locations[Math.floor(Math.random() * locations.length)];
    }
    
    locationEl.innerHTML = `From: <b>${currentCity}</b><br>To: <b style="color:var(--primary-red)">${targetCity}</b>`;
    score = 0;
    speed = baseSpeed;
    playerX = 50;
    isGameOver = false;
    gameActive = true;
    nextMilestone = 400; // Lowered for faster testing
    JunctionManager.reset();
    
    // Reset Global Time Clock
    lastFrameTime = performance.now();
    currentGameTime = 0;

    // Clear UI
    scoreEl.textContent = 0;
    gameOverEl.classList.add('hidden');
    pauseMenuEl.classList.add('hidden');

    const modalTitle = gameOverEl.querySelector('h2');
    if (modalTitle) {
        modalTitle.textContent = "Game Over";
        modalTitle.style.color = "var(--primary-red)";
    }
    
    // Clear existing objects
    vehicles.forEach(v => v.element.remove());
    vehicles = [];
    
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = requestAnimationFrame(updateGame);
}

function updatePlayer(timeScale) {
    if (JunctionManager.isInputLocked || isJunctionActive) return;
    let moving = false;
    if (keys['ArrowLeft'] || keys['KeyA']) {
        playerX -= 2.0 * timeScale;
        moving = true;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        playerX += 2.0 * timeScale;
        moving = true;
    }
    
    if (moving) player.classList.add('moving');
    else player.classList.remove('moving');

    playerX = Math.max(20, Math.min(80, playerX));
    player.style.left = playerX + '%';
}

function spawnVehicle() {
    if (!gameActive || isGameOver) return;

    const type = ['rickshaw', 'car', 'bus'][Math.floor(Math.random() * 3)];
    const width = type === 'bus' ? 45 : 30;
    const height = type === 'bus' ? 80 : 50;
    
    const x = 20 + Math.random() * 60;
    const y = 80;
    
    // Stricter spacing check
    const isOverlapping = vehicles.some(v => {
        const xDist = Math.abs(v.x - x);
        const yDist = Math.abs(v.y - y);
        return xDist < 20 && yDist < 300; // Increased spacing buffers
    });
    
    if (isOverlapping) return;

    // Speed adjustment to prevent catching up
    let laneSpeed = speed + (Math.random() * 4);
    const vehicleAhead = vehicles.find(v => Math.abs(v.x - x) < 15 && v.y > y);
    if (vehicleAhead) {
        laneSpeed = Math.min(laneSpeed, vehicleAhead.speed - 0.5);
    }

    const vehicle = {
        x: x,
        y: y,
        width: width + 5,
        height: height + 5,
        type: type,
        speed: laneSpeed,
        element: document.createElement('div')
    };

    vehicle.element.className = `vehicle ${type}`;
    road.appendChild(vehicle.element);
    vehicles.push(vehicle);
}

function updateGame(timestamp) {
    if (!gameActive || isGameOver) {
        lastFrameTime = performance.now(); // Clock stops advancing but references continue
        gameLoopId = requestAnimationFrame(updateGame);
        return;
    }

    if (!timestamp) timestamp = performance.now();
    let delta = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    if (delta > 100) delta = 16.6; // Lag spike protection
    const timeScale = delta / 16.666;
    currentGameTime += delta;

    JunctionManager.processTimers(currentGameTime);

    // Track score progression to know when crossing thresholds
    const prevScore = score;
    score += timeScale;
    scoreEl.textContent = Math.floor(score / 10);

    // Process timeouts and junctions
    if (Math.floor(score / 60) > Math.floor(prevScore / 60) && !isJunctionActive) spawnVehicle();
    
    if (score > 0 && score >= nextMilestone && prevScore < nextMilestone && !isJunctionActive) {
        JunctionManager.spawn();
    }

    if (isJunctionActive) {
        JunctionManager.update();
    }

    // Vehicles
    const visibleVehicles = [];
    vehicles.forEach((v) => {
        v.y += v.speed * 0.45 * timeScale;
        const scale = (v.y - 100) / 400 + 0.1;
        
        v.element.style.top = v.y + 'px';
        v.element.style.left = v.x + '%';
        v.element.style.width = (v.width * scale) + 'px';
        v.element.style.height = (v.height * scale) + 'px';
        v.element.style.opacity = Math.min(1, scale * 2);

        // Bypass collision during junctions
        if (score > 100 && v.y > 600 && !isJunctionActive) {
            const playerRect = player.getBoundingClientRect();
            const vRect = v.element.getBoundingClientRect();
            
            const collisionPaddingX = 12;
            const collisionPaddingY = 15;
            
            if (
                vRect.left < playerRect.right - collisionPaddingX &&
                vRect.right > playerRect.left + collisionPaddingX &&
                vRect.top < playerRect.bottom - collisionPaddingY &&
                vRect.bottom > playerRect.top + collisionPaddingY
            ) {
                endGame();
            }
        }

        if (v.y <= 1100) {
            visibleVehicles.push(v);
        } else {
            v.element.remove();
        }
    });
    vehicles = visibleVehicles;

    updatePlayer(timeScale);
    gameLoopId = requestAnimationFrame(updateGame);
}

function endGame() {
    isGameOver = true;
    gameActive = false;
    finalScoreEl.textContent = Math.floor(score / 10);
    gameOverEl.classList.remove('hidden');
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
}

function winGame() {
    isGameOver = true;
    gameActive = false;
    document.querySelector('#game-over h2').textContent = "Destination Reached!";
    document.querySelector('#game-over h2').style.color = "var(--primary-green)";
    finalScoreEl.textContent = Math.floor(score / 10);
    gameOverEl.classList.remove('hidden');
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
}

// Controls
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (isJunctionActive) {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') JunctionManager.handleSwipe('left');
        if (e.code === 'ArrowRight' || e.code === 'KeyD') JunctionManager.handleSwipe('right');
    }
});
window.addEventListener('keyup', (e) => keys[e.code] = false);

// Touch/Swipe support
let touchStartX = 0;
window.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    swipeHandler.start(e.touches[0].clientX);
});

window.addEventListener('touchmove', (e) => {
    if (JunctionManager.isInputLocked) return;
    if (!isJunctionActive && gameActive && !isGameOver) {
        const touchX = e.touches[0].clientX;
        const diff = touchX - touchStartX;
        playerX += diff * 0.2; // Adjusted sensitivity
        playerX = Math.max(20, Math.min(80, playerX));
        player.style.left = playerX + '%';
        touchStartX = touchX;
        e.preventDefault();
    }
}, { passive: false });

window.addEventListener('touchend', (e) => {
    const direction = swipeHandler.end(e.changedTouches[0].clientX);
    if (direction) {
        if (isJunctionActive) JunctionManager.handleSwipe(direction);
    }
});

restartBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    initGame();
});

pauseBtn.addEventListener('click', () => {
    if (gameActive && !isGameOver) {
        gameActive = false;
        pauseMenuEl.classList.remove('hidden');
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
            gameLoopId = null;
        }
    }
});

resumeBtn.addEventListener('click', () => {
    if (!gameActive && !isGameOver) {
        gameActive = true;
        pauseMenuEl.classList.add('hidden');
        lastFrameTime = performance.now(); // Reset time reference before resuming
        if (!gameLoopId) {
            gameLoopId = requestAnimationFrame(updateGame);
        }
    }
});

// Start
initGame();
