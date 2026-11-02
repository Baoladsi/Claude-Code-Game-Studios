/**
 * "Glitch Instinct": fills through precise play. When full, activating it
 * reveals every attack's TRUE hitbox (which can differ from its telegraph)
 * until it drains.
 */
export class GlitchInstinct {
  /** @param {{max:number, duration:number, gains:Record<string, number>}} cfg */
  constructor(cfg) {
    this.cfg = cfg;
    this.value = 0;
    this.active = false;
    this.timer = 0;
  }

  /** Add meter for `action` (ignored while active). */
  gain(action, mult = 1) {
    if (this.active) return;
    this.value = Math.min(this.cfg.max, this.value + (this.cfg.gains[action] || 0) * mult);
  }

  get ready() {
    return !this.active && this.value >= this.cfg.max;
  }

  /** Try to activate. Returns true if it started. */
  activate() {
    if (!this.ready) return false;
    this.active = true;
    this.timer = this.cfg.duration;
    return true;
  }

  update(dt) {
    if (!this.active) return;
    this.timer = Math.max(0, this.timer - dt);
    this.value = (this.cfg.max * this.timer) / this.cfg.duration;
    if (this.timer === 0) this.active = false;
  }

  get ratio() {
    return this.value / this.cfg.max;
  }
}
