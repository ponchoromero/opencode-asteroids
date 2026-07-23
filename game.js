'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3, shootingStar = false) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;
    this.shootingStar = shootingStar;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    const speedMult = shootingStar ? 2.5 : 1;
    this.vx = Math.cos(angle) * speed * speedMult;
    this.vy = Math.sin(angle) * speed * speedMult;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    if (shootingStar) {
      this.ttl = rand(4, 6);
    }

    // Polígono irregular
    const n = shootingStar ? randInt(6, 8) : randInt(8, 13);
    const rMin = shootingStar ? 0.3 : 0.6;
    const rMax = shootingStar ? 1.4 : 1.0;
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(rMin, rMax);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    if (this.shootingStar) {
      this.ttl -= dt;
      if (this.ttl <= 0) {
        this.dead = true;
        explode(this.x, this.y, 15, true);
      }
    }
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = this.shootingStar ? '#f60' : '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Skins ─────────────────────────────────────────────────────────────────────
const SKINS = [
  {
    name: 'CLÁSICA',
    color: '#fff',
    boostColor: '#0ff',
    verts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
    lifeVerts: [[9, 0], [-6, -5], [-3, 0], [-6, 5]],
    flame: { x: -8, len: [6, 14], color: 'rgba(255,130,0,0.85)' }
  },
  {
    name: 'SIGILO',
    color: '#888',
    boostColor: '#0ff',
    verts: [[18, 0], [-12, -10], [-3, 0], [-12, 10]],
    lifeVerts: [[8, 0], [-5, -6], [-3, 0], [-5, 6]],
    flame: null
  },
  {
    name: 'CAZADOR',
    color: '#f44',
    boostColor: '#fa0',
    verts: [[24, 0], [-14, -7], [-9, 0], [-14, 7]],
    lifeVerts: [[10, 0], [-7, -4], [-4, 0], [-7, 4]],
    flame: { x: -10, len: [5, 12], color: 'rgba(255,200,50,0.85)' }
  },
  {
    name: 'FÉNIX',
    color: '#fa0',
    boostColor: '#fff',
    verts: [[22, 0], [-11, -8], [-6, 0], [-11, 8]],
    lifeVerts: [[9, 0], [-5, -5], [-3, 0], [-5, 5]],
    flame: { x: -8, len: [8, 18], color: 'rgba(255,100,0,0.9)' }
  },
];

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() {
    this.skinIndex = parseInt(localStorage.getItem('asteroids-skin')) || 0;
    this.reset();
  }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
    this.speedMultiplier = 1;
    this.speedTimer = 0;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedTimer    > 0) {
      this.speedTimer -= dt;
      if (this.speedTimer <= 0) this.speedMultiplier = 1;
    }

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * this.speedMultiplier * dt;
      this.vy += Math.sin(this.angle) * THRUST * this.speedMultiplier * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[this.skinIndex];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = this.speedMultiplier > 1 ? skin.boostColor : skin.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    ctx.beginPath();
    ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
    for (let i = 1; i < skin.verts.length; i++)
      ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    if (this.thrusting && skin.flame && Math.random() > 0.35) {
      const f = skin.flame;
      ctx.beginPath();
      ctx.moveTo(f.x, -4);
      ctx.lineTo(f.x - rand(f.len[0], f.len[1]), 0);
      ctx.lineTo(f.x,  4);
      ctx.strokeStyle = f.color;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#f44', '#4f4', '#44f', '#ff4', '#f4f', '#4ff', '#fa0', '#fff'];

class Particle {
  constructor(x, y, confetti = false) {
    this.x  = x;
    this.y  = y;
    this.confetti = confetti;
    const angle = rand(0, Math.PI * 2);
    const speed = confetti ? rand(40, 100) : rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = confetti ? rand(1.0, 2.0) : rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
    this.rot  = rand(0, Math.PI * 2);
    this.rotSpeed = rand(-5, 5);
    this.w = confetti ? rand(3, 6) : 0;
    this.h = confetti ? rand(2, 4) : 0;
    this.color = confetti ? CONFETTI_COLORS[randInt(0, CONFETTI_COLORS.length - 1)] : '#fff';
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.vy += (this.confetti ? 120 : 0) * dt;
    this.y  += this.vy * dt;
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    if (this.confetti) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      const r = parseInt(this.color.slice(1, 3), 16);
      const g = parseInt(this.color.slice(3, 5), 16);
      const b = parseInt(this.color.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
      ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
      ctx.restore();
    } else {
      ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
      ctx.stroke();
    }
  }
}

// ── PowerUp (Velocidad) ────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.rot = 0;
    this.dead = false;
    this.ttl = 8;
  }

  update(dt) {
    this.rot += 2.5 * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(this.radius, 0);
    ctx.lineTo(0, this.radius);
    ctx.lineTo(-this.radius, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let powerUps, powerUpTimer;
let shootingStarTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3, Math.random() < 0.25));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  powerUps = [];
  powerUpTimer = rand(8, 12);
  shootingStarTimer = rand(5, 8);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  powerUpTimer = rand(8, 12);
  shootingStarTimer = rand(5, 8);
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8, confetti = false) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y, confetti));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);

  if (pressed('KeyS')) {
    ship.skinIndex = (ship.skinIndex + 1) % SKINS.length;
    localStorage.setItem('asteroids-skin', ship.skinIndex);
  }

  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size] * (a.shootingStar ? 3 : 1);
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Power-ups
  powerUpTimer -= dt;
  if (powerUpTimer <= 0 && powerUps.length === 0) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (dist({ x, y }, ship) < 130);
    powerUps.push(new PowerUp(x, y));
    powerUpTimer = rand(8, 12);
  }

  powerUps.forEach(p => p.update(dt));
  powerUps = powerUps.filter(p => !p.dead);

  for (const p of powerUps) {
    if (dist(ship, p) < ship.radius + p.radius) {
      ship.speedMultiplier = 2;
      ship.speedTimer = 5;
      explode(p.x, p.y, 6);
      p.dead = true;
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Estrellas fugaces
  shootingStarTimer -= dt;
  if (shootingStarTimer <= 0) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (dist({ x, y }, ship) < 130);
    asteroids.push(new Asteroid(x, y, 2, true));
    shootingStarTimer = rand(5, 8);
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = SKINS[ship.skinIndex];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin.color;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.lifeVerts[0][0], skin.lifeVerts[0][1]);
  for (let i = 1; i < skin.lifeVerts.length; i++)
    ctx.lineTo(skin.lifeVerts[i][0], skin.lifeVerts[i][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  if (ship.speedTimer > 0) {
    ctx.fillStyle = '#0ff';
    ctx.textAlign = 'left';
    ctx.fillText(`VELOCIDAD ${ship.speedTimer.toFixed(1)}s`, 14, 46);
  }

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  powerUps.forEach(p => p.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
