# Asteroids — AGENTS.md

Single-file HTML5 Canvas arcade game. No build, no deps.

## Run

Open `index.html` in a browser, or:

```bash
npx serve .
```

Canvas is 800×600, hardcoded.

## Conventions

- No package.json, no bundler, no test framework, no lint/typecheck.
- All game logic lives in `game.js` (552 lines). No ES modules, no imports.
- HUD strings are in Spanish (`SCORE`, `NIVEL`, `PUNTAJE`, `ESPACIO PARA REINICIAR`, `VELOCIDAD`).
- No automated tests — manual playtesting only.

## Architecture

- `index.html` — loads `game.js` via `<script>`, renders `<canvas>`.
- `game.js` — contains all classes (`Ship`, `Bullet`, `Asteroid`, `Particle`, `PowerUp`) and game loop (`initGame`, `update`, `draw`).
- State machine: `'playing'` | `'dead'` (respawn timer) | `'gameover'`.
- Toroidal wrap on all entities (`wrap` utility at `game.js:27`).
- Invincibility after respawn: 3s blink (`game.js:133`).
- Power-ups: speed boost (cyan diamond). Spawns every 8-12s, lasts 5s when collected. Ship turns cyan while active.
- Shooting star asteroids: orange, 2.5× faster, 4-6s TTL, 3× points. 25% chance per spawn + independent timer (every 5-8s). Elongated shape (6-8 vertices, 0.3-1.4 radius). Explodes into confetti on expiry.
- Confetti particles: colored rectangles with gravity, used for shooting star explosions. 8 colors, 1-2s lifetime.
