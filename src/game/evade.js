/**
 * Timing classification for dodges and guards. Pure so the windows can be
 * unit-tested frame by frame.
 * @module game/evade
 */

/**
 * Classify a dodge at the moment an active hitbox touches the player.
 * @param {number} elapsed seconds since the dodge started
 * @param {{iframeStart:number, iframeEnd:number, perfectWindow:number}} cfg
 * @returns {'perfect'|'evade'|null} null = not invulnerable, the hit lands
 */
export function classifyDodge(elapsed, cfg) {
  if (elapsed < cfg.iframeStart || elapsed > cfg.iframeEnd) return null;
  return elapsed - cfg.iframeStart <= cfg.perfectWindow ? 'perfect' : 'evade';
}

/**
 * Classify a guard at the moment a hit arrives.
 * @param {number} elapsed seconds since the guard was raised
 * @param {{parryWindow:number}} cfg
 * @returns {'parry'|'block'}
 */
export function classifyGuard(elapsed, cfg) {
  return elapsed <= cfg.parryWindow ? 'parry' : 'block';
}
