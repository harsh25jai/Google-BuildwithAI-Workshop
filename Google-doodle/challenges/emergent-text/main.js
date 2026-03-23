const canvas = document.getElementById('artCanvas');
const ctx = canvas.getContext('2d');
const toggleBtn = document.getElementById('toggle-btn');
const resetBtn = document.getElementById('reset-btn');
const modeDesc = document.getElementById('mode-description');

// Config Inputs
const inputSeeds = document.getElementById('input-seeds');
const inputGravity = document.getElementById('input-gravity');
const inputSpeed = document.getElementById('input-speed');
const inputNoise = document.getElementById('input-noise');

canvas.width = 1000;
canvas.height = 500;

let mouse = { x: null, y: null, radius: 100 };
let particles = [];
let textMode = false; // Start with Logo mode as per HTML initial state

// Configuration Object
const config = {
    seeds: 6,
    gravity: 0.5,
    speed: 10,
    noise: 10
};

// Descriptions for each mode
const descriptions = {
    text: "Particles are currently forming the 'ANTIGRAVITY' text.",
    logo: "Particles are currently forming the 'Antigravity Logo' (AG)."
};

window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
});

class Particle {
    constructor(x, y) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.baseX = x;
        this.baseY = y;
        this.size = 2;
        this.density = (Math.random() * 30) + 1;
        this.color = 'white';
        this.vx = 0;
        this.vy = 0;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
    }

    update() {
        // Mouse Interaction
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        
        let forceDirectionX = 0;
        let forceDirectionY = 0;
        let mouseForce = 0;
        
        if (distance > 0) {
            forceDirectionX = dx / distance;
            forceDirectionY = dy / distance;
            let maxDistance = mouse.radius;
            mouseForce = (maxDistance - distance) / maxDistance;
        }
        
        // Return to Base Force (Gravity/Speed)
        let dxBase = this.baseX - this.x;
        let dyBase = this.baseY - this.y;
        let distBase = Math.sqrt(dxBase * dxBase + dyBase * dyBase);
        
        // Noise (Random Jitter)
        let noiseX = (Math.random() - 0.5) * config.noise * 0.5;
        let noiseY = (Math.random() - 0.5) * config.noise * 0.5;

        if (distance < mouse.radius) {
            this.vx -= forceDirectionX * mouseForce * this.density * 0.5;
            this.vy -= forceDirectionY * mouseForce * this.density * 0.5;
            this.color = '#fbbc05';
        } else {
            this.vx += (dxBase / config.speed) * config.gravity + noiseX;
            this.vy += (dyBase / config.speed) * config.gravity + noiseY;
            this.color = 'white';
        }

        // Apply Friction
        this.vx *= 0.9;
        this.vy *= 0.9;

        this.x += this.vx;
        this.y += this.vy;
    }
}

function init() {
    particles = [];
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 1.0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Clear and set description
    modeDesc.textContent = textMode ? descriptions.text : descriptions.logo;

    if (textMode) {
        ctx.font = 'bold 150px Outfit';
        ctx.fillText('ANTIGRAVITY', canvas.width / 2, canvas.height / 2);
    } else {
        // Draw Logo (Stylized circular AG)
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 160, 0, Math.PI * 2);
        ctx.lineWidth = 20;
        ctx.strokeStyle = 'white';
        ctx.stroke();
        
        ctx.font = '900 220px Outfit';
        ctx.fillText('AG', canvas.width / 2, canvas.height / 2 + 10);
    }

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Invert seeds logic: higher slider value = smaller step = more particles
    const step = 12 - parseInt(config.seeds);
    for (let y = 0; y < data.height; y += step) {
        for (let x = 0; x < data.width; x += step) {
            if (data.data[(y * 4 * data.width) + (x * 4) + 3] > 128) {
                particles.push(new Particle(x, y));
            }
        }
    }
}

function animate() {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
    }
    requestAnimationFrame(animate);
}

// Ensure font is loaded before initialization
document.fonts.ready.then(() => {
    init();
    animate();
});

// Event Listeners
toggleBtn.addEventListener('click', () => {
    textMode = !textMode;
    toggleBtn.textContent = textMode ? 'Switch to Logo' : 'Switch to Text';
    init();
});

inputSeeds.addEventListener('input', (e) => {
    config.seeds = parseInt(e.target.value, 10) || 6;
    init(); // Re-initialize particles with new density
});

inputGravity.addEventListener('input', (e) => {
    config.gravity = parseFloat(e.target.value);
});

inputSpeed.addEventListener('input', (e) => {
    config.speed = parseInt(e.target.value);
});

inputNoise.addEventListener('input', (e) => {
    config.noise = parseInt(e.target.value);
});

resetBtn.addEventListener('click', () => {
    inputSeeds.value = 6;
    inputGravity.value = 0.5;
    inputSpeed.value = 10;
    inputNoise.value = 10;
    
    config.seeds = 6;
    config.gravity = 0.5;
    config.speed = 10;
    config.noise = 10;
    
    // Re-initialize to clear "disturbed" state and apply defaults
    init();
});
