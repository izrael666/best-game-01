// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules forward from
// a fresh world for a fixed number of steps, steered by a simple autopilot, so the frame is what
// a short game really looks like and the same seed always gives the same frame. The play scene's
// pilot aims at the most threatening rock (the one that reaches the star soonest), leading its
// shot, and fires whenever a rock is in flight; the end scene's pilot never fires, so the star
// is caught out, as a hurried player is.
import { BULLET, CANNON, FIELD, STAR, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;

/** The rock that reaches the star soonest, or null when the sky is clear. */
function nearestThreat(state) {
  let best = null;
  let bestTime = Infinity;
  for (let index = 0; index < state.asteroids.length; index += 1) {
    const item = state.asteroids[index];
    if (!item.active) continue;
    const d = Math.hypot(STAR.x - item.x, STAR.y - item.y);
    const speed = Math.hypot(item.vx, item.vy) || 1;
    const time = d / speed;
    if (time < bestTime) {
      bestTime = time;
      best = item;
    }
  }
  return best;
}

/** The aim angle that leads `target`: where it will be when a bullet gets there. */
function leadAngle(state, target) {
  const cannonX = STAR.x + Math.cos(state.cannon.angle) * CANNON.orbit;
  const cannonY = STAR.y + Math.sin(state.cannon.angle) * CANNON.orbit;
  const d = Math.max(1, Math.hypot(target.x - cannonX, target.y - cannonY));
  const time = d / BULLET.speed;
  const futureX = target.x + target.vx * time;
  const futureY = target.y + target.vy * time;
  return Math.atan2(futureY - STAR.y, futureX - STAR.x);
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, { angle: 0, firing: false }, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  // The end scene first plays well for a while (so the game over screen carries a real
  // score), then the pilot stops firing and the star is caught out.
  const goodPlaySeconds = name === 'end' ? 20 : 0;
  for (let index = 0; index < limit / STEP; index += 1) {
    const target = nearestThreat(world.state);
    const goodPlay = index < goodPlaySeconds / STEP;
    const angle = target === null
      ? world.state.cannon.angle + 0.1 * STEP
      : goodPlay || name === 'play'
        ? leadAngle(world.state, target)
        : world.state.cannon.angle + 0.1 * STEP;
    const events = world.step(STEP, { angle, firing: (goodPlay || name === 'play') && target !== null }, false);
    if (events & EVENT_OVER) break;
  }
  const over = world.state.star.hearts === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
