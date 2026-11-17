// Keyboard and pointer input. The mouse aims the orbital cannon (its angle is the direction
// from the star to the pointer); the arrow keys turn it instead. Holding the pointer or Space
// fires. One-shot presses (start or restart, pause, mute) are queued as bit flags and taken once
// by the loop, so a press between two frames is never lost and never counted twice.
import { CANNON, STAR } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(target, getView) {
  let angle = -Math.PI / 2;
  let rotate = 0;
  let firing = false;
  let actions = 0;
  let leftKey = false;
  let rightKey = false;

  function updateRotate() {
    rotate = (rightKey ? 1 : 0) - (leftKey ? 1 : 0);
  }

  function aimAt(clientX, clientY) {
    const rect = target.getBoundingClientRect();
    const view = getView();
    const fieldX = (clientX - rect.left - view.x) / view.scale;
    const fieldY = (clientY - rect.top - view.y) / view.scale;
    angle = Math.atan2(fieldY - STAR.y, fieldX - STAR.x);
  }

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) leftKey = true;
    else if (RIGHT.has(event.code)) rightKey = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      firing = true;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    updateRotate();
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) leftKey = false;
    else if (RIGHT.has(event.code)) rightKey = false;
    else if (CONFIRM.has(event.code)) firing = false;
    updateRotate();
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    leftKey = false;
    rightKey = false;
    firing = false;
    updateRotate();
  });
  target.addEventListener('pointermove', (event) => {
    aimAt(event.clientX, event.clientY);
  });
  target.addEventListener('pointerdown', (event) => {
    aimAt(event.clientX, event.clientY);
    actions |= ACTION_CONFIRM;
    firing = true;
  });
  window.addEventListener('pointerup', () => {
    firing = false;
  });
  target.addEventListener('pointerleave', () => {
    firing = false;
  });

  return {
    /** The cannon's aim angle, in radians around the star. */
    angle() {
      return angle;
    },
    /** -1 for left, 1 for right, 0 for neither or both (arrow keys turn the cannon). */
    rotate() {
      return rotate;
    },
    /** Whether the fire button is held. */
    firing() {
      return firing;
    },
    /** Turn the cannon by the keys' rotation for one step. */
    update(dt) {
      angle += rotate * CANNON.angleSpeed * dt;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
