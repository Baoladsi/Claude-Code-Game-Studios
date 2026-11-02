/**
 * Canvas renderer: flat "cel" fills with heavy ink outlines, a follow camera,
 * telegraphs, true-hitbox overlay (Glitch Instinct) and screen effects.
 * Reads the World; never mutates gameplay state.
 */
import { clamp } from '../core/math.js';
import { createRng } from '../core/rng.js';

const INK = '#0b0f1a';
const TELE_PARRY = '255,140,60';
const TELE_UNPARRY = '226,70,255';

export class Renderer {
  /** @param {HTMLCanvasElement} canvas @param {import('../game/world.js').World} world */
  constructor(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.dpr = 1;
    this.buildDecor();
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth || 1280;
    const h = this.canvas.clientHeight || 720;
    this.dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.baseZoom = clamp(h / 780, 0.6, 1.5);
    this.zoomNow = this.zoomNow || this.baseZoom;
    this.cssW = w;
    this.cssH = h;
  }

  buildDecor() {
    const rng = createRng(7);
    const W = this.world.cfg.WORLD;
    const f = W.field;
    this.tufts = [];
    for (let i = 0; i < 700; i++) {
      this.tufts.push({ x: f.x + rng() * f.w, y: f.y + rng() * f.h, s: 0.6 + rng() * 0.9, flower: rng() < 0.12, hue: rng() });
    }
    this.stones = [];
    for (let i = 0; i < 40; i++) {
      this.stones.push({ x: f.x + rng() * f.w, y: f.y + rng() * f.h, w: 20 + rng() * 60, h: 10 + rng() * 18, a: rng() * Math.PI });
    }
    this.trees = [];
    const tryTree = (x, y) => {
      const r = 40 + rng() * 50;
      if (!this.world.isWalkable(x, y, -r) && !this.world.inRect(x, y, W.chasm, -r)) this.trees.push({ x, y, r, shade: rng() });
    };
    for (let i = 0; i < 900; i++) tryTree(rng() * W.width, rng() * W.height);
  }

  /** Draw one frame. */
  draw() {
    const { ctx, world } = this;
    const v = world.view;
    const p = world.player;
    const W = world.cfg.WORLD;
    // camera: during the boss fight, zoom out and frame both Kai and the boss
    const b = world.boss;
    const fight = b.engaged && b.alive;
    this.zoomNow += ((fight ? this.baseZoom * 0.8 : this.baseZoom) - this.zoomNow) * 0.05;
    v.zoom = this.zoomNow;
    v.w = this.cssW / v.zoom;
    v.h = this.cssH / v.zoom;
    const fx = fight ? p.x + (b.x - p.x) * 0.4 : p.x;
    const fy = fight ? p.y + (b.y - p.y) * 0.4 : p.y;
    if (!this.cam) this.cam = { x: fx, y: fy };
    this.cam.x += (fx - this.cam.x) * 0.15;
    this.cam.y += (fy - this.cam.y) * 0.15;
    v.x = clamp(this.cam.x - v.w / 2, 0, Math.max(0, W.width - v.w));
    v.y = clamp(this.cam.y - v.h / 2, 0, Math.max(0, W.height - v.h));
    let sx = 0;
    let sy = 0;
    if (world.shakeAmp > 0) {
      sx = (Math.random() - 0.5) * world.shakeAmp;
      sy = (Math.random() - 0.5) * world.shakeAmp;
    }
    const k = this.dpr * v.zoom;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a1a16';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(k, 0, 0, k, (-v.x + sx) * k, (-v.y + sy) * k);

    this.drawGround();
    this.drawHazards(false);
    this.drawPickups();
    const actors = [...world.enemies.filter((e) => e.alive), world.boss, p, ...world.pillars.map((q) => ({ pillar: q, y: q.y, x: q.x }))];
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) {
      if (a.pillar) this.drawPillar(a.pillar);
      else if (a === p) this.drawPlayer(p);
      else if (a === world.boss) this.drawBoss(a);
      else this.drawEnemy(a);
    }
    this.drawTrees();
    this.drawHazards(true);
    this.drawParticles();
    if (world.glitch.active) this.drawTrueHitboxes();
    this.drawFloaters();

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawScreenFx();
  }

  // ---- environment --------------------------------------------------------------
  drawGround() {
    const { ctx, world } = this;
    const W = world.cfg.WORLD;
    const f = W.field;
    // chasm void
    const c = W.chasm;
    const g = ctx.createLinearGradient(c.x + c.w, 0, c.x, 0);
    g.addColorStop(0, '#0d0f1f');
    g.addColorStop(1, '#000000');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - 60, c.y - 40, c.w + 60, c.h + 80);
    // field
    ctx.fillStyle = '#2f6b3a';
    ctx.fillRect(f.x, f.y, f.w, f.h);
    ctx.fillStyle = '#367a42';
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.ellipse(f.x + ((i * 397) % f.w), f.y + ((i * 613) % f.h), 220, 140, i, 0, Math.PI * 2);
      ctx.fill();
    }
    // cliff edge beside the chasm
    ctx.strokeStyle = '#c9b48a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(f.x, c.y);
    for (let y = c.y; y <= c.y + c.h; y += 25) ctx.lineTo(f.x - 4 + ((y * 7) % 9), y);
    ctx.stroke();
    // ledge
    const l = W.ledge;
    ctx.fillStyle = '#2a5a35';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(l.x, l.y, l.w, l.h, 30);
    ctx.fill();
    ctx.stroke();
    this.drawWarpStone(W.warpStone);
    if (!world.flags.chestOpened) this.drawChest(W.chest);
    // corridor + arena floor
    const a = W.arena;
    ctx.fillStyle = '#4b5263';
    ctx.fillRect(W.corridor.x, W.corridor.y, W.corridor.w, W.corridor.h + 20);
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
    ctx.fillStyle = '#434a5a';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160,255,200,0.12)';
    ctx.lineWidth = 3;
    for (const rr of [a.r * 0.35, a.r * 0.62, a.r * 0.88]) {
      ctx.beginPath();
      ctx.arc(a.x, a.y, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(160,255,200,0.16)';
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    const glyphs = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ';
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + world.time * 0.03;
      ctx.fillText(glyphs[i], a.x + Math.cos(ang) * a.r * 0.75, a.y + Math.sin(ang) * a.r * 0.75);
    }
    if (world.arenaLocked) {
      ctx.strokeStyle = `rgba(226,70,255,${0.5 + Math.sin(world.time * 6) * 0.2})`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r - 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    // stones & grass
    ctx.lineWidth = 3;
    for (const s of this.stones) {
      if (!this.visible(s.x, s.y, 80)) continue;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.a);
      ctx.fillStyle = '#7d7a6e';
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.roundRect(-s.w / 2, -s.h / 2, s.w, s.h, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#5e8f45';
      ctx.fillRect(-s.w / 2, -s.h / 2, s.w * 0.4, 4);
      ctx.restore();
    }
    for (const t of this.tufts) {
      if (!this.visible(t.x, t.y, 20)) continue;
      if (t.flower) {
        ctx.fillStyle = t.hue > 0.5 ? '#ffd6ff' : '#fff3b0';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 3 * t.s, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#4f9a50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(t.x - 5 * t.s, t.y);
        ctx.lineTo(t.x - 2 * t.s, t.y - 8 * t.s);
        ctx.moveTo(t.x, t.y);
        ctx.lineTo(t.x + 1, t.y - 11 * t.s);
        ctx.moveTo(t.x + 5 * t.s, t.y);
        ctx.lineTo(t.x + 4 * t.s, t.y - 7 * t.s);
        ctx.stroke();
      }
    }
    this.drawSign(W.sign);
  }

  drawTrees() {
    const { ctx } = this;
    for (const t of this.trees) {
      if (!this.visible(t.x, t.y, t.r + 10)) continue;
      ctx.fillStyle = t.shade > 0.5 ? '#1d4a2c' : '#173d26';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(120,200,120,0.18)';
      ctx.beginPath();
      ctx.arc(t.x - t.r * 0.3, t.y - t.r * 0.3, t.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPillar(q) {
    const { ctx } = this;
    if (!this.visible(q.x, q.y, q.r + 30)) return;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(q.x + 6, q.y + 8, q.r, q.r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9b9585';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b8b2a0';
    ctx.beginPath();
    ctx.arc(q.x - q.r * 0.15, q.y - q.r * 0.15, q.r * 0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5e8f45';
    ctx.beginPath();
    ctx.arc(q.x + q.r * 0.4, q.y - q.r * 0.3, q.r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSign(s) {
    const { ctx } = this;
    if (!this.visible(s.x, s.y, 80)) return;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.fillStyle = '#6b4f2a';
    ctx.fillRect(s.x - 3, s.y - 10, 6, 34);
    ctx.fillStyle = '#c49a5a';
    ctx.beginPath();
    ctx.roundRect(s.x - 48, s.y - 36, 96, 30, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DO NOT JUMP', s.x, s.y - 16);
  }

  drawWarpStone(w) {
    const { ctx, world } = this;
    if (!this.visible(w.x, w.y, 60)) return;
    const pulse = 0.6 + Math.sin(world.time * 4) * 0.3;
    ctx.fillStyle = `rgba(125,249,255,${pulse * 0.35})`;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r + 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7df9ff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w.x, w.y - w.r);
    ctx.lineTo(w.x + w.r * 0.7, w.y);
    ctx.lineTo(w.x, w.y + w.r);
    ctx.lineTo(w.x - w.r * 0.7, w.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  drawChest(c) {
    const { ctx } = this;
    ctx.fillStyle = '#b5651d';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(c.x - 20, c.y - 14, 40, 28, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(c.x - 4, c.y - 6, 8, 10);
  }

  // ---- actors ---------------------------------------------------------------------
  shadow(x, y, r) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + r * 0.7, r * 1.05, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPlayer(p) {
    const { ctx, world } = this;
    for (const g of p.trail) {
      ctx.fillStyle = `rgba(125,249,255,${0.35 * (1 - g.t / 0.25)})`;
      ctx.beginPath();
      ctx.arc(g.x, g.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    let scale = 1;
    if (p.state === 'falling') scale = Math.max(0.05, p.fallTimer / 1.1);
    if (p.state === 'dead') ctx.globalAlpha = 0.5;
    if (p.mercy > 0 && Math.floor(p.mercy * 20) % 2 === 0) ctx.globalAlpha = 0.45;
    this.shadow(p.x, p.y, p.r * scale);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(scale, scale);
    const f = p.facing;
    const fx = Math.cos(f);
    const fy = Math.sin(f);
    // weapon
    const w = p.weapon;
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    if (w.id === 'twinFangs') {
      for (const off of [-0.7, 0.7]) {
        const a = f + off;
        ctx.lineWidth = 7;
        ctx.strokeStyle = INK;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12);
        ctx.lineTo(Math.cos(a) * 34, Math.sin(a) * 34);
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.strokeStyle = w.color;
        ctx.stroke();
      }
    } else {
      const a = f + 0.5;
      ctx.lineWidth = 12;
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * 52, Math.sin(a) * 52);
      ctx.stroke();
      ctx.lineWidth = 7;
      ctx.strokeStyle = w.color;
      ctx.stroke();
    }
    // body (coat)
    ctx.fillStyle = '#2ec4b6';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // scarf tail
    ctx.strokeStyle = '#ff5d8f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-fx * 10, -fy * 10);
    ctx.quadraticCurveTo(-fx * 26 + Math.sin(world.time * 12) * 5, -fy * 26, -fx * 32, -fy * 30 + 6);
    ctx.stroke();
    // turnip helm (the running gag — Kai will not take it off)
    const gilded = world.flags.chestOpened;
    ctx.fillStyle = gilded ? '#ffe680' : '#f4ecf7';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -4, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = gilded ? '#e0a800' : '#9b5de5';
    ctx.beginPath();
    ctx.arc(0, -4, 12, Math.PI * 0.05, Math.PI * 0.95);
    ctx.fill();
    ctx.fillStyle = '#5fbf4a';
    for (const a of [-0.5, 0, 0.5]) {
      ctx.beginPath();
      ctx.ellipse(Math.sin(a) * 8, -18 - Math.cos(a) * 4, 4, 9, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(fx * 6 - fy * 4, -4 + fy * 5 + fx * 3, 2, 0, Math.PI * 2);
    ctx.arc(fx * 6 + fy * 4, -4 + fy * 5 - fx * 3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;

    // swing arc
    if (p.state === 'attack' && p.move) {
      const m = p.move;
      const prog = (p.t - m.windup) / (m.active + 0.08);
      if (prog >= 0 && prog <= 1) {
        const half = (m.arc * Math.PI) / 360;
        ctx.fillStyle = `rgba(255,255,255,${0.45 * (1 - prog)})`;
        ctx.strokeStyle = w.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, m.range, p.attackDir - half, p.attackDir - half + half * 2 * Math.min(1, prog * 1.6));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    if (p.state === 'guard') {
      const parry = p.guardStatus() === 'parry';
      ctx.strokeStyle = parry ? '#ffe066' : '#8ab4ff';
      ctx.lineWidth = parry ? 7 : 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 10, p.facing - 1, p.facing + 1);
      ctx.stroke();
    }
    if (p.counterTimer > 0) {
      ctx.strokeStyle = `rgba(255,159,28,${0.4 + Math.sin(world.time * 20) * 0.3})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 16, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawEnemy(e) {
    const { ctx, world } = this;
    if (!this.visible(e.x, e.y, 80)) return;
    const winding = e.fsm.is('attack') && e.fsm.time < e.cfg.attack.windup;
    const bob = e.type === 'wispArcher' ? Math.sin(world.time * 4 + e.bob) * 5 - 10 : 0;
    this.shadow(e.x, e.y, e.r);
    ctx.save();
    ctx.translate(e.x, e.y + bob);
    if (winding) {
      const back = Math.sin(e.fsm.time * 40) * 1.5 - 3;
      ctx.translate(Math.cos(e.facing) * back, Math.sin(e.facing) * back);
    }
    ctx.rotate(e.facing);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    const hitTint = e.flash > 0;
    if (e.type === 'thornling') {
      ctx.fillStyle = hitTint ? '#fff' : '#6b8f3a';
      ctx.beginPath();
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const rr = i % 2 === 0 ? e.r + 6 : e.r - 1;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff3b3b';
      ctx.beginPath();
      ctx.arc(e.r * 0.45, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'sentinel') {
      ctx.fillStyle = hitTint ? '#fff' : '#8d8a7e';
      ctx.beginPath();
      ctx.roundRect(-e.r, -e.r, e.r * 2, e.r * 2, 9);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#5e8f45';
      ctx.fillRect(-e.r + 4, -e.r + 4, e.r * 0.8, 6);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.arc(0, 0, e.r + 6, -1, 1);
      ctx.stroke();
      ctx.strokeStyle = '#6c7585';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.fillStyle = winding ? '#ffef5c' : '#ff9f1c';
      ctx.fillRect(e.r * 0.25, -8, 6, 16);
    } else {
      const glow = winding ? 1 : 0.5;
      ctx.fillStyle = `rgba(86,207,225,${0.25 * glow})`;
      ctx.beginPath();
      ctx.arc(0, 0, e.r + 10 + (winding ? 6 : 0), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hitTint ? '#fff' : '#56cfe1';
      ctx.beginPath();
      ctx.moveTo(e.r + 4, 0);
      ctx.quadraticCurveTo(0, e.r * 1.2, -e.r - 10, 0);
      ctx.quadraticCurveTo(0, -e.r * 1.2, e.r + 4, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e0fbff';
      ctx.beginPath();
      ctx.arc(2, 0, e.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (e.fsm.is('stagger')) this.stars(e.x, e.y - e.r - 12);
    if (e.hp < e.maxHp) this.bar(e.x, e.y - e.r - 14 + bob, 40, e.hp / e.maxHp, '#ff5470');
  }

  drawBoss(b) {
    const { ctx, world } = this;
    if (!this.visible(b.x, b.y, 200)) return;
    const r = b.r;
    this.shadow(b.x, b.y, r * 1.2);
    ctx.save();
    ctx.translate(b.x, b.y);
    let s = 1;
    let off = 0;
    if (b.pose === 'rear' || b.pose === 'roar') s = 1.07 + Math.sin(world.time * 30) * 0.02;
    if (b.pose === 'windup') off = -8 + Math.sin(world.time * 50) * 2;
    if (b.pose === 'feint') off = Math.sin(world.time * 70) * 4;
    ctx.rotate(b.facing);
    ctx.translate(off, 0);
    ctx.scale(s, s);
    if (b.pose === 'stagger') ctx.rotate(Math.sin(world.time * 8) * 0.12);
    const p2 = b.phase === 2;
    const flash = b.flash > 0;
    if (b.pose === 'charge') {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 3;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-r * 1.3, i * 14);
        ctx.lineTo(-r * 2.4, i * 14);
        ctx.stroke();
      }
    }
    // body
    ctx.fillStyle = flash ? '#ffffff' : p2 ? '#2f3d31' : '#5b4a3a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(-r * 0.15, 0, r * 1.15, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (!flash) {
      if (p2) {
        ctx.strokeStyle = `rgba(93,255,157,${0.6 + Math.sin(world.time * 6) * 0.3})`;
        ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.moveTo(-r * 0.9 + i * 16, -r * 0.6);
          ctx.lineTo(-r * 0.8 + i * 16, 0);
          ctx.lineTo(-r * 0.95 + i * 16, r * 0.55);
          ctx.stroke();
        }
        const pulse = 10 + Math.sin(world.time * 5) * 3;
        ctx.fillStyle = '#5dff9d';
        ctx.shadowColor = '#5dff9d';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(-r * 1.0, 0, pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#4f7a3a';
        for (const [mx, my, mr] of [[-r * 0.6, -r * 0.4, 16], [-r * 0.2, r * 0.45, 13], [r * 0.2, -r * 0.5, 10], [-r * 0.9, r * 0.1, 12]]) {
          ctx.beginPath();
          ctx.arc(mx, my, mr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // head
    ctx.fillStyle = flash ? '#fff' : p2 ? '#3b4a3d' : '#6b5845';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(r * 0.95, 0, r * 0.45, r * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const eye = b.engaged ? (p2 ? '#5dff9d' : '#ffd166') : '#555';
    ctx.fillStyle = eye;
    ctx.beginPath();
    ctx.arc(r * 1.15, -9, 4.5, 0, Math.PI * 2);
    ctx.arc(r * 1.15, 9, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // antlers
    for (const side of [-1, 1]) {
      if (b.antlersBroken) {
        ctx.strokeStyle = INK;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(r * 0.85, side * r * 0.25);
        ctx.lineTo(r * 0.75, side * r * 0.55);
        ctx.stroke();
        ctx.strokeStyle = '#a08850';
        ctx.lineWidth = 5;
        ctx.stroke();
        continue;
      }
      const pts = [
        [[r * 0.85, side * r * 0.25], [r * 0.6, side * r * 1.0], [r * 0.2, side * r * 1.5]],
        [[r * 0.65, side * r * 0.85], [r * 1.1, side * r * 1.25]],
        [[r * 0.45, side * r * 1.2], [r * 0.6, side * r * 1.7]],
        [[r * 0.35, side * r * 1.35], [r * -0.1, side * r * 1.6]],
      ];
      for (const [lw, col] of [[11, INK], [6, b.parts.antlers.hp < b.parts.antlers.max * 0.4 ? '#ff9f1c' : '#e9c46a']]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        for (const seg of pts) {
          ctx.beginPath();
          ctx.moveTo(...seg[0]);
          for (const q of seg.slice(1)) ctx.lineTo(...q);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
    if (b.pose === 'stagger' || b.staggered) this.stars(b.x, b.y - r - 20);
    if (!b.engaged && b.alive) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'italic 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('…an ancient warden slumbers', b.x, b.y - r - 50);
    }
    if (!b.alive) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, r * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  stars(x, y) {
    const { ctx, world } = this;
    ctx.fillStyle = '#ffe066';
    for (let i = 0; i < 3; i++) {
      const a = world.time * 6 + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 16, y + Math.sin(a) * 5, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  bar(x, y, w, ratio, color) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 6);
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y, w * clamp(ratio, 0, 1), 4);
  }

  drawPickups() {
    const { ctx, world } = this;
    for (const k of world.pickups) {
      const item = world.cfg.ITEMS[k.item];
      const bob = Math.sin(world.time * 5 + k.x) * 3;
      ctx.fillStyle = item.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(k.x, k.y - 9 + bob);
      ctx.lineTo(k.x + 7, k.y + bob);
      ctx.lineTo(k.x, k.y + 9 + bob);
      ctx.lineTo(k.x - 7, k.y + bob);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // ---- hazards ---------------------------------------------------------------------
  path(shape, scale = 1) {
    const { ctx } = this;
    ctx.beginPath();
    switch (shape.type) {
      case 'circle':
        ctx.arc(shape.x, shape.y, Math.max(0.1, shape.r * scale), 0, Math.PI * 2);
        break;
      case 'arc':
        ctx.moveTo(shape.x, shape.y);
        ctx.arc(shape.x, shape.y, Math.max(0.1, shape.r * scale), shape.dir - shape.half, shape.dir + shape.half);
        ctx.closePath();
        break;
      case 'capsule': {
        const x2 = shape.x1 + (shape.x2 - shape.x1) * scale;
        const y2 = shape.y1 + (shape.y2 - shape.y1) * scale;
        const a = Math.atan2(y2 - shape.y1, x2 - shape.x1);
        ctx.arc(shape.x1, shape.y1, shape.r, a + Math.PI / 2, a - Math.PI / 2);
        ctx.arc(x2, y2, shape.r, a - Math.PI / 2, a + Math.PI / 2);
        ctx.closePath();
        break;
      }
      case 'ring':
        ctx.arc(shape.x, shape.y, shape.r + shape.width / 2, 0, Math.PI * 2);
        ctx.arc(shape.x, shape.y, Math.max(0.1, shape.r - shape.width / 2), 0, Math.PI * 2, true);
        break;
      default:
        break;
    }
  }

  /** @param {boolean} projectiles draw projectiles (on top) or area telegraphs (under actors) */
  drawHazards(projectiles) {
    const { ctx, world } = this;
    for (const h of world.hazards) {
      if (h.projectile !== projectiles || h.cancelled) continue;
      if (h.projectile) {
        if (!h.live) continue;
        const col = h.team === 'player' ? '#ffe066' : h.color || '#9fe7ff';
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(h.shape.x, h.shape.y, h.shape.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.stroke();
        continue;
      }
      if (h.follow && !h.telegraphing) continue; // body-attached (charge) — the body is the warning
      const rgb = h.parryable ? TELE_PARRY : TELE_UNPARRY;
      if (h.telegraphing) {
        ctx.fillStyle = `rgba(${rgb},0.13)`;
        this.path(h.visual);
        ctx.fill();
        ctx.fillStyle = `rgba(${rgb},0.28)`;
        this.path(h.visual, h.progress);
        ctx.fill();
        ctx.setLineDash([10, 8]);
        ctx.strokeStyle = `rgba(${rgb},0.85)`;
        ctx.lineWidth = 2.5;
        this.path(h.visual);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (h.live) {
        ctx.fillStyle = `rgba(${rgb},0.5)`;
        this.path(h.shape);
        ctx.fill();
        if (h.shape.type === 'ring') {
          ctx.strokeStyle = '#1d4a2c';
          ctx.lineWidth = 4;
          this.path(h.shape);
          ctx.stroke();
        }
      }
    }
  }

  /** Glitch Instinct overlay: draw every TRUE hitbox with a jittery wireframe. */
  drawTrueHitboxes() {
    const { ctx, world } = this;
    ctx.save();
    for (const h of world.hazards) {
      if (h.done || h.team !== 'enemy') continue;
      const j = (Math.random() - 0.5) * 3;
      ctx.translate(j, 0);
      ctx.strokeStyle = 'rgba(0,255,220,0.95)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      this.path(h.shape);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.translate(-j, 0);
      if (h.label && h.telegraphing) {
        const x = h.shape.x ?? (h.shape.x1 + h.shape.x2) / 2;
        const y = h.shape.y ?? (h.shape.y1 + h.shape.y2) / 2;
        ctx.fillStyle = '#00ffdc';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${h.label} · ${(h.delay - h.t).toFixed(2)}s`, x, y);
      }
    }
    ctx.restore();
  }

  drawParticles() {
    const { ctx, world } = this;
    for (const q of world.particles) {
      ctx.globalAlpha = 1 - q.t / q.life;
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
    ctx.globalAlpha = 1;
  }

  drawFloaters() {
    const { ctx, world } = this;
    ctx.textAlign = 'center';
    for (const f of world.floaters) {
      const k = f.t / f.life;
      const pop = k < 0.15 ? 1 + (0.15 - k) * 4 : 1;
      ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
      ctx.font = `900 ${Math.round(f.size * pop)}px "Trebuchet MS", sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = INK;
      ctx.strokeText(f.text, f.x, f.y - k * 40);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - k * 40);
    }
    ctx.globalAlpha = 1;
  }

  drawScreenFx() {
    const { ctx, world } = this;
    const w = this.cssW;
    const h = this.cssH;
    const p = world.player;
    if (world.slowTimer > 0) {
      const k = world.slowTimer / world.cfg.JUST_EVADE.duration;
      ctx.fillStyle = `rgba(80,200,255,${0.16 * k})`;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = `rgba(125,249,255,${0.5 * k})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const y = ((i * 97 + world.time * 900) % h);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w * 0.18, y);
        ctx.moveTo(w, y);
        ctx.lineTo(w * 0.82, y);
        ctx.stroke();
      }
    }
    if (world.glitch.active) {
      ctx.fillStyle = 'rgba(0,255,220,0.05)';
      for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
    }
    const hpk = p.hp / p.maxHp;
    if (hpk < 0.3 && p.alive) {
      const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
      g.addColorStop(0, 'rgba(255,0,40,0)');
      g.addColorStop(1, `rgba(255,0,40,${0.35 * (1 - hpk / 0.3)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (p.state === 'falling') {
      ctx.fillStyle = `rgba(0,0,0,${1 - p.fallTimer / 1.1})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  visible(x, y, pad) {
    const v = this.world.view;
    return x > v.x - pad && x < v.x + v.w + pad && y > v.y - pad && y < v.y + v.h + pad;
  }
}
