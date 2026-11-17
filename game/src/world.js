// Starhold's rules and state, with no drawing and no browser in it: the Heart Star, the orbital
// cannon, the bullet and asteroid pools, particles, spawning, splitting, score, hearts and waves.
// step() advances one fixed step and returns what happened as bit flags, so the caller can react
// without the world knowing about screens or sound. Nothing here allocates after createWorld returns.
import { ASTEROID, BULLET, CANNON, FIELD, HEARTS, POOL, SPAWN, STAR, STAR_INVULNERABLE, WAVE } from './config.js';

export const KIND_SMALL = 0;
export const KIND_MEDIUM = 1;
export const KIND_LARGE = 2;
export const KIND_COMET = 3;

export const EVENT_DESTROY = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_WAVE = 8;
export const EVENT_SHOT = 16;

/** An asteroid kind's tuning, by kind. */
const KIND_TUNING = [ASTEROID.small, ASTEROID.medium, ASTEROID.large, ASTEROID.comet];
/** What a destroyed asteroid splits into (null: it just breaks apart). */
const SPLIT_INTO = [null, KIND_SMALL, KIND_MEDIUM, null];
/** How many pieces a split makes. */
const SPLIT_COUNT = [0, 2, 2, 0];
/** Vertices of an asteroid's irregular outline; filled in place when it spawns. */
const SHAPE_VERTICES = 9;

function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export function createWorld(random) {
  const star = { x: STAR.x, y: STAR.y, radius: STAR.radius, hearts: HEARTS, invulnerable: 0 };
  const cannon = { angle: -Math.PI / 2 };
  const bullets = [];
  for (let index = 0; index < POOL.bullets; index += 1) {
    bullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 });
  }
  const asteroids = [];
  for (let index = 0; index < POOL.asteroids; index += 1) {
    const shape = [];
    for (let vertex = 0; vertex < SHAPE_VERTICES; vertex += 1) shape.push(1);
    asteroids.push({ active: false, kind: KIND_SMALL, x: 0, y: 0, vx: 0, vy: 0, radius: 0, hp: 0, rot: 0, rotSpeed: 0, shape, score: 0 });
  }
  const particles = [];
  for (let index = 0; index < POOL.particles; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff' });
  }
  const stars = [];
  for (let index = 0; index < POOL.stars; index += 1) {
    stars.push({ x: random() * FIELD.width, y: random() * FIELD.height, size: 0.6 + random() * 1.8, phase: random() * Math.PI * 2, speed: 0.4 + random() * 1.2 });
  }
  const state = {
    star, cannon, bullets, asteroids, particles, stars,
    score: 0, wave: 1, elapsed: 0, spawnTimer: 0, cometTimer: 0, fireTimer: 0,
    shake: 0, flash: 0, waveBanner: 0,
  };
  let lastWave = 1;

  function reset() {
    star.hearts = HEARTS;
    star.invulnerable = 0;
    cannon.angle = -Math.PI / 2;
    for (const bullet of bullets) bullet.active = false;
    for (const asteroid of asteroids) asteroid.active = false;
    for (const particle of particles) particle.active = false;
    state.score = 0;
    state.wave = 1;
    state.elapsed = 0;
    state.spawnTimer = SPAWN.interval;
    state.cometTimer = SPAWN.cometInterval;
    state.fireTimer = 0;
    state.shake = 0;
    state.flash = 0;
    state.waveBanner = 0;
    lastWave = 1;
  }

  function freeBullet() {
    for (let index = 0; index < bullets.length; index += 1) if (!bullets[index].active) return bullets[index];
    return null;
  }

  function freeAsteroid() {
    for (let index = 0; index < asteroids.length; index += 1) if (!asteroids[index].active) return asteroids[index];
    return null;
  }

  function freeParticle() {
    for (let index = 0; index < particles.length; index += 1) if (!particles[index].active) return particles[index];
    return null;
  }

  function burst(x, y, color, count, speed) {
    for (let index = 0; index < count; index += 1) {
      const particle = freeParticle();
      if (particle === null) return;
      const angle = random() * Math.PI * 2;
      const power = speed * (0.3 + random() * 0.7);
      particle.active = true;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * power;
      particle.vy = Math.sin(angle) * power;
      particle.maxLife = 0.35 + random() * 0.45;
      particle.life = particle.maxLife;
      particle.size = 1.5 + random() * 2.5;
      particle.color = color;
    }
  }

  /** Which kind spawns next: bigger rocks grow more common as the waves pass. */
  function spawnKind() {
    const roll = random();
    if (state.wave < 3) return roll < 0.55 ? KIND_SMALL : roll < 0.85 ? KIND_MEDIUM : KIND_LARGE;
    return roll < 0.4 ? KIND_SMALL : roll < 0.75 ? KIND_MEDIUM : KIND_LARGE;
  }

  function placeAsteroid(item, kind) {
    const tuning = KIND_TUNING[kind];
    // Start just off a random edge, aimed near the star with a little spread.
    const edge = Math.floor(random() * 4);
    const margin = tuning.radius + 4;
    if (edge === 0) { item.x = random() * FIELD.width; item.y = -margin; }
    else if (edge === 1) { item.x = random() * FIELD.width; item.y = FIELD.height + margin; }
    else if (edge === 2) { item.x = -margin; item.y = random() * FIELD.height; }
    else { item.x = FIELD.width + margin; item.y = random() * FIELD.height; }
    const aimX = STAR.x + (random() * 2 - 1) * 70;
    const aimY = STAR.y + (random() * 2 - 1) * 70;
    const speed = tuning.speedMin + random() * (tuning.speedMax - tuning.speedMin) + SPAWN.speedPerWave * (state.wave - 1);
    const d = Math.max(1, dist(item.x, item.y, aimX, aimY));
    item.vx = ((aimX - item.x) / d) * speed;
    item.vy = ((aimY - item.y) / d) * speed;
    item.kind = kind;
    item.radius = tuning.radius;
    item.hp = tuning.hp;
    item.score = tuning.score;
    item.rot = random() * Math.PI * 2;
    item.rotSpeed = (random() * 2 - 1) * 1.4;
    for (let vertex = 0; vertex < SHAPE_VERTICES; vertex += 1) item.shape[vertex] = 0.72 + random() * 0.5;
    item.active = true;
  }

  function spawnAsteroid(kind) {
    const item = freeAsteroid();
    if (item === null) return;
    placeAsteroid(item, kind);
  }

  function splitAsteroid(item) {
    const into = SPLIT_INTO[item.kind];
    if (into === null) return;
    for (let index = 0; index < SPLIT_COUNT[item.kind]; index += 1) {
      const piece = freeAsteroid();
      if (piece === null) return;
      placeAsteroid(piece, into);
      piece.x = item.x;
      piece.y = item.y;
      // Fan the pieces out from the parent's path.
      const spread = (index === 0 ? -1 : 1) * 0.6;
      const speed = Math.hypot(item.vx, item.vy);
      const base = Math.atan2(item.vy, item.vx) + spread;
      piece.vx = Math.cos(base) * speed * 1.15;
      piece.vy = Math.sin(base) * speed * 1.15;
    }
  }

  function destroyAsteroid(item) {
    item.active = false;
    state.score += item.score;
    burst(item.x, item.y, item.kind === KIND_COMET ? '#ff9a3d' : '#ffd76a', item.kind === KIND_LARGE ? 14 : 9, 170);
    splitAsteroid(item);
  }

  function fireBullet() {
    const bullet = freeBullet();
    if (bullet === null) return false;
    const angle = cannon.angle;
    const startX = star.x + Math.cos(angle) * (CANNON.orbit + CANNON.barrel);
    const startY = star.y + Math.sin(angle) * (CANNON.orbit + CANNON.barrel);
    bullet.active = true;
    bullet.x = startX;
    bullet.y = startY;
    bullet.vx = Math.cos(angle) * BULLET.speed;
    bullet.vy = Math.sin(angle) * BULLET.speed;
    bullet.life = BULLET.life;
    return true;
  }

  /**
   * One fixed step. `input` is { angle, firing } (the cannon's aim and whether to shoot).
   * With `harmless` set (the title screen's backdrop) rocks drift in and fade at the star:
   * nothing scores, nothing is hurt, and the cannon slowly sweeps on its own.
   */
  function step(dt, input, harmless) {
    let events = 0;
    state.elapsed += dt;
    state.wave = Math.min(WAVE.max, 1 + Math.floor(state.elapsed / WAVE.seconds));
    if (state.wave > lastWave) {
      lastWave = state.wave;
      if (!harmless) {
        state.score += WAVE.bonus;
        state.waveBanner = 2.2;
        events |= EVENT_WAVE;
      }
    }
    if (state.waveBanner > 0) state.waveBanner = Math.max(0, state.waveBanner - dt);
    if (state.shake > 0) state.shake = Math.max(0, state.shake - 30 * dt);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - 1.4 * dt);
    if (star.invulnerable > 0) star.invulnerable = Math.max(0, star.invulnerable - dt);
    if (state.fireTimer > 0) state.fireTimer = Math.max(0, state.fireTimer - dt);

    cannon.angle = harmless ? cannon.angle + 0.25 * dt : input.angle;

    if (!harmless && input.firing && state.fireTimer === 0) {
      if (fireBullet()) {
        state.fireTimer = CANNON.fireCooldown;
        events |= EVENT_SHOT;
      }
    }

    if (!harmless) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnAsteroid(spawnKind());
        state.spawnTimer += Math.max(SPAWN.minInterval, SPAWN.interval * SPAWN.intervalScale ** (state.wave - 1));
      }
      if (state.wave >= SPAWN.cometFromWave) {
        state.cometTimer -= dt;
        if (state.cometTimer <= 0) {
          spawnAsteroid(KIND_COMET);
          state.cometTimer += SPAWN.cometInterval;
        }
      }
    } else {
      // The backdrop keeps a few rocks drifting so the title screen stays alive.
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnAsteroid(spawnKind());
        state.spawnTimer += SPAWN.interval * 1.6;
      }
    }

    for (let index = 0; index < bullets.length; index += 1) {
      const bullet = bullets[index];
      if (!bullet.active) continue;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      if (bullet.life <= 0 || bullet.x < -20 || bullet.x > FIELD.width + 20 || bullet.y < -20 || bullet.y > FIELD.height + 20) bullet.active = false;
    }

    for (let index = 0; index < asteroids.length; index += 1) {
      const item = asteroids[index];
      if (!item.active) continue;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.rot += item.rotSpeed * dt;

      // Bullets break rocks (a spent bullet is gone either way).
      for (let b = 0; b < bullets.length; b += 1) {
        const bullet = bullets[b];
        if (!bullet.active) continue;
        if (dist(bullet.x, bullet.y, item.x, item.y) < item.radius + BULLET.radius) {
          bullet.active = false;
          item.hp -= 1;
          burst(bullet.x, bullet.y, '#bff6ff', 3, 90);
          if (item.hp <= 0) {
            destroyAsteroid(item);
            if (!harmless) events |= EVENT_DESTROY;
          }
          break;
        }
      }
      if (!item.active) continue;

      // A rock that reaches the star is consumed by it.
      if (dist(item.x, item.y, star.x, star.y) < star.radius + item.radius * 0.6) {
        item.active = false;
        burst(item.x, item.y, '#ff6b81', 12, 200);
        if (harmless) continue;
        if (star.invulnerable > 0) continue;
        star.hearts -= 1;
        star.invulnerable = STAR_INVULNERABLE;
        state.shake = 14;
        state.flash = 0.55;
        events |= EVENT_HIT;
        if (star.hearts === 0) {
          events |= EVENT_OVER;
          burst(star.x, star.y, '#ffd76a', 30, 320);
          break;
        }
      }
    }

    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      if (!particle.active) continue;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.985;
      particle.vy *= 0.985;
      particle.life -= dt;
      if (particle.life <= 0) particle.active = false;
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
