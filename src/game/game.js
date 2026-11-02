/**
 * Game shell: fixed-timestep loop, screens (title / play / pause / death /
 * victory), and the wiring between World events and HUD, feed and audio.
 */
import * as CONFIG from '../data/config.js';
import { FEED, VIGNETTES } from '../data/feed.js';
import { EventBus } from '../core/events.js';
import { Input } from '../core/input.js';
import { World } from './world.js';
import { Renderer } from '../render/renderer.js';
import { Hud } from '../render/hud.js';
import { Sfx } from '../audio/sfx.js';
import { RANKS } from './style.js';

export class Game {
  /** @param {HTMLCanvasElement} canvas @param {Document} doc */
  constructor(canvas, doc, opts = {}) {
    this.doc = doc;
    this.canvas = canvas;
    this.events = new EventBus();
    this.input = new Input(CONFIG.BINDINGS, globalThis, canvas);
    this.world = new World(CONFIG, { events: this.events, seed: opts.seed });
    this.renderer = new Renderer(canvas, this.world);
    this.hud = new Hud(doc, this.world);
    this.sfx = new Sfx();
    this.state = 'title';
    this.acc = 0;
    this.last = 0;
    this.once = new Set();
    this.screens = {
      title: doc.getElementById('screen-title'),
      pause: doc.getElementById('screen-pause'),
      death: doc.getElementById('screen-death'),
      victory: doc.getElementById('screen-victory'),
    };
    doc.getElementById('vignette-intro').innerHTML = VIGNETTES.intro.map((l) => `<p>${l}</p>`).join('');
    globalThis.addEventListener('resize', () => this.renderer.resize());
    this.wireEvents();
    this.applyScene(opts.scene);
  }

  /** Post the lines for feed key `key` (optionally only the first time). */
  post(key, onlyOnce = false) {
    if (onlyOnce) {
      if (this.once.has(key)) return;
      this.once.add(key);
    }
    for (const [kind, text] of FEED[key]) this.hud.feed(kind, text);
  }

  wireEvents() {
    const on = (n, f) => this.events.on(n, f);
    on('dodge', () => this.sfx.play('dodge'));
    on('hit', ({ crit }) => this.sfx.play(crit ? 'crit' : 'hit'));
    on('playerHit', () => this.sfx.play('hurt'));
    on('item', () => this.sfx.play('item'));
    on('justEvade', ({ first }) => {
      this.sfx.play('just');
      if (first) this.post('firstJustEvade', true);
    });
    on('parry', ({ first }) => {
      this.sfx.play('parry');
      if (first) this.post('firstParry', true);
    });
    on('enemyKilled', ({ first }) => first && this.post('firstKill', true));
    on('glitch', () => this.post('glitch'));
    on('skillEvolved', ({ from, to, blurb }) => {
      this.hud.feed('skill', `${from} evolved → ${to} (${blurb})`);
      this.hud.banner('SKILL EVOLVED', `${from} → ${to}`, 'skill');
    });
    on('enterArena', () => {
      this.post('enterArena');
      this.hud.banner('UNIQUE BOSS', CONFIG.BOSS.name, 'boss');
    });
    on('bossIntro', () => this.sfx.play('roar'));
    on('partBreak', () => {
      this.sfx.play('break');
      this.post('partBreak', true);
      this.hud.banner('PART BREAK', 'Antlers shattered', 'break');
    });
    on('bossPhase2', () => {
      this.sfx.play('roar');
      this.post('phase2', true);
      this.hud.banner('PHASE 2', 'The Verdant Core awakens', 'boss');
    });
    on('bossWallStun', () => this.post('wallStun', true));
    on('sss', () => this.post('sss', true));
    on('secret', () => {
      this.post('secret', true);
      this.hud.banner('SECRET FOUND', 'Gravity Is a Suggestion', 'skill');
    });
    on('playerDied', () => {
      this.post('death');
      this.deathDelay = 1.2;
    });
    on('bossDefeated', () => {
      this.sfx.play('win');
      this.post('victory', true);
      this.hud.banner('WORLD FIRST', `${CONFIG.BOSS.name} defeated`, 'worldfirst');
      this.victoryDelay = 4;
    });
  }

  /** Optional deep-link for testing: ?scene=arena|gate|ledge|field */
  applyScene(scene) {
    const p = this.world.player;
    const W = CONFIG.WORLD;
    if (scene === 'arena' || scene === 'gate') {
      p.x = W.respawnBeforeArena.x;
      p.y = scene === 'arena' ? W.arena.y + W.arena.r - 140 : W.respawnBeforeArena.y;
      this.world.checkpoint = { ...W.respawnBeforeArena };
    } else if (scene === 'ledge') {
      p.x = W.chasm.x + W.chasm.w + 60;
      p.y = W.chasm.y + W.chasm.h / 2;
    }
  }

  show(name) {
    for (const [k, el] of Object.entries(this.screens)) el.classList.toggle('show', k === name);
  }

  begin() {
    this.sfx.unlock();
    this.state = 'playing';
    this.show(null);
    this.post('start');
  }

  start() {
    this.show('title');
    requestAnimationFrame((t) => this.frame(t));
  }

  frame(ts) {
    const dt = Math.min(0.1, this.last ? (ts - this.last) / 1000 : 0);
    this.last = ts;
    this.tick(dt);
    this.renderer.draw();
    this.hud.update(dt);
    requestAnimationFrame((t) => this.frame(t));
  }

  /** Advance the shell by `dt` real seconds (also used by headless tests). */
  tick(dt) {
    const input = this.input;
    if (this.state === 'title') {
      if (input.pressed('confirm')) this.begin();
      input.endStep();
      return;
    }
    if (input.pressed('pause') && (this.state === 'playing' || this.state === 'paused')) {
      this.state = this.state === 'playing' ? 'paused' : 'playing';
      this.show(this.state === 'paused' ? 'pause' : null);
      input.endStep();
      return;
    }
    if (this.state === 'paused') {
      input.endStep();
      return;
    }
    if (this.state === 'dead' && input.pressed('confirm')) {
      this.world.respawn();
      this.state = 'playing';
      this.show(null);
    }
    if (this.state === 'victory' && input.pressed('confirm')) {
      this.state = 'playing';
      this.show(null);
    }
    if (input.pressed('restart') && this.state !== 'playing') {
      globalThis.location.reload();
    }
    this.acc += dt;
    const step = CONFIG.TIMESTEP;
    while (this.acc >= step) {
      this.world.step(step, input);
      input.endStep();
      this.acc -= step;
      this.updateDelays(step);
    }
  }

  updateDelays(dt) {
    if (this.deathDelay > 0 && (this.deathDelay -= dt) <= 0) {
      this.state = 'dead';
      this.show('death');
    }
    if (this.victoryDelay > 0 && (this.victoryDelay -= dt) <= 0) {
      this.state = 'victory';
      this.fillVictory();
      this.show('victory');
    }
  }

  fillVictory() {
    const w = this.world;
    const s = w.stats;
    const rows = [
      ['Fight time', `${s.bossTime.toFixed(1)}s`],
      ['Best combo', `${w.combo.best} hits`],
      ['Peak style', RANKS[w.style.peakIndex]],
      ['Just Evades', s.justEvades],
      ['Parries', s.parries],
      ['Part breaks', s.partBreaks],
      ['Deaths', s.deaths],
    ];
    this.doc.getElementById('victory-stats').innerHTML = rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
    this.doc.getElementById('vignette-victory').innerHTML = VIGNETTES.victory.map((l) => `<p>${l}</p>`).join('');
  }
}
