/**
 * Tiny synthesized SFX (Web Audio). No asset files; safe to call before the
 * user has interacted (calls are ignored until `unlock()`).
 */
export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  unlock() {
    if (this.ctx) return;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (AC) this.ctx = new AC();
  }

  tone(freq, dur, type = 'square', vol = 0.08, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur);
  }

  play(name) {
    switch (name) {
      case 'hit': return this.tone(220, 0.06, 'square', 0.05, -80);
      case 'crit': return this.tone(440, 0.1, 'sawtooth', 0.06, -200);
      case 'dodge': return this.tone(600, 0.08, 'sine', 0.03, 300);
      case 'just': this.tone(880, 0.25, 'sine', 0.08, 600); return this.tone(1320, 0.3, 'triangle', 0.05, -400);
      case 'parry': return this.tone(1200, 0.18, 'triangle', 0.09, -300);
      case 'hurt': return this.tone(140, 0.2, 'sawtooth', 0.08, -60);
      case 'break': this.tone(90, 0.5, 'sawtooth', 0.1, -50); return this.tone(700, 0.4, 'square', 0.05, -500);
      case 'roar': return this.tone(70, 1.0, 'sawtooth', 0.12, 40);
      case 'item': return this.tone(990, 0.12, 'triangle', 0.05, 200);
      case 'win': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 'triangle', 0.07), i * 140)); return undefined;
      default: return undefined;
    }
  }
}
