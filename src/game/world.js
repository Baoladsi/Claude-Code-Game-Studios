/**
 * World: owns every entity and runs one fixed simulation step at a time.
 * Contains no rendering or DOM code — presentation listens to `events`.
 */
import { angleTo, dist, normalize, rad } from '../core/math.js';
import { EventBus } from '../core/events.js';
import { createRng } from '../core/rng.js';
import { overlapsCircle } from './hitbox.js';
import { computeDamage, incomingDamage } from './damage.js';
import { StyleMeter } from './style.js';
import { ComboCounter } from './combo.js';
import { GlitchInstinct } from './glitch.js';
import { SkillBook } from './skills.js';
import { Hazard } from './hazard.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { UniqueBoss } from './boss.js';

export class World {
  /**
   * @param {object} cfg the full data/config.js module namespace
   * @param {{seed?:number, events?:EventBus}} [opts]
   */
  constructor(cfg, opts = {}) {
    this.cfg = cfg;
    this.rng = createRng(opts.seed ?? 20261102);
    this.events = opts.events || new EventBus();
    this.time = 0;
    this.view = { x: 0, y: 0, w: 1280, h: 720, zoom: 1 };
    this.style = new StyleMeter(cfg.STYLE);
    this.combo = new ComboCounter(cfg.COMBO.window);
    this.glitch = new GlitchInstinct(cfg.GLITCH);
    this.skills = new SkillBook(cfg.SKILLS);
    this.hazards = [];
    this.pickups = [];
    this.floaters = [];
    this.particles = [];
    this.inventory = {};
    this.flags = {};
    this.stats = { justEvades: 0, parries: 0, partBreaks: 0, deaths: 0, kills: 0, bossTime: 0 };
    this.slowTimer = 0;
    this.hitStop = 0;
    this.shakeAmp = 0;
    this.shakeTime = 0;
    this.arenaLocked = false;
    this.checkpoint = { ...cfg.WORLD.spawn };
    this.pillars = cfg.WORLD.pillars.map(([x, y, r]) => ({ x, y, r }));
    this.player = new Player(this, cfg.PLAYER, cfg.WEAPONS);
    this.enemies = cfg.WORLD.enemies.map(([type, x, y]) => new Enemy(this, type, x, y));
    this.boss = new UniqueBoss(this, cfg.BOSS);
  }

  // ---- geometry -----------------------------------------------------------
  inRect(x, y, rect, inset = 0) {
    return x >= rect.x + inset && x <= rect.x + rect.w - inset && y >= rect.y + inset && y <= rect.y + rect.h - inset;
  }

  inArena(x, y, inset = 0) {
    const a = this.cfg.WORLD.arena;
    return dist(x, y, a.x, a.y) <= a.r - inset;
  }

  inChasm(x, y) {
    return this.inRect(x, y, this.cfg.WORLD.chasm);
  }

  /** Is a circle of radius r at (x, y) standing on walkable ground? */
  isWalkable(x, y, r, opts = {}) {
    const W = this.cfg.WORLD;
    if (opts.bossOnly || this.arenaLocked) return this.inArena(x, y, r);
    if (this.inArena(x, y, r)) return true;
    if (this.inRect(x, y, W.corridor, 0) && x >= W.corridor.x + r && x <= W.corridor.x + W.corridor.w - r) return true;
    if (this.inRect(x, y, W.field, r)) return true;
    if (this.inRect(x, y, W.ledge, r)) return true;
    if (opts.dodging && this.inRect(x, y, W.chasm, -r)) return true;
    return false;
  }

  /** Can an enemy at home reach the player (not in arena/ledge)? */
  reachable(p) {
    return !this.arenaLocked && this.inRect(p.x, p.y, this.cfg.WORLD.field);
  }

  /**
   * Move a circle entity with axis-separated sliding and pillar push-out.
   * @returns {{blocked:boolean, pillar:object|null}}
   */
  moveCircle(ent, dx, dy, opts = {}) {
    const isBoss = ent === this.boss;
    const o = { ...opts, bossOnly: isBoss };
    let blocked = false;
    if (this.isWalkable(ent.x + dx, ent.y, ent.r, o)) ent.x += dx;
    else blocked = true;
    if (this.isWalkable(ent.x, ent.y + dy, ent.r, o)) ent.y += dy;
    else blocked = true;
    let hitPillar = null;
    for (const p of this.pillars) {
      const d = dist(ent.x, ent.y, p.x, p.y);
      const min = p.r + ent.r;
      if (d < min && d > 0) {
        hitPillar = p;
        ent.x = p.x + ((ent.x - p.x) / d) * min;
        ent.y = p.y + ((ent.y - p.y) / d) * min;
      }
    }
    return { blocked, pillar: hitPillar };
  }

  /** Living things the player can hit. */
  targets() {
    const list = this.enemies.filter((e) => e.alive);
    if (this.boss.alive && this.boss.engaged) list.push(this.boss);
    return list;
  }

  // ---- hazards ------------------------------------------------------------
  addHazard(o) {
    const h = new Hazard(o);
    this.hazards.push(h);
    return h;
  }

  cancelHazardsOf(owner) {
    for (const h of this.hazards) {
      if (h.owner === owner && !h.projectile && h.team === 'enemy') h.cancelled = true;
    }
  }

  resolveHazards() {
    const p = this.player;
    for (const h of this.hazards) {
      if (!h.live) continue;
      if (h.projectile && (!this.isWalkable(h.shape.x, h.shape.y, 0) || this.pillars.some((q) => dist(q.x, q.y, h.shape.x, h.shape.y) < q.r))) {
        h.spent = true;
        this.burst(h.shape.x, h.shape.y, h.color || '#9fe7ff', 6);
        continue;
      }
      if (h.team === 'player') {
        for (const t of this.targets()) {
          if (h.hitTargets.has(t) || t === h.owner && h.t < 0.05) continue;
          if (overlapsCircle(h.shape, t.x, t.y, t.r)) {
            h.hitTargets.add(t);
            h.spent = true;
            this.hitTarget(t, { base: h.damage * 3, poise: 30, partBreak: 0.5 }, {}, { reflect: true, fromX: h.shape.x, fromY: h.shape.y });
            break;
          }
        }
        continue;
      }
      if (!p.alive || p.state === 'falling' || h.hitTargets.has(p)) continue;
      if (!overlapsCircle(h.shape, p.x, p.y, p.r)) continue;

      const dodge = p.dodgeStatus();
      if (dodge) {
        if (!h.evaded) {
          h.evaded = true;
          if (dodge === 'perfect') this.justEvade(h);
          else this.style.add('evade');
        }
        continue;
      }
      if (p.shielded) continue;

      const guard = p.guardStatus();
      if (guard === 'parry' && h.parryable) {
        h.hitTargets.add(p);
        this.parry(h);
        continue;
      }
      h.hitTargets.add(p);
      if (h.projectile) h.spent = true;
      let mult = 1;
      if (guard && h.parryable) {
        if (p.stamina.canSpend(p.cfg.guard.blockStaminaCost)) {
          p.stamina.drain(p.cfg.guard.blockStaminaCost);
          mult = p.cfg.guard.blockDamageMult;
          this.floater(p.x, p.y - 34, 'BLOCK', '#b8c4ff', 14);
        } else {
          this.floater(p.x, p.y - 34, 'GUARD BREAK', '#ff6b6b', 16);
        }
      }
      this.damagePlayer(h.damage, h.shape.x ?? h.shape.x1, h.shape.y ?? h.shape.y1, mult);
    }
    this.hazards = this.hazards.filter((h) => !h.done);
  }

  damagePlayer(base, fromX, fromY, mult = 1) {
    const p = this.player;
    const amount = incomingDamage(base, p.stats, this.cfg.DAMAGE, mult);
    p.takeHit(amount, fromX, fromY);
    this.floater(p.x, p.y - 30, `-${amount}`, '#ff5470', 18);
    this.shake(mult < 1 ? 3 : 8, 0.25);
    if (mult >= 1) {
      this.style.hit();
      this.combo.reset();
    }
    this.events.emit('playerHit', { amount });
    if (!p.alive) {
      this.stats.deaths += 1;
      this.events.emit('playerDied');
    }
  }

  justEvade(h) {
    const p = this.player;
    this.stats.justEvades += 1;
    this.slowTimer = this.cfg.JUST_EVADE.duration;
    p.bonusIframes = this.cfg.JUST_EVADE.bonusIframes;
    this.style.add('justEvade');
    this.glitch.gain('justEvade');
    const label = this.skills.name('justEvade').toUpperCase();
    this.floater(p.x, p.y - 40, `${label}!`, '#7df9ff', 22);
    this.events.emit('justEvade', { hazard: h, first: this.stats.justEvades === 1 });
    this.useSkill('justEvade');
  }

  parry(h) {
    const p = this.player;
    this.stats.parries += 1;
    p.counterTimer = p.cfg.guard.counterWindow;
    this.style.add('parry');
    this.glitch.gain('parry');
    this.hitStop = 0.08;
    this.floater(p.x, p.y - 40, 'PARRY!', '#ffe066', 22);
    this.burst(p.x + Math.cos(p.facing) * 20, p.y + Math.sin(p.facing) * 20, '#ffe066', 14);
    if (h.projectile) {
      h.team = 'player';
      h.reflected = true;
      h.vel = { x: -h.vel.x * 1.5, y: -h.vel.y * 1.5 };
      h.active = h.t + 2;
      h.hitTargets.clear();
      this.style.add('reflect');
      this.glitch.gain('reflect');
    } else if (h.owner && h.owner.onParried) {
      h.owner.onParried();
      h.cancelled = true;
    }
    this.events.emit('parry', { first: this.stats.parries === 1 });
    this.useSkill('parry');
  }

  // ---- player offence -------------------------------------------------------
  /** Called every step a player move is in its active frames. */
  playerStrike(p, move) {
    const shape = { type: 'arc', x: p.x, y: p.y, r: move.range, dir: p.attackDir, half: rad(move.arc / 2) };
    for (const t of this.targets()) {
      if (move.hitSet.has(t)) continue;
      if (!overlapsCircle(shape, t.x, t.y, t.r)) continue;
      move.hitSet.add(t);
      this.hitTarget(t, move, p.weapon, { fromX: p.x, fromY: p.y });
    }
  }

  /**
   * Apply a player hit (melee or reflected projectile) to an enemy or the boss.
   * @param {object} t target
   * @param {object} move move data (base, poise, partBreak, finisher, switchCancel)
   * @param {object} weapon weapon (scaling) or {}
   * @param {{fromX:number, fromY:number, reflect?:boolean}} src
   */
  hitTarget(t, move, weapon, src) {
    const p = this.player;
    const isBoss = t === this.boss;
    if (isBoss && !t.damageable) {
      this.floater(t.x, t.y - t.r - 10, 'IMMUNE', '#aaa', 14);
      return;
    }
    const counter = p.counterTimer > 0 && !src.reflect;
    if (counter) p.counterTimer = 0;
    const ctx = { counter, staggered: Boolean(t.staggered || (t.fsm && t.fsm.is('stagger'))), bonus: 1 };
    if (move.finisher) ctx.bonus *= this.cfg.DAMAGE.finisherBonus;
    if (move.switchCancel) ctx.bonus *= this.cfg.DAMAGE.switchCancelBonus * this.skills.effect('switchCancel', 'damage');
    let tag = null;
    if (isBoss) {
      const zone = t.hitZone(src.fromX, src.fromY);
      if (zone === 'front' && !t.antlersBroken) ctx.armor = this.cfg.BOSS.frontDamageMult;
      if (zone === 'rear') {
        ctx.weakness = t.phase === 2 ? this.cfg.BOSS.rearWeakness.p2 : this.cfg.BOSS.rearWeakness.p1;
        if (ctx.weakness > 1) tag = 'WEAK!';
      }
      t.zoneHit = zone;
    } else {
      ctx.armor = t.armorFrom(src.fromX, src.fromY);
      if (ctx.armor < 1) tag = 'ARMOR';
    }
    const { amount, crit } = computeDamage(move, weapon.scaling, p.stats, ctx, this.rng, this.cfg.DAMAGE);
    t.hp = Math.max(0, t.hp - amount);
    t.flash = 0.12;
    this.combo.hit();
    this.style.add(counter ? 'counter' : crit ? 'crit' : move.finisher ? 'finisher' : 'hit');
    this.glitch.gain('hit');
    this.hitStop = Math.max(this.hitStop, crit || move.base > 30 ? 0.06 : 0.025);
    this.shake(crit ? 5 : 2, 0.12);
    const ang = angleTo(src.fromX, src.fromY, t.x, t.y);
    this.burst(t.x - Math.cos(ang) * t.r * 0.6, t.y - Math.sin(ang) * t.r * 0.6, crit ? '#ffe066' : '#ffffff', crit ? 12 : 7);
    this.floater(t.x + (this.rng() - 0.5) * 20, t.y - t.r - 8, `${amount}${crit ? '!' : ''}`, counter ? '#ff9f1c' : crit ? '#ffe066' : '#ffffff', crit ? 26 : 18);
    if (tag) this.floater(t.x, t.y - t.r - 34, tag, tag === 'WEAK!' ? '#5dff9d' : '#9aa5b1', 14);
    if (counter) this.floater(t.x, t.y - t.r - 52, 'COUNTER', '#ff9f1c', 16);
    this.events.emit('hit', { target: t, amount, crit });

    if (isBoss) this.bossDamaged(t, move, amount);
    else {
      t.applyPoise(move.poise || 0);
      if (t.hp <= 0) this.killEnemy(t);
    }
  }

  bossDamaged(b, move, amount) {
    if (b.zoneHit === 'front' && !b.antlersBroken) {
      const part = b.parts.antlers;
      part.hp -= amount * (move.partBreak || 1);
      if (part.hp <= 0) {
        part.broken = true;
        this.stats.partBreaks += 1;
        this.flags.antlerBroken = true;
        this.style.add('partBreak');
        this.glitch.gain('partBreak');
        this.floater(b.x, b.y - b.r - 40, 'PART BREAK!', '#ff9f1c', 28);
        this.burst(b.x + Math.cos(b.facing) * b.r, b.y + Math.sin(b.facing) * b.r, '#ffd166', 30);
        this.shake(14, 0.5);
        this.events.emit('partBreak', { part: 'antlers' });
        if (b.hp > 0 && b.fsm.current !== 'phaseShift') b.interrupt('stagger', this.cfg.BOSS.partBreakStagger);
      }
    }
    if (b.hp <= 0) {
      b.interrupt('dead');
      return;
    }
    if (b.phase === 1 && b.hp <= b.maxHp * this.cfg.BOSS.phase2Threshold) {
      this.style.add('phaseBreak');
      b.interrupt('phaseShift');
      return;
    }
    b.applyPoise(move.poise || 0);
  }

  killEnemy(e) {
    e.fsm.change('dead');
    this.stats.kills += 1;
    this.style.add('kill');
    this.burst(e.x, e.y, '#c3ff9e', 22);
    const d = e.cfg.drop;
    if (d && this.rng() < d.chance) this.pickups.push({ x: e.x, y: e.y, item: d.item, t: 0 });
    this.events.emit('enemyKilled', { enemy: e, first: this.stats.kills === 1 });
  }

  onSwitchCancel() {
    this.style.add('switchCancel');
    this.glitch.gain('switchCancel');
    this.floater(this.player.x, this.player.y - 44, 'SWITCH CANCEL', '#c77dff', 16);
    this.events.emit('switchCancel');
    this.useSkill('switchCancel');
  }

  useSkill(id) {
    const evolved = this.skills.use(id);
    if (evolved) this.events.emit('skillEvolved', { from: evolved.name, to: evolved.into, blurb: evolved.blurb });
  }

  activateGlitch() {
    if (this.glitch.activate()) this.events.emit('glitch');
  }

  // ---- secrets & zone ---------------------------------------------------------
  startFall() {
    const p = this.player;
    p.state = 'falling';
    p.fallTimer = 1.1;
    this.events.emit('falling');
  }

  finishFall() {
    const p = this.player;
    const a = this.cfg.WORLD.ledgeArrival;
    p.x = a.x;
    p.y = a.y;
    p.state = 'move';
    p.t = 0;
    if (!this.flags.secretFound) {
      this.flags.secretFound = true;
      this.events.emit('secret');
    }
  }

  updateZone() {
    const W = this.cfg.WORLD;
    const p = this.player;
    if (!p.alive) return;
    if (p.y < W.field.y + 200 && this.checkpoint.y !== W.respawnBeforeArena.y) this.checkpoint = { ...W.respawnBeforeArena };
    if (!this.boss.engaged && this.boss.alive && this.inArena(p.x, p.y, W.arena.engageInset)) {
      this.arenaLocked = true;
      this.bossStart = this.time;
      this.boss.engage();
      this.events.emit('enterArena');
    }
    if (this.inRect(p.x, p.y, W.ledge)) {
      if (!this.flags.chestOpened && dist(p.x, p.y, W.chest.x, W.chest.y) < W.chest.r + p.r) {
        this.flags.chestOpened = true;
        this.giveItem(W.chest.item);
        this.glitch.value = this.glitch.cfg.max;
        this.burst(W.chest.x, W.chest.y, '#ffd700', 30);
      }
      if (dist(p.x, p.y, W.warpStone.x, W.warpStone.y) < W.warpStone.r + p.r) {
        p.x = W.spawn.x;
        p.y = W.spawn.y;
        this.events.emit('warp');
      }
    }
  }

  giveItem(id) {
    this.inventory[id] = (this.inventory[id] || 0) + 1;
    const item = this.cfg.ITEMS[id];
    this.floater(this.player.x, this.player.y - 50, `+1 ${item.name}`, item.color, 15);
    this.events.emit('item', { id, item });
  }

  updatePickups(dt) {
    const p = this.player;
    for (const k of this.pickups) {
      k.t += dt;
      const d = dist(k.x, k.y, p.x, p.y);
      if (k.t > 0.4 && d < 130) {
        const n = normalize(p.x - k.x, p.y - k.y);
        k.x += n.x * 420 * dt;
        k.y += n.y * 420 * dt;
      }
      if (d < p.r + 12 && k.t > 0.3) {
        k.taken = true;
        this.giveItem(k.item);
      }
    }
    this.pickups = this.pickups.filter((k) => !k.taken);
  }

  onBossDefeated() {
    const W = this.cfg.WORLD;
    const b = this.boss;
    this.arenaLocked = false;
    this.stats.bossTime = this.time - (this.bossStart || this.time);
    this.pickups.push({ x: b.x, y: b.y, item: this.cfg.BOSS.rewards.kill, t: 0 });
    if (this.flags.antlerBroken) this.pickups.push({ x: b.x + 30, y: b.y, item: this.cfg.BOSS.rewards.partBreak, t: 0 });
    this.burst(b.x, b.y, '#5dff9d', 60);
    this.shake(20, 1);
    this.flags.bossDefeated = true;
    return W;
  }

  /** Respawn after death; resets the boss fight if it was in progress. */
  respawn() {
    this.hazards = [];
    if (this.boss.alive && this.boss.engaged) {
      this.boss.reset();
      this.arenaLocked = false;
    }
    this.player.reset(this.checkpoint);
    this.style.points = 0;
    this.combo.reset();
    this.slowTimer = 0;
  }

  /** Bodies are solid: push Kai out of the boss and living enemies. */
  separatePlayer() {
    const p = this.player;
    if (!p.alive || p.state === 'falling') return;
    for (const t of this.targets()) {
      const d = dist(p.x, p.y, t.x, t.y);
      const min = p.r + t.r * (t === this.boss ? 0.9 : 0.8);
      if (d < min && d > 0.001) {
        const n = normalize(p.x - t.x, p.y - t.y);
        this.moveCircle(p, n.x * (min - d), n.y * (min - d));
      }
    }
  }

  // ---- fx helpers -------------------------------------------------------------
  floater(x, y, text, color, size = 16) {
    this.floaters.push({ x, y, text, color, size, t: 0, life: 0.9 });
  }

  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const s = 80 + this.rng() * 260;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.3 + this.rng() * 0.4, color, size: 2 + this.rng() * 3 });
    }
  }

  shake(amp, time) {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  screenToWorld(sx, sy) {
    return { x: this.view.x + sx / this.view.zoom, y: this.view.y + sy / this.view.zoom };
  }

  // ---- main step -----------------------------------------------------------------
  /**
   * Advance the simulation by one fixed real-time step.
   * @param {number} dt real seconds
   * @param {import('../core/input.js').Input} input
   */
  step(dt, input) {
    // presentation timers always run in real time
    this.floaters = this.floaters.filter((f) => (f.t += dt) < f.life);
    for (const q of this.particles) {
      q.t += dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.9;
      q.vy *= 0.9;
    }
    this.particles = this.particles.filter((q) => q.t < q.life);
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    if (this.shakeTime === 0) this.shakeAmp = 0;
    this.style.update(dt);
    this.combo.update(dt);
    this.glitch.update(dt);

    if (this.hitStop > 0) {
      this.hitStop -= dt;
      return;
    }
    const slow = this.slowTimer > 0;
    this.slowTimer = Math.max(0, this.slowTimer - dt);
    const worldDt = dt * (slow ? this.cfg.JUST_EVADE.worldTimeScale : 1);
    const playerDt = dt * (slow ? this.cfg.JUST_EVADE.playerTimeScale : 1);
    this.time += worldDt;

    this.player.update(playerDt, input);
    for (const e of this.enemies) if (e.alive) e.update(worldDt);
    if (this.boss.alive) this.boss.update(worldDt);
    else if (!this.flags.bossDefeated) this.onBossDefeated();
    this.separatePlayer();
    for (const h of this.hazards) h.update(worldDt);
    this.resolveHazards();
    this.updatePickups(dt);
    this.updateZone();
    const prevPeak = this.style.peakIndex;
    if (this.style.rankIndex === 6 && prevPeak === 6 && !this.flags.sss) {
      this.flags.sss = true;
      this.events.emit('sss');
    }
  }
}
