const canvas = document.getElementById('gameCanvas');
if (!canvas) throw new Error("Missing #gameCanvas");
const ctx = canvas.getContext('2d');
const runsEl = document.getElementById('runs');
if (!runsEl) throw new Error("Missing #runs");
const wicketsEl = document.getElementById('wickets');
if (!wicketsEl) throw new Error("Missing #wickets");
const swingBtn = document.getElementById('swing-btn');
if (!swingBtn) throw new Error("Missing #swing-btn");
const gameOverEl = document.getElementById('game-over');
if (!gameOverEl) throw new Error("Missing #game-over");
const finalScoreEl = document.getElementById('final-score');
if (!finalScoreEl) throw new Error("Missing #final-score");
const restartBtn = document.getElementById('restart-btn');
if (!restartBtn) throw new Error("Missing #restart-btn");

// Canvas setup
canvas.width = 700;
canvas.height = 400;

// Game state
let runs = 0;
let wickets = 0;
let isGameOver = false;
let isSwinging = false;
let ballActive = false;
let ballSpawnScheduled = false;
let ball = { x: 0, y: 0, speed: 5, radius: 8 };
let batter = { x: 600, y: 250, angle: 0 };
let pitcher = { x: 50, y: 200 };

// Game Loop
function draw() {
    if (isGameOver) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Ground
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw Pitch
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(50, 180, 600, 40);

    // Draw Stumps
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(640, 170);
    ctx.lineTo(640, 230);
    ctx.stroke();

    // Draw Pitcher
    ctx.fillStyle = '#ea4335';
    ctx.beginPath();
    ctx.arc(pitcher.x, pitcher.y, 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw Batter
    ctx.save();

    // Handle is pivot
    ctx.translate(batter.x, batter.y);
    ctx.rotate(batter.angle);

    // Wood gradient
    let grad = ctx.createLinearGradient(-16, -80, 16, 0);
    grad.addColorStop(0, '#c89b6d');
    grad.addColorStop(0.5, '#e0b07a');
    grad.addColorStop(1, '#c89b6d');

    ctx.fillStyle = grad;
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 2;

    ctx.beginPath();

    // ===== Handle (starts at origin) =====
    ctx.moveTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.lineTo(6, -20);
    ctx.lineTo(-6, -20);

    // ===== Shoulders =====
    ctx.quadraticCurveTo(-12, -30, -14, -45);

    // ===== Blade =====
    ctx.lineTo(-16, -70);
    ctx.quadraticCurveTo(0, -85, 16, -70);
    ctx.lineTo(14, -45);
    ctx.quadraticCurveTo(12, -30, 6, -20);

    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // ===== FIXED GRIP =====
    ctx.fillStyle = '#222';

    // Rounded grip using path (instead of fillRect)
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.lineTo(5, -18);
    ctx.quadraticCurveTo(0, -22, -5, -18);
    ctx.closePath();
    ctx.fill();

    // Grip texture lines
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;

    for (let i = -3; i > -18; i -= 4) {
        ctx.beginPath();
        ctx.moveTo(-4, i);
        ctx.lineTo(4, i);
        ctx.stroke();
    }

    // ===== Spine =====
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(0, -75);
    ctx.strokeStyle = '#a67c52';
    ctx.stroke();

    ctx.restore();

    // Draw Ball
    if (ballActive) {
        ctx.fillStyle = '#fbef05';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        // Move Ball
        ball.x += ball.speed;
        ball.y += (200 - 200) / ((600 - 50) / ball.speed); // Linear path to batter

        // Check Hit
        if (isSwinging && ball.x > batter.x - 40 && ball.x < batter.x + 20 && ball.y > batter.y - 60 && ball.y < batter.y) {
            hitBall();
        }

        // Check Miss
        if (ball.x > canvas.width) {
            missBall();
        }
    } else if (!isGameOver) {
        // Reset Ball
        if (!ballSpawnScheduled) {
            ballSpawnScheduled = true;
            setTimeout(() => {
                if (!ballActive && !isGameOver) spawnBall();
            }, 1500);
        }
    }

    requestAnimationFrame(draw);
}

function spawnBall() {
    ballSpawnScheduled = false;
    ballActive = true;
    ball.x = pitcher.x;
    ball.y = pitcher.y;
    ball.speed = 4 + Math.random() * 4;
}

function hitBall() {
    ballActive = false;
    const scored = Math.floor(Math.random() * 6) + 1;
    runs += scored;
    runsEl.textContent = runs;
    showNotification(`+${scored} Runs!`, '#34a853');
}

function missBall() {
    ballActive = false;
    wickets++;
    wicketsEl.textContent = wickets;
    showNotification('OUT!', '#ea4335');
    if (wickets >= 3) {
        endGame();
    }
}

function swing() {
    if (isSwinging || isGameOver) return;
    isSwinging = true;
    let startAngle = 0;
    const swingAnim = () => {
        startAngle -= 0.2;
        batter.angle = startAngle;
        if (startAngle > -1.5) {
            requestAnimationFrame(swingAnim);
        } else {
            const backAnim = () => {
                startAngle += 0.1;
                batter.angle = startAngle;
                if (startAngle < 0) {
                    requestAnimationFrame(backAnim);
                } else {
                    batter.angle = 0;
                    isSwinging = false;
                }
            };
            requestAnimationFrame(backAnim);
        }
    };
    requestAnimationFrame(swingAnim);
}

function showNotification(text, color) {
    const note = document.createElement('div');
    note.textContent = text;
    note.style.position = 'absolute';
    note.style.top = '50%';
    note.style.left = '50%';
    note.style.transform = 'translate(-50%, -50%)';
    note.style.fontSize = '3rem';
    note.style.fontWeight = '800';
    note.style.color = color;
    note.style.pointerEvents = 'none';
    note.style.animation = 'fadeUp 1s forwards';
    document.getElementById('game-container').appendChild(note);
    setTimeout(() => note.remove(), 1000);
}

function endGame() {
    isGameOver = true;
    finalScoreEl.textContent = runs;
    gameOverEl.classList.remove('hidden');
}

function restartGame() {
    runs = 0;
    wickets = 0;
    runsEl.textContent = 0;
    wicketsEl.textContent = 0;
    isGameOver = false;
    ballSpawnScheduled = false;
    gameOverEl.classList.add('hidden');
    spawnBall();
    draw();
}

swingBtn.addEventListener('click', swing);
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        swing();
    }
});
restartBtn.addEventListener('click', restartGame);

// Add animation style
const style = document.createElement('style');
style.textContent = `
@keyframes fadeUp {
    0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -100%) scale(1.5); }
}
`;
document.head.appendChild(style);

draw();
spawnBall();
