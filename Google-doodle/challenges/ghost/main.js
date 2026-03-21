const scene = document.getElementById('scene');
const countEl = document.getElementById('count');
let caughtCount = 0;

// Custom Cursor
const cursor = document.createElement('div');
cursor.id = 'custom-cursor';
document.body.appendChild(cursor);

window.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
});

// Ghost Spawner
function createGhost() {
    const ghost = document.createElement('div');
    ghost.className = 'ghost';
    
    // Random Position
    const rect = scene.getBoundingClientRect();
    const x = Math.random() * (rect.width - 60);
    const y = Math.random() * (rect.height - 80);
    
    ghost.style.left = x + 'px';
    ghost.style.top = y + 'px';
    ghost.style.opacity = '0';
    ghost.style.transform = 'scale(0)';
    
    scene.appendChild(ghost);
    
    // Entrance Animation
    setTimeout(() => {
        ghost.style.opacity = '0.8';
        ghost.style.transform = 'scale(1)';
    }, 10);
    
    // Ghost Interaction
    ghost.addEventListener('mouseover', () => {
        catchGhost(ghost);
    });
    
    // Vanish after some time
    setTimeout(() => {
        if (ghost.parentNode) {
            ghost.style.opacity = '0';
            ghost.style.transform = 'scale(0)';
            setTimeout(() => ghost.remove(), 500);
        }
    }, 2000 + Math.random() * 2000);
}

function catchGhost(ghost) {
    if (ghost.classList.contains('caught')) return;
    ghost.classList.add('caught');
    caughtCount++;
    countEl.textContent = caughtCount;
    
    // Catch Effect
    ghost.style.background = '#ea4335';
    ghost.style.boxShadow = '0 0 30px #ea4335';
    ghost.style.transform = 'scale(1.5) rotate(180deg)';
    ghost.style.opacity = '0';
    
    // Sound effect simulation (optional visual feedback)
    const sparkle = document.createElement('div');
    sparkle.innerText = '⚡';
    sparkle.style.position = 'absolute';
    sparkle.style.left = ghost.style.left;
    sparkle.style.top = ghost.style.top;
    sparkle.style.fontSize = '2rem';
    sparkle.style.color = '#ea4335';
    sparkle.style.pointerEvents = 'none';
    scene.appendChild(sparkle);
    
    setTimeout(() => {
        ghost.remove();
        sparkle.remove();
    }, 500);
}

// Game Loop
setInterval(() => {
    if (document.querySelectorAll('.ghost').length < 5) {
        createGhost();
    }
}, 1000);

// Background Ambience (Particles)
function createParticle() {
    const p = document.createElement('div');
    p.style.position = 'absolute';
    p.style.width = '2px';
    p.style.height = '2px';
    p.style.background = 'white';
    p.style.borderRadius = '50%';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = Math.random() * 100 + '%';
    p.style.opacity = Math.random();
    p.style.pointerEvents = 'none';
    scene.appendChild(p);
    
    setTimeout(() => p.remove(), 5000);
}

setInterval(createParticle, 200);
