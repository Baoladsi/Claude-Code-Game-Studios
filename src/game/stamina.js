/**
 * Stamina pool: spent by dodges, attacks and blocked hits; regenerates after
 * a short delay since the last spend.
 */
export class Stamina {
  /** @param {{max:number, regenPerSec:number, regenDelay:number}} cfg */
  constructor(cfg) {
    this.max = cfg.max;
    this.regenPerSec = cfg.regenPerSec;
    this.regenDelay = cfg.regenDelay;
    this.value = cfg.max;
    this.delayTimer = 0;
  }

  /** Is there at least `n` stamina available? */
  canSpend(n) {
    return this.value >= n;
  }

  /** Spend `n` if available. Returns false (and spends nothing) otherwise. */
  spend(n) {
    if (!this.canSpend(n)) return false;
    this.value -= n;
    this.delayTimer = this.regenDelay;
    return true;
  }

  /** Forcefully remove up to `n` (e.g. blocking); never goes below zero. */
  drain(n) {
    this.value = Math.max(0, this.value - n);
    this.delayTimer = this.regenDelay;
  }

  /** Advance regeneration by `dt` seconds. */
  update(dt) {
    if (this.delayTimer > 0) {
      this.delayTimer = Math.max(0, this.delayTimer - dt);
      return;
    }
    this.value = Math.min(this.max, this.value + this.regenPerSec * dt);
  }

  /** 0..1 fill ratio for the HUD. */
  get ratio() {
    return this.value / this.max;
  }
}
