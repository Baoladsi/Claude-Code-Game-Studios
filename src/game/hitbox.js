/**
 * Hitbox shapes and overlap tests. Every attack in the game is one of:
 *  - circle  { type:'circle',  x, y, r }
 *  - arc     { type:'arc',     x, y, r, dir, half }   (sector, angles in radians)
 *  - capsule { type:'capsule', x1, y1, x2, y2, r }    (swept circle / charge lane)
 *  - ring    { type:'ring',    x, y, r, width }       (expanding shockwave band)
 * Targets are always circles (x, y, radius).
 * @module game/hitbox
 */
import { angleDiff, angleTo, dist, pointSegmentDistance } from '../core/math.js';

/**
 * Does `shape` overlap the circle (cx, cy, cr)?
 * @returns {boolean}
 */
export function overlapsCircle(shape, cx, cy, cr) {
  switch (shape.type) {
    case 'circle':
      return dist(shape.x, shape.y, cx, cy) <= shape.r + cr;
    case 'arc': {
      const d = dist(shape.x, shape.y, cx, cy);
      if (d > shape.r + cr) return false;
      if (d <= cr) return true;
      const a = angleTo(shape.x, shape.y, cx, cy);
      const slack = Math.asin(Math.min(1, cr / d));
      return Math.abs(angleDiff(shape.dir, a)) <= shape.half + slack;
    }
    case 'capsule':
      return pointSegmentDistance(cx, cy, shape.x1, shape.y1, shape.x2, shape.y2) <= shape.r + cr;
    case 'ring': {
      const d = dist(shape.x, shape.y, cx, cy);
      const inner = shape.r - shape.width / 2;
      const outer = shape.r + shape.width / 2;
      return d + cr >= inner && d - cr <= outer;
    }
    default:
      throw new Error(`Unknown hitbox type: ${shape.type}`);
  }
}

/** Shallow copy of a shape, so a hazard can move without mutating config. */
export const cloneShape = (s) => ({ ...s });
