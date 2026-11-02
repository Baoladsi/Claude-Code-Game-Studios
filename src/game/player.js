/**
 * Player controller for Kai: movement, dodge (with Just Evade timing),
 * guard/parry, light/heavy combos and mid-combo weapon switching.
 */
import { angleDiff, angleTo, dist, normalize, rad } from '../core/math.js';
import { Stamina } from './stamina.js';
import { classifyDodge, classifyGuard } from './evade.js';

export class Player {
  /**
   * @param {import('./world.js').World} world
   * @param {object} cfg PLAYER block
   * @param {Record<string, object>} weapons WEAPONS block
   */
  constructor(world, cfg, weapons) {
    this.world = world;
    this.cfg = cfg;
    this.weapons = cfg.startWeapons.map((id) => ({ id, ...weapons[id] }));
    this.r = cfg.radius;
    this.stats = { ...cfg.stats };
    this.reset(world.cfg.WORLD.spawn);
  }

  /** Full restore at a position (spawn / respawn). */
  reset(pos) {
    this.x = pos.x;
    this.y = pos.y;
    this.hp = this.cfg.maxHp;
    this.maxHp = this.cfg.maxHp;
    this.stamina = new Stamina(this.cfg.stamina);
    this.facing = -Math.PI / 2;
    this.state = 'move';
    this.t = 0;
    this.weaponIndex = this.weaponIndex ?? 0;
    this.comboIndex = 0;
    this.comboResetTimer = 0;
    this.buffer = null;
    this.move = null;
    this.mercy = 0;
    this.bonusIframes = 0;
    this.counterTimer = 0;
    this.knock = { x: 0, y: 0 };
    this.trail = [];
    this.fallTimer = 0;
  }

  get weapon() {
    return this.weapons[this.weaponIndex];
  }

  get alive() {
    return this.state !== 'dead';
  }

  /** Dodge timing config including skill evolution bonuses. */
  get dodgeCfg() {
    const d = this.cfg.dodge;
    return { ...d, perfectWindow: d.perfectWindow * this.world.skills.effect('justEvade', 'perfectWindow') };
  }

  get guardCfg() {
    const g = this.cfg.guard;
    return { ...g, parryWindow: g.parryWindow * this.world.skills.effect('parry', 'parryWindow') };
  }

  /** 'perfect' | 'evade' | null for an incoming hit right now. */
  dodgeStatus() {
    if (this.state !== 'dodge') return null;
    return classifyDodge(this.t, this.dodgeCfg);
  }

  /** 'parry' | 'block' | null for an incoming hit right now. */
  guardStatus() {
    if (this.state !== 'guard') return null;
    return classifyGuard(this.t, this.guardCfg);
  }

  /** Untargetable for reasons other than dodging (post-hit mercy, Just Evade bonus). */
  get shielded() {
    return this.mercy > 0 || this.bonusIframes > 0 || this.state === 'dead' || this.state === 'falling';
  }

  /** @param {number} dt player-time seconds @param {import('../core/input.js').Input} input */
  update(dt, input) {
    this.stamina.update(dt);
    this.mercy = Math.max(0, this.mercy - dt);
    this.bonusIframes = Math.max(0, this.bonusIframes - dt);
    this.counterTimer = Math.max(0, this.counterTimer - dt);
    this.trail = this.trail.filter((g) => (g.t += dt) < 0.25);
    if (this.state === 'dead') return;
    if (this.state === 'falling') {
      this.fallTimer -= dt;
      if (this.fallTimer <= 0) this.world.finishFall();
      return;
    }

    for (const action of ['dodge', 'light', 'heavy', 'swap']) {
      if (input.pressed(action)) this.buffer = { action, t: this.cfg.inputBuffer };
    }
    if (this.buffer && (this.buffer.t -= dt) <= 0) this.buffer = null;
    if (input.pressed('glitch')) this.world.activateGlitch();

    const raw = input.moveVector();
    const mv = normalize(raw.x, raw.y);
    this.mv = mv;
    this.updateAim(input, mv);
    this.t += dt;

    switch (this.state) {
      case 'move':
        this.comboResetTimer -= dt;
        if (this.comboResetTimer <= 0) this.comboIndex = 0;
        if (this.take('dodge')) this.startDodge(mv);
        else if (input.held('guard')) this.setState('guard');
        else if (this.take('light')) this.startAttack('light');
        else if (this.take('heavy')) this.startAttack('heavy');
        else if (this.take('swap')) this.swapWeapon();
        else this.walk(mv, this.cfg.moveSpeed, dt);
        break;
      case 'dodge': {
        const d = this.cfg.dodge;
        const ease = 1 - Math.pow(this.t / d.duration, 2) * 0.6;
        this.world.moveCircle(this, this.dodgeDir.x * d.speed * ease * dt, this.dodgeDir.y * d.speed * ease * dt, { dodging: true });
        this.trail.push({ x: this.x, y: this.y, t: 0 });
        if (this.world.inChasm(this.x, this.y)) return this.world.startFall();
        if (this.t >= d.duration) this.setState('move');
        break;
      }
      case 'guard':
        if (this.take('dodge')) this.startDodge(mv);
        else if (!input.held('guard')) this.setState('move');
        else this.walk(mv, this.cfg.moveSpeed * this.cfg.guardMoveMult, dt);
        break;
      case 'attack':
        this.updateAttack(dt);
        break;
      case 'hurt':
        this.world.moveCircle(this, this.knock.x * dt, this.knock.y * dt);
        this.knock.x *= 0.86;
        this.knock.y *= 0.86;
        if (this.t >= this.cfg.hurt.stun) this.setState('move');
        break;
      default:
        break;
    }
  }

  setState(s) {
    this.state = s;
    this.t = 0;
  }

  /** Consume a buffered action if it matches. */
  take(action) {
    if (this.buffer && this.buffer.action === action) {
      this.buffer = null;
      return true;
    }
    return false;
  }

  walk(mv, speed, dt) {
    if (mv.x || mv.y) this.world.moveCircle(this, mv.x * speed * dt, mv.y * speed * dt);
  }

  updateAim(input, mv) {
    if (this.state === 'attack' || this.state === 'dodge') return;
    if (input.mouse.active) {
      const w = this.world.screenToWorld(input.mouse.x, input.mouse.y);
      this.facing = angleTo(this.x, this.y, w.x, w.y);
    } else if (mv.x || mv.y) {
      this.facing = Math.atan2(mv.y, mv.x);
    }
  }

  /** Soft aim: snap to the nearest enemy roughly in front, for keyboard play. */
  softAim() {
    let best = null;
    let bestD = this.cfg.softAimRange;
    for (const e of this.world.targets()) {
      const d = dist(this.x, this.y, e.x, e.y) - e.r;
      const off = Math.abs(angleDiff(this.facing, angleTo(this.x, this.y, e.x, e.y)));
      if (d < bestD && off < rad(75)) {
        best = e;
        bestD = d;
      }
    }
    return best ? angleTo(this.x, this.y, best.x, best.y) : this.facing;
  }

  startDodge(mv) {
    if (!this.stamina.spend(this.cfg.dodge.cost)) {
      this.world.floater(this.x, this.y - 30, 'NO STAMINA', '#ff6b6b', 14);
      return;
    }
    this.dodgeDir = mv.x || mv.y ? mv : { x: Math.cos(this.facing), y: Math.sin(this.facing) };
    this.setState('dodge');
    this.world.events.emit('dodge');
  }

  swapWeapon() {
    this.weaponIndex = (this.weaponIndex + 1) % this.weapons.length;
    this.comboIndex = 0;
    this.world.events.emit('swap', { weapon: this.weapon });
  }

  /**
   * Begin a light or heavy attack.
   * @param {'light'|'heavy'} kind
   * @param {{switchCancel?:boolean}} [flags]
   */
  startAttack(kind, flags = {}) {
    const w = this.weapon;
    const finisher = kind === 'heavy' && this.comboIndex > 0;
    const idx = Math.min(this.comboIndex, w.light.length - 1);
    const move = kind === 'light' ? w.light[idx] : w.heavy;
    if (!this.stamina.spend(move.stamina)) {
      this.world.floater(this.x, this.y - 30, 'NO STAMINA', '#ff6b6b', 14);
      return;
    }
    this.move = { ...move, kind, finisher, switchCancel: Boolean(flags.switchCancel), comboStep: idx, hitSet: new Set(), struck: false };
    this.attackDir = this.softAim();
    this.facing = this.attackDir;
    if (kind === 'light') this.comboIndex = idx + 1 >= w.light.length ? 0 : idx + 1;
    else this.comboIndex = 0;
    this.setState('attack');
  }

  updateAttack(dt) {
    const m = this.move;
    const total = m.windup + m.active + m.recovery;
    if (this.t < m.windup + m.active) {
      const lungeTime = m.windup + m.active;
      const step = (m.lunge / lungeTime) * dt;
      this.world.moveCircle(this, Math.cos(this.attackDir) * step, Math.sin(this.attackDir) * step);
    }
    if (this.t >= m.windup && this.t < m.windup + m.active) {
      this.world.playerStrike(this, m);
      m.struck = true;
    }
    if (this.t >= m.windup + m.active) {
      // recovery — cancel windows
      if (this.take('dodge')) return this.startDodge(this.mv || { x: 0, y: 0 });
      if (this.take('swap')) {
        this.weaponIndex = (this.weaponIndex + 1) % this.weapons.length;
        this.world.onSwitchCancel();
        return this.startAttack('light', { switchCancel: true });
      }
      if (this.take('light')) return this.startAttack('light');
      if (this.take('heavy')) return this.startAttack('heavy');
    }
    if (this.t >= total) {
      this.comboResetTimer = this.cfg.comboResetTime;
      this.setState('move');
    }
  }

  /** Apply an incoming hit (already reduced by guard if any). */
  takeHit(amount, fromX, fromY) {
    this.hp = Math.max(0, this.hp - amount);
    const n = normalize(this.x - fromX, this.y - fromY);
    this.knock = { x: n.x * this.cfg.hurt.knockback, y: n.y * this.cfg.hurt.knockback };
    this.mercy = this.cfg.hurt.mercy;
    this.comboIndex = 0;
    if (this.hp <= 0) this.setState('dead');
    else this.setState('hurt');
  }
}
