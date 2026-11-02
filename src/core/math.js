/**
 * Small, dependency-free math helpers shared by simulation and rendering.
 * @module core/math
 */

/** Clamp `v` into the inclusive range [lo, hi]. */
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Linear interpolation between `a` and `b` by `t` (0..1). */
export const lerp = (a, b, t) => a + (b - a) * t;

/** Euclidean distance between two points. */
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

/** Angle (radians) of the vector from point A to point B. */
export const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);

/** Signed shortest difference `b - a` between two angles, in (-PI, PI]. */
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Unit vector for (x, y); the zero vector stays zero. */
export function normalize(x, y) {
  const l = Math.hypot(x, y);
  return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
}

/** Degrees to radians. */
export const rad = (deg) => (deg * Math.PI) / 180;

/** Pick a random float in [lo, hi) from an injected rng. */
export const randRange = (rng, lo, hi) => lo + (hi - lo) * rng();

/** Distance from point P to segment AB. */
export function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 > 0 ? ((px - ax) * abx + (py - ay) * aby) / len2 : 0;
  t = clamp(t, 0, 1);
  return dist(px, py, ax + abx * t, ay + aby * t);
}
