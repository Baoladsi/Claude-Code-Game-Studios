/**
 * Style rank (D → SSS). Varied, risky play earns points; repeating the same
 * action earns less each time; getting hit costs a lot; points decay faster
 * the higher the rank.
 */
export const RANKS = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

export class StyleMeter {
  /** @param {object} cfg STYLE block from data/config.js */
  constructor(cfg) {
    this.cfg = cfg;
    this.points = 0;
    this.recent = [];
    this.peakIndex = 0;
  }

  /** Award points for `action`, with diminishing returns for repeats. Returns points gained. */
  add(action) {
    const base = this.cfg.gains[action] || 0;
    const repeats = this.recent.filter((a) => a === action).length;
    const gain = base * Math.pow(this.cfg.repeatFalloff, repeats);
    this.points = Math.min(this.cfg.maxPoints, this.points + gain);
    this.recent.push(action);
    if (this.recent.length > this.cfg.memory) this.recent.shift();
    this.peakIndex = Math.max(this.peakIndex, this.rankIndex);
    return gain;
  }

  /** The player took damage. */
  hit() {
    this.points = Math.max(0, this.points * this.cfg.hitKeep - this.cfg.hitPenalty);
    this.recent.length = 0;
  }

  /** Decay over time, faster at higher ranks. */
  update(dt) {
    this.peakIndex = Math.max(this.peakIndex, this.rankIndex);
    this.points = Math.max(0, this.points - this.cfg.decayPerRank[this.rankIndex] * dt);
  }

  /** Index into RANKS for the current points. */
  get rankIndex() {
    let idx = 0;
    this.cfg.thresholds.forEach((t, i) => {
      if (this.points >= t) idx = i;
    });
    return idx;
  }

  /** Current rank letter. */
  get rank() {
    return RANKS[this.rankIndex];
  }

  /** 0..1 progress toward the next rank (1 at SSS). */
  get progress() {
    const i = this.rankIndex;
    const t = this.cfg.thresholds;
    if (i >= t.length - 1) return 1;
    return (this.points - t[i]) / (t[i + 1] - t[i]);
  }
}
