/**
 * A Hazard is any damaging area in the world: a melee swing, a charge lane,
 * a projectile, a shockwave. It has an optional telegraph phase (`delay`)
 * followed by a live phase (`active`).
 *
 * `shape` is the TRUE hitbox. `visual` is what the telegraph shows; it may be
 * smaller or narrower than the truth — learning that gap (or revealing it with
 * Glitch Instinct) is part of the game.
 */
export class Hazard {
  /** @param {object} o options; see field list below */
  constructor(o) {
    this.shape = o.shape;
    this.visual = o.visual || o.shape;
    this.delay = o.delay ?? 0;
    this.active = o.active ?? 0.1;
    this.damage = o.damage ?? 0;
    this.parryable = o.parryable ?? false;
    this.owner = o.owner || null;
    this.team = o.team || 'enemy';
    this.follow = o.follow || null;
    this.vel = o.vel || null;
    this.grow = o.grow || 0;
    this.telegraphOnly = o.telegraphOnly || false;
    this.projectile = o.projectile || false;
    this.label = o.label || '';
    this.color = o.color || null;
    this.t = 0;
    this.spent = false;
    this.cancelled = false;
    this.evaded = false;
    this.reflected = false;
    this.hitTargets = new Set();
  }

  /** Can this hazard currently deal damage? */
  get live() {
    return !this.telegraphOnly && !this.cancelled && !this.spent && this.t >= this.delay && this.t < this.delay + this.active;
  }

  /** Is the telegraph (warning) currently showing? */
  get telegraphing() {
    return !this.cancelled && this.t < this.delay;
  }

  /** Should the hazard be removed? */
  get done() {
    return this.cancelled || this.spent || this.t >= this.delay + this.active;
  }

  /** 0..1 telegraph progress. */
  get progress() {
    return this.delay > 0 ? Math.min(1, this.t / this.delay) : 1;
  }

  update(dt) {
    this.t += dt;
    if (this.follow) this.moveTo(this.follow.x, this.follow.y);
    if (this.t >= this.delay) {
      if (this.vel) this.moveTo(this.shape.x + this.vel.x * dt, this.shape.y + this.vel.y * dt);
      if (this.grow) {
        this.shape.r += this.grow * dt;
        if (this.visual !== this.shape) this.visual.r += this.grow * dt;
      }
    }
  }

  moveTo(x, y) {
    this.shape.x = x;
    this.shape.y = y;
    if (this.visual !== this.shape) {
      this.visual.x = x;
      this.visual.y = y;
    }
  }
}
