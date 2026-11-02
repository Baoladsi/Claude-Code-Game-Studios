/**
 * Use-based skill growth: each tracked action counts uses, and at a threshold
 * the skill evolves into a stronger variant (data/config.js SKILLS).
 */
export class SkillBook {
  /** @param {Record<string, {name:string, evolvesAt:number, into:string, effect:object}>} cfg */
  constructor(cfg) {
    this.cfg = cfg;
    this.uses = {};
    this.evolved = {};
  }

  /** Record one use. Returns the evolution entry if this use triggered it. */
  use(id) {
    if (!this.cfg[id]) return null;
    this.uses[id] = (this.uses[id] || 0) + 1;
    const def = this.cfg[id];
    if (!this.evolved[id] && this.uses[id] >= def.evolvesAt) {
      this.evolved[id] = true;
      return def;
    }
    return null;
  }

  /** Effect multiplier `key` for skill `id`, or 1 if not evolved. */
  effect(id, key) {
    return this.evolved[id] ? this.cfg[id].effect[key] ?? 1 : 1;
  }

  /** Display name (evolved name once evolved). */
  name(id) {
    return this.evolved[id] ? this.cfg[id].into : this.cfg[id].name;
  }
}
