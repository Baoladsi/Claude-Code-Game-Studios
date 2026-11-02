/**
 * Entry point. Optional URL params: ?scene=arena|gate|ledge  ?autostart=1  ?seed=N
 */
import { Game } from './game/game.js';

const params = new URLSearchParams(globalThis.location.search);
const game = new Game(document.getElementById('game'), document, {
  scene: params.get('scene'),
  seed: params.has('seed') ? Number(params.get('seed')) : undefined,
});
game.start();
if (params.get('autostart') === '1') game.begin();

// Debug / automated-test hook. Not used by gameplay code.
globalThis.__aetherfall = game;
