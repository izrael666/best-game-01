// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The Heart Star the player guards, at the centre of the field. */
export const STAR = { x: FIELD.width / 2, y: FIELD.height / 2, radius: 34 };

/** The orbital cannon: it rides a ring around the star and shoots outward. */
export const CANNON = {
  orbit: 82,
  angleSpeed: 3.4,
  fireCooldown: 0.16,
  barrel: 26,
};

export const BULLET = { speed: 920, radius: 5, life: 1.15 };

/** How many hits the star survives. */
export const HEARTS = 3;
/** Seconds the star cannot be hurt again after a hit. */
export const STAR_INVULNERABLE = 1.2;

/** Asteroid kinds: size, hits to destroy, speed range and score. */
export const ASTEROID = {
  small: { radius: 14, hp: 1, speedMin: 78, speedMax: 118, score: 10 },
  medium: { radius: 24, hp: 2, speedMin: 58, speedMax: 88, score: 20 },
  large: { radius: 38, hp: 3, speedMin: 42, speedMax: 66, score: 40 },
  comet: { radius: 18, hp: 2, speedMin: 175, speedMax: 215, score: 50 },
};

/** Spawn pacing: the interval shrinks and the speed grows as waves pass. */
export const SPAWN = {
  interval: 1.15,
  intervalScale: 0.9,
  minInterval: 0.35,
  speedPerWave: 6,
  cometFromWave: 3,
  cometInterval: 24,
};

/** Seconds of play per wave, the last wave, and the bonus for reaching a new wave. */
export const WAVE = { seconds: 20, max: 12, bonus: 50 };

/** Pool sizes; all allocated once, at boot. */
export const POOL = { bullets: 48, asteroids: 40, particles: 180, stars: 110 };

export const PALETTE = {
  backdrop: '#070a14',
  spaceTop: '#0a0f22',
  spaceBottom: '#05070f',
  star: '#ffd76a',
  starCore: '#fff6d8',
  cannon: '#4fd8c7',
  cannonDark: '#1d7f74',
  bullet: '#bff6ff',
  asteroid: '#8a7f72',
  asteroidDark: '#5d5348',
  comet: '#ff9a3d',
  particle: '#ffd76a',
  ring: '#22304a',
  panel: '#141a2c',
  panelEdge: '#2a3550',
  text: '#eef1f5',
  muted: '#93a0b8',
  danger: '#ff5d5d',
  heart: '#ff6b81',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'starhold.best';
