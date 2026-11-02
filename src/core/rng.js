/**
 * Seeded pseudo-random generator (mulberry32). Injected everywhere randomness
 * is used so tests and replays are deterministic.
 * @param {number} seed 32-bit integer seed
 * @returns {() => number} function returning floats in [0, 1)
 */
export function createRng(seed = 1) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
