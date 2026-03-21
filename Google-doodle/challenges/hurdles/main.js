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
let billboards = [];
let keys = {};
let gameLoopId = null;
let isJunctionActive = false;
let junctionDecisionMade = false;
let roadMainEl = document.getElementById('road-main');
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
    active: false,
    options: [],
    decisionWindow: false,
    timer: 0,

    spawn() {
        this.active = true;
        this.decisionWindow = false;
        this.timer = 0;
        isJunctionActive = true;
        
        const options = roadMap[currentCity] || ['MG Road', 'Indiranagar'];
        this.options = [options[0], options[Math.min(1, options.length - 1)]];

        this.showBoards();
        roadWrapperEl.classList.add('splitting');
        roadSplitLEl.classList.remove('hidden');
        roadSplitREl.classList.remove('hidden');
        
        // Pause traffic spawning
        gameActive = true; 
    },

    showBoards() {
        billboardOverlayEl.innerHTML = `
            <div class="overhead-board board-left visible"><span>TO</span> ${this.options[0]}</div>
            <div class="overhead-board board-right visible"><span>TO</span> ${this.options[1]}</div>
        `;
    },

    update() {
        if (!this.active) return;
        this.timer += 1;

        if (this.timer > 100) { // After 100 frames, enforce decision
            this.decisionWindow = true;
        }

        if (this.timer > 200 && !junctionDecisionMade) {
            this.fail("Missed Turn!");
        }
    },

    handleSwipe(direction) {
        if (!this.decisionWindow || junctionDecisionMade) return;

        junctionDecisionMade = true;
        const chosen = direction === 'left' ? this.options[0] : this.options[1];
        
        // Highlight chosen road
        if (direction === 'left') roadSplitLEl.classList.add('highlight');
        else roadSplitREl.classList.add('highlight');

        setTimeout(() => {
            this.success(chosen);
        }, 800);
    },

    success(city) {
        currentCity = city;
        if (currentCity === targetCity) {
            winGame();
        } else {
            locationEl.innerHTML = `From: <b>${currentCity}</b><br>To: <b style="color:var(--primary-red)">${targetCity}</b>`;
            speed += 0.5;
            nextMilestone += 1500;
            this.reset();
        }
    },

    fail(reason) {
        navFeedbackEl.textContent = reason;
        navFeedbackEl.classList.remove('hidden');
        setTimeout(() => {
            endGame();
        }, 1500);
    },

    reset() {
        this.active = false;
        isJunctionActive = false;
        junctionDecisionMade = false;
        this.timer = 0;
        roadWrapperEl.classList.remove('splitting');
        roadWrapperEl.style.transform = '';
        roadSplitLEl.classList.add('hidden');
        roadSplitREl.classList.add('hidden');
        roadSplitLEl.classList.remove('highlight');
        roadSplitREl.classList.remove('highlight');
        billboardOverlayEl.innerHTML = '';
        navFeedbackEl.classList.add('hidden');
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
    nextMilestone = 1000;
    
    // Clear UI
    scoreEl.textContent = 0;
    gameOverEl.classList.add('hidden');
    pauseMenuEl.classList.add('hidden');
    
    // Clear existing objects
    vehicles.forEach(v => v.element.remove());
    billboards.forEach(b => b.element.remove());
    vehicles = [];
    billboards = [];
    
    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoopId = requestAnimationFrame(updateGame);
}

function updatePlayer() {
    let moving = false;
    if (keys['ArrowLeft'] || keys['KeyA']) {
        playerX -= 2.0;
        moving = true;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        playerX += 2.0;
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

function spawnFork() {
    const options = roadMap[currentCity] || ['MG Road', 'Indiranagar'];
    const dest1 = options[0];
    const dest2 = options[Math.min(1, options.length - 1)];

    const createBillboard = (x, text, side) => {
        const b = {
            x: x,
            y: 80,
            text: text,
            side: side,
            element: document.createElement('div')
        };
        b.element.className = `billboard ${side}`;
        b.element.innerHTML = `<span>TO</span> ${text}`;
        road.appendChild(b.element);
        billboards.push(b);
    };

    // Position billboards to the edges to look like a fork
    createBillboard(25, dest1, 'left');
    createBillboard(75, dest2, 'right');
}

function updateGame() {
    if (!gameActive || isGameOver) {
        gameLoopId = null;
        return;
    }

    score += 1;
    scoreEl.textContent = Math.floor(score / 10);

    if (score % 60 === 0 && !isJunctionActive) spawnVehicle();
    
    if (score > 0 && score % nextMilestone === 0 && !isJunctionActive) {
        JunctionManager.spawn();
    }

    if (isJunctionActive) {
        JunctionManager.update();
    }

    // Vehicles
    vehicles.forEach((v, index) => {
        v.y += v.speed * 0.45;
        const scale = (v.y - 100) / 400 + 0.1;
        
        v.element.style.top = v.y + 'px';
        v.element.style.left = v.x + '%';
        v.element.style.width = (v.width * scale) + 'px';
        v.element.style.height = (v.height * scale) + 'px';
        v.element.style.opacity = Math.min(1, scale * 2);

        if (score > 100 && v.y > 600) {
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

        if (v.y > 1100) {
            v.element.remove();
            vehicles.splice(index, 1);
        }
    });

    // Billboards (Old logic removed, handled by JunctionManager)
    billboards = [];

    updatePlayer();
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
window.addEventListener('touchstart', (e) => {
    swipeHandler.start(e.touches[0].clientX);
});

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
    }
});

resumeBtn.addEventListener('click', () => {
    if (!gameActive && !isGameOver) {
        gameActive = true;
        pauseMenuEl.classList.add('hidden');
        gameLoopId = requestAnimationFrame(updateGame);
    }
});

// Start
initGame();
