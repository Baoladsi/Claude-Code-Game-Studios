// Shared test fixtures: a scripted input stub and a world factory.
import * as CONFIG from '../../src/data/config.js';
import { World } from '../../src/game/world.js';

/** Input stub: `held` and `pressed` are sets of action names. */
export function fakeInput() {
  return {
    heldSet: new Set(),
    pressedSet: new Set(),
    mouse: { x: 0, y: 0, active: false },
    held(a) { return this.heldSet.has(a); },
    pressed(a) { return this.pressedSet.has(a); },
    moveVector() {
      return { x: (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0), y: (this.held('down') ? 1 : 0) - (this.held('up') ? 1 : 0) };
    },
    endStep() { this.pressedSet.clear(); },
  };
}

export const makeWorld = (seed = 1) => new World(CONFIG, { seed });
export { CONFIG };

/** Run `n` fixed steps. */
export function run(world, input, n) {
  for (let i = 0; i < n; i++) {
    world.step(CONFIG.TIMESTEP, input);
    input.endStep();
  }
}
