/**
 * Regular enemies of Mossveil Ruins, driven by a shared state machine and
 * per-type attack behaviour from data/config.js ENEMIES:
 *  - Thornling   (lunge)  fast, short telegraph
 *  - Ruin Sentinel (slam) slow, armoured front, its slam reaches FURTHER than it looks
 *  - Wisp Archer (bolt)   keeps distance, parried bolts are reflected
 */
import { StateMachine } from '../core/fsm.js';
import { angleDiff, angleTo, dist, normalize, rad, randRange } from '../core/math.js';

const STATES = {
  idle: {
    enter(e) {
      e.wanderTimer = 0;
    },
    update(e, dt) {
      const p = e.world.player;
      if (p.alive && e.distToPlayer() < e.cfg.aggro && e.world.reachable(p)) return 'chase';
      e.wanderTimer -= dt;
      if (e.wanderTimer <= 0) {
        e.wanderTimer = randRange(e.world.rng, 1.5, 3.5);
        e.wanderTo = { x: e.home.x + randRange(e.world.rng, -90, 90), y: e.home.y + randRange(e.world.rng, -90, 90) };
      }
      e.steer(e.wanderTo.x, e.wanderTo.y, e.cfg.speed * 0.4, dt);
      return null;
    },
  },
  chase: {
    update(e, dt) {
      const p = e.world.player;
      const d = e.distToPlayer();
      e.cooldown -= dt;
      if (!p.alive || !e.world.reachable(p) || dist(e.x, e.y, e.home.x, e.home.y) > e.leash) return 'idle';
      e.facing = angleTo(e.x, e.y, p.x, p.y);
      if (e.cfg.attack.kind === 'bolt') {
        if (d < e.cfg.keepMin) e.steer(e.x - (p.x - e.x), e.y - (p.y - e.y), e.cfg.speed, dt);
        else if (d > e.cfg.keepMax) e.steer(p.x, p.y, e.cfg.speed, dt);
        else e.strafe(dt);
      } else if (d > e.cfg.attackRange * 0.7) {
        e.steer(p.x, p.y, e.cfg.speed, dt);
      }
      if (e.cooldown <= 0 && d < e.cfg.attackRange) return 'attack';
      return null;
    },
  },
  attack: {
    enter(e) {
      e.beginAttack();
    },
    update(e, dt, t) {
      return e.updateAttack(dt, t);
    },
    exit(e) {
      e.cooldown = randRange(e.world.rng, ...e.cfg.cooldown);
    },
  },
  stagger: {
    enter(e) {
      e.world.cancelHazardsOf(e);
    },
    update(e, dt, t) {
      return t >= e.cfg.staggerTime ? 'chase' : null;
    },
  },
  dead: {
    enter(e) {
      e.world.cancelHazardsOf(e);
    },
  },
};

export class Enemy {
  /**
   * @param {import('./world.js').World} world
   * @param {string} type key in ENEMIES
   * @param {number} x
   * @param {number} y
   */
  constructor(world, type, x, y) {
    this.world = world;
    this.type = type;
    this.cfg = world.cfg.ENEMIES[type];
    this.name = this.cfg.name;
    this.x = x;
    this.y = y;
    this.home = { x, y };
    this.r = this.cfg.radius;
    this.hp = this.cfg.hp;
    this.maxHp = this.cfg.hp;
    this.poise = this.cfg.poise;
    this.facing = Math.PI / 2;
    this.cooldown = randRange(world.rng, ...this.cfg.cooldown);
    this.leash = 700;
    this.flash = 0;
    this.bob = world.rng() * 10;
    this.fsm = new StateMachine(this, STATES, 'idle');
  }

  get alive() {
    return !this.fsm.is('dead');
  }

  distToPlayer() {
    return dist(this.x, this.y, this.world.player.x, this.world.player.y);
  }

  steer(tx, ty, speed, dt) {
    const n = normalize(tx - this.x, ty - this.y);
    if (Math.hypot(tx - this.x, ty - this.y) < 4) return;
    let sx = n.x;
    let sy = n.y;
    // separation from other enemies
    for (const o of this.world.enemies) {
      if (o === this || !o.alive) continue;
      const d = dist(this.x, this.y, o.x, o.y);
      if (d < this.r + o.r + 12 && d > 0) {
        sx += ((this.x - o.x) / d) * 0.8;
        sy += ((this.y - o.y) / d) * 0.8;
      }
    }
    const m = normalize(sx, sy);
    this.world.moveCircle(this, m.x * speed * dt, m.y * speed * dt);
  }

  strafe(dt) {
    const a = this.facing + Math.PI / 2;
    const s = Math.sin(this.world.time * 0.9 + this.bob) > 0 ? 1 : -1;
    this.world.moveCircle(this, Math.cos(a) * s * this.cfg.speed * 0.4 * dt, Math.sin(a) * s * this.cfg.speed * 0.4 * dt);
  }

  beginAttack() {
    const a = this.cfg.attack;
    const p = this.world.player;
    this.facing = angleTo(this.x, this.y, p.x, p.y);
    this.attackDir = this.facing;
    this.hazard = null;
    if (a.kind === 'lunge') {
      this.hazard = this.world.addHazard({
        owner: this, follow: this, label: 'Lunge',
        shape: { type: 'circle', x: this.x, y: this.y, r: a.hitRadius },
        visual: { type: 'circle', x: this.x, y: this.y, r: a.visualRadius },
        delay: a.windup, active: a.active, damage: a.damage, parryable: a.parryable,
      });
    } else if (a.kind === 'slam') {
      this.hazard = this.world.addHazard({
        owner: this, label: 'Slam',
        shape: { type: 'arc', x: this.x, y: this.y, r: a.range, dir: this.facing, half: rad(a.arc / 2) },
        visual: { type: 'arc', x: this.x, y: this.y, r: a.visualRange, dir: this.facing, half: rad(a.visualArc / 2) },
        delay: a.windup, active: a.active, damage: a.damage, parryable: a.parryable,
      });
    }
  }

  updateAttack(dt, t) {
    const a = this.cfg.attack;
    if (a.kind === 'lunge' && t >= a.windup && t < a.windup + a.active) {
      this.world.moveCircle(this, Math.cos(this.attackDir) * a.lungeSpeed * dt, Math.sin(this.attackDir) * a.lungeSpeed * dt);
    }
    if (a.kind === 'bolt' && t >= a.windup && !this.fired) {
      this.fired = true;
      const p = this.world.player;
      const ang = angleTo(this.x, this.y, p.x, p.y);
      this.world.addHazard({
        owner: this, projectile: true, label: 'Bolt',
        shape: { type: 'circle', x: this.x + Math.cos(ang) * 20, y: this.y + Math.sin(ang) * 20, r: a.radius },
        vel: { x: Math.cos(ang) * a.speed, y: Math.sin(ang) * a.speed },
        delay: 0, active: a.life, damage: a.damage, parryable: a.parryable,
      });
    }
    const total = a.windup + (a.active || 0) + a.recovery;
    if (t >= total) {
      this.fired = false;
      return 'chase';
    }
    return null;
  }

  /** Called by World when a parry lands on this enemy's attack. */
  onParried() {
    this.fired = false;
    this.fsm.change('stagger');
  }

  /** Damage multiplier for armour given where the hit came from. */
  armorFrom(ax, ay) {
    if (!this.cfg.frontArmor || this.fsm.is('stagger')) return 1;
    const rel = Math.abs(angleDiff(this.facing, angleTo(this.x, this.y, ax, ay)));
    return rel <= rad(this.cfg.frontArc / 2) ? this.cfg.frontArmor : 1;
  }

  /** Reduce poise; stagger when it breaks. */
  applyPoise(amount) {
    this.poise -= amount;
    if (this.poise <= 0 && this.alive) {
      this.poise = this.cfg.poise;
      this.fired = false;
      this.fsm.change('stagger');
    }
  }

  update(dt) {
    this.flash = Math.max(0, this.flash - dt);
    this.fsm.update(dt);
  }
}
