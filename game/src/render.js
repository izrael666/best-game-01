// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. Canvas
// shapes and text for the starfield, the star, the cannon, the rocks and the HUD. Text that
// holds a number is rebuilt only when the number changes, so a frame allocates nothing.
import { FIELD, FONT, HEARTS, PALETTE, STAR } from './config.js';
import { KIND_COMET } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 640, top: 150, line: 32, bottom: 74 };
const HEART_SIZE = 13;
const HEART_GAP = 8;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

/** A small heart path, centred on (x, y). */
function heartPath(context, x, y, size) {
  context.beginPath();
  context.moveTo(x, y + size * 0.9);
  context.bezierCurveTo(x - size * 1.2, y, x - size * 0.6, y - size, x, y - size * 0.3);
  context.bezierCurveTo(x + size * 0.6, y - size, x + size * 1.2, y, x, y + size * 0.9);
  context.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const waveLabel = cachedLabel('Wave ');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  let backdrop = null;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
    backdrop = context.createLinearGradient(0, 0, 0, FIELD.height);
    backdrop.addColorStop(0, PALETTE.spaceTop);
    backdrop.addColorStop(1, PALETTE.spaceBottom);
  }

  /** The view transform, for input to turn pointer positions into field positions. */
  function getView() {
    return view;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function drawStars(state) {
    for (let index = 0; index < state.stars.length; index += 1) {
      const star = state.stars[index];
      const twinkle = 0.55 + 0.45 * Math.sin(state.elapsed * star.speed + star.phase);
      context.globalAlpha = twinkle;
      context.fillStyle = PALETTE.text;
      context.fillRect(star.x, star.y, star.size, star.size);
    }
    context.globalAlpha = 1;
  }

  function drawOrbitRing() {
    context.strokeStyle = PALETTE.ring;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(STAR.x, STAR.y, 82, 0, Math.PI * 2);
    context.stroke();
  }

  function drawAsteroid(item) {
    context.save();
    context.translate(item.x, item.y);
    context.rotate(item.rot);
    context.beginPath();
    for (let vertex = 0; vertex < item.shape.length; vertex += 1) {
      const angle = (vertex / item.shape.length) * Math.PI * 2;
      const radius = item.radius * item.shape[vertex];
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (vertex === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    if (item.kind === KIND_COMET) {
      context.fillStyle = PALETTE.comet;
      context.fill();
      context.strokeStyle = PALETTE.asteroidDark;
      context.lineWidth = 2;
      context.stroke();
      // A comet drags a fading tail behind it.
      context.restore();
      context.save();
      const speed = Math.hypot(item.vx, item.vy) || 1;
      const tx = (item.vx / speed) * item.radius * 2.2;
      const ty = (item.vy / speed) * item.radius * 2.2;
      const gradient = context.createLinearGradient(item.x, item.y, item.x - tx, item.y - ty);
      gradient.addColorStop(0, PALETTE.comet);
      gradient.addColorStop(1, 'rgba(255,154,61,0)');
      context.strokeStyle = gradient;
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(item.x, item.y);
      context.lineTo(item.x - tx, item.y - ty);
      context.stroke();
      context.restore();
      return;
    }
    context.fillStyle = PALETTE.asteroid;
    context.fill();
    context.strokeStyle = PALETTE.asteroidDark;
    context.lineWidth = 2;
    context.stroke();
    context.restore();
  }

  function drawStar(state) {
    const pulse = 1 + 0.06 * Math.sin(state.elapsed * 2.4);
    const radius = STAR.radius * pulse;
    // Glow: concentric circles fading out, no gradient object needed.
    for (let ring = 4; ring >= 1; ring -= 1) {
      context.globalAlpha = 0.07 * (5 - ring);
      context.fillStyle = PALETTE.star;
      context.beginPath();
      context.arc(STAR.x, STAR.y, radius * (1 + ring * 0.55), 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    // Four slow rays.
    context.save();
    context.translate(STAR.x, STAR.y);
    context.rotate(state.elapsed * 0.15);
    context.fillStyle = PALETTE.star;
    for (let ray = 0; ray < 4; ray += 1) {
      context.rotate(Math.PI / 2);
      context.beginPath();
      context.moveTo(0, -radius * 0.9);
      context.lineTo(radius * 0.12, -radius * 1.7);
      context.lineTo(-radius * 0.12, -radius * 1.7);
      context.closePath();
      context.fill();
    }
    context.restore();
    context.fillStyle = PALETTE.star;
    context.beginPath();
    context.arc(STAR.x, STAR.y, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.starCore;
    context.beginPath();
    context.arc(STAR.x, STAR.y, radius * 0.55, 0, Math.PI * 2);
    context.fill();
    // Blink while the star is invulnerable after a hit.
    if (state.star.invulnerable > 0 && Math.floor(state.star.invulnerable * 10) % 2 === 0) {
      context.globalAlpha = 0.35;
      context.fillStyle = PALETTE.danger;
      context.beginPath();
      context.arc(STAR.x, STAR.y, radius * 1.15, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }
  }

  function drawCannon(state) {
    const angle = state.cannon.angle;
    const x = STAR.x + Math.cos(angle) * 82;
    const y = STAR.y + Math.sin(angle) * 82;
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.fillStyle = PALETTE.cannonDark;
    context.fillRect(0, -4, 26, 8);
    context.fillStyle = PALETTE.cannon;
    context.beginPath();
    context.arc(0, 0, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.starCore;
    context.beginPath();
    context.arc(0, 0, 5, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawBullets(state) {
    for (let index = 0; index < state.bullets.length; index += 1) {
      const bullet = state.bullets[index];
      if (!bullet.active) continue;
      const tail = 0.03;
      context.strokeStyle = PALETTE.bullet;
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(bullet.x - bullet.vx * tail, bullet.y - bullet.vy * tail);
      context.lineTo(bullet.x, bullet.y);
      context.stroke();
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(bullet.x, bullet.y, 2.5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawParticles(state) {
    for (let index = 0; index < state.particles.length; index += 1) {
      const particle = state.particles[index];
      if (!particle.active) continue;
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 20, 28, PALETTE.text, 'left');
    text(waveLabel(state.wave), FIELD.width / 2, 20, 28, PALETTE.text, 'center');
    const firstHeart = FIELD.width - 24 - HEARTS * (HEART_SIZE * 2 + HEART_GAP) + HEART_GAP;
    text('Star', firstHeart - 14, 20, 28, PALETTE.text, 'right');
    for (let heart = 0; heart < HEARTS; heart += 1) {
      context.fillStyle = heart < state.star.hearts ? PALETTE.heart : PALETTE.panelEdge;
      heartPath(context, firstHeart + heart * (HEART_SIZE * 2 + HEART_GAP) + HEART_SIZE, 32, HEART_SIZE);
      context.fill();
    }
    if (state.waveBanner > 0) {
      context.globalAlpha = Math.min(1, state.waveBanner);
      text(`Wave ${state.wave}`, FIELD.width / 2, FIELD.height / 2 - 120, 54, PALETTE.star, 'center');
      context.globalAlpha = 1;
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 48, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 40, 24, PALETTE.star, 'center');
  }

  const TITLE_LINES = [
    'Guard the Heart Star. Asteroids drift in from the dark —',
    'break them before they reach it. Big rocks split in two.',
    'Aim with the mouse, fire with a click or Space.',
    'Arrows or A D turn the cannon. P pauses, M mutes.',
    '',
  ];
  const PAUSED_LINES = ['The rocks will wait for you.'];
  const OVER_LINES = ['', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    // Screen shake: a deterministic wobble that dies away after a hit.
    const shakeX = state.shake > 0 ? Math.sin(state.elapsed * 91) * state.shake : 0;
    const shakeY = state.shake > 0 ? Math.cos(state.elapsed * 113) * state.shake : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    context.fillStyle = backdrop;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    drawStars(state);
    drawOrbitRing();
    for (let index = 0; index < state.asteroids.length; index += 1) {
      const item = state.asteroids[index];
      if (item.active) drawAsteroid(item);
    }
    drawStar(state);
    drawCannon(state);
    drawBullets(state);
    drawParticles(state);
    if (state.flash > 0) {
      context.globalAlpha = state.flash * 0.5;
      context.fillStyle = PALETTE.danger;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
      context.globalAlpha = 1;
    }
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = bestLabel(best);
      drawPanel('Starhold', TITLE_LINES, 'Press Space or click to start');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      drawPanel('The star is dark', OVER_LINES, 'Press Space or click to guard it again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, getView };
}
