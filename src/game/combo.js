/** Hit counter that resets after a gap without hits, or when the player is hit. */
export class ComboCounter {
  /** @param {number} window seconds allowed between hits */
  constructor(window) {
    this.window = window;
    this.count = 0;
    this.timer = 0;
    this.best = 0;
  }

  /** Register a landed hit. */
  hit() {
    this.count += 1;
    this.timer = this.window;
    this.best = Math.max(this.best, this.count);
  }

  /** Drop the combo (player took damage). */
  reset() {
    this.count = 0;
    this.timer = 0;
  }

  update(dt) {
    if (this.count === 0) return;
    this.timer -= dt;
    if (this.timer <= 0) this.reset();
  }
}
