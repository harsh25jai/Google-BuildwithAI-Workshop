const player = document.getElementById('player');
const road = document.getElementById('road');
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

    if (score % 50 === 0) spawnVehicle();
    if (score % nextMilestone === 0) {
        spawnFork();
        road.classList.add('forking');
    }

    if (billboards.length === 0) {
        road.classList.remove('forking');
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
            
            // Adjust collision box for more fairness/visual accuracy
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

    // Billboards
    billboards.forEach((b, index) => {
        b.y += speed * 0.45;
        const scale = (b.y - 80) / 400 + 0.1;
        b.element.style.top = b.y + 'px';
        b.element.style.left = b.x + '%';
        b.element.style.transform = `translate(-50%, -100%) scale(${scale})`;
        b.element.style.opacity = Math.min(1, scale * 3);

        if (b.y > 650) {
            // Check which side the player is on
            if ((b.side === 'left' && playerX < 50) || (b.side === 'right' && playerX >= 50)) {
                if (Math.abs(playerX - b.x) < 20) {
                    currentCity = b.text;
                    if (currentCity === targetCity) {
                        winGame();
                    } else {
                        locationEl.innerHTML = `From: <b>${currentCity}</b><br>To: <b style="color:var(--primary-red)">${targetCity}</b>`;
                        speed += 0.5;
                        nextMilestone += 1000;
                    }
                    // Remove all billboards once one is chosen
                    billboards.forEach(bill => bill.element.remove());
                    billboards = [];
                }
            }
        }

        if (b.y > 1000) {
            b.element.remove();
            billboards.splice(index, 1);
        }
    });

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
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

// Touch support
let touchStartX = 0;
window.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
});
window.addEventListener('touchmove', (e) => {
    const touchX = e.touches[0].clientX;
    const diff = touchX - touchStartX;
    playerX += diff * 0.1;
    playerX = Math.max(15, Math.min(85, playerX));
    touchStartX = touchX;
    e.preventDefault();
}, { passive: false });

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
