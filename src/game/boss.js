/**
 * Unique Boss #1 — Orrun, the Antlered Warden.
 *
 * Boss AI = a state machine (dormant → intro → idle ⇄ attack, plus stagger,
 * phaseShift, dead) whose `attack` state runs one attack *coroutine* at a
 * time. Each attack is a generator that yields either a number of seconds to
 * wait or a function `(dt) => done` to run every step until it returns true.
 * Interrupts (stagger, part break, phase shift) cancel the coroutine and any
 * pending telegraphs.
 *
 * Phase 1: Antler Charge, Stomp, Root Spikes, Antler Hook.
 * Phase 2 (≤50% HP): faster; adds Feint Charge, Wisp Volley, Thorn Ring;
 * the Verdant Core on its back becomes a weak point.
 * Breaking the antlers removes the charges (replaced by a short Trample).
 */
import { StateMachine } from '../core/fsm.js';
import { angleDiff, angleTo, dist, rad, randRange } from '../core/math.js';

const HOOK = { windup: 0.5, range: 150, arc: 120, damage: 18, active: 0.12, recovery: 0.5 };

const STATES = {
  dormant: {},
  intro: {
    enter(b) {
      b.pose = 'roar';
      b.world.shake(10, 0.8);
      b.world.events.emit('bossIntro', { boss: b });
    },
    update(b, dt, t) {
      return t >= b.cfg.introTime ? 'idle' : null;
    },
  },
  idle: {
    enter(b) {
      b.pose = 'idle';
      b.idleTimer = randRange(b.world.rng, ...b.cfg.idleTime[b.phase === 2 ? 'p2' : 'p1']);
    },
    update(b, dt) {
      const p = b.world.player;
      b.turnToward(p.x, p.y, dt, 3);
      const d = dist(b.x, b.y, p.x, p.y);
      if (d > 240) b.world.moveCircle(b, Math.cos(b.facing) * b.cfg.speed * b.speedMult * dt, Math.sin(b.facing) * b.cfg.speed * b.speedMult * dt);
      b.idleTimer -= dt;
      return b.idleTimer <= 0 && p.alive ? 'attack' : null;
    },
  },
  attack: {
    enter(b) {
      const id = b.pickAttack();
      b.currentAttack = id;
      b.history.push(id);
      if (b.history.length > 3) b.history.shift();
      b.run(b.attackRoutine(id));
    },
    update(b, dt) {
      b.step(dt);
      return b.co ? null : 'idle';
    },
    exit(b) {
      b.stop();
    },
  },
  stagger: {
    enter(b, duration) {
      b.pose = 'stagger';
      b.staggerFor = duration ?? b.cfg.staggerTime;
      b.staggered = true;
      b.world.events.emit('bossStagger', { boss: b });
    },
    update(b, dt, t) {
      return t >= b.staggerFor ? 'idle' : null;
    },
    exit(b) {
      b.staggered = false;
      b.poise = b.cfg.poise;
    },
  },
  phaseShift: {
    enter(b) {
      b.phase = 2;
      b.pose = 'roar';
      b.invulnerable = true;
      b.world.shake(16, 1.2);
      b.world.events.emit('bossPhase2', { boss: b });
      // shed-bark shockwave: dodge through it
      b.world.addHazard({
        owner: b, label: 'Bark Burst',
        shape: { type: 'ring', x: b.x, y: b.y, r: 60, width: 30 },
        grow: 520, delay: 0.6, active: 1.1, damage: 14, parryable: false,
      });
    },
    update(b, dt, t) {
      return t >= b.cfg.phaseShiftTime ? 'idle' : null;
    },
    exit(b) {
      b.invulnerable = false;
    },
  },
  dead: {
    enter(b) {
      b.pose = 'dead';
      b.world.cancelHazardsOf(b);
      b.world.events.emit('bossDefeated', { boss: b });
    },
  },
};

export class UniqueBoss {
  /** @param {import('./world.js').World} world @param {object} cfg BOSS block */
  constructor(world, cfg) {
    this.world = world;
    this.cfg = cfg;
    this.name = cfg.name;
    this.r = cfg.radius;
    this.reset();
  }

  /** Restore to the pre-fight state (used on player death). */
  reset() {
    const s = this.world.cfg.WORLD.bossSpawn;
    this.x = s.x;
    this.y = s.y;
    this.hp = this.cfg.hp;
    this.maxHp = this.cfg.hp;
    this.phase = 1;
    this.poise = this.cfg.poise;
    this.parts = { antlers: { ...this.cfg.parts.antlers, hp: this.cfg.parts.antlers.hp, max: this.cfg.parts.antlers.hp, broken: false } };
    this.facing = Math.PI / 2;
    this.pose = 'idle';
    this.flash = 0;
    this.history = [];
    this.co = null;
    this.wait = 0;
    this.waitFn = null;
    this.invulnerable = false;
    this.staggered = false;
    this.fsm = new StateMachine(this, STATES, 'dormant');
  }

  get alive() {
    return !this.fsm.is('dead');
  }

  get engaged() {
    return !this.fsm.is('dormant');
  }

  get speedMult() {
    return this.phase === 2 ? this.cfg.phase2SpeedMult : 1;
  }

  get antlersBroken() {
    return this.parts.antlers.broken;
  }

  /** Can the boss take damage right now? */
  get damageable() {
    return !this.invulnerable && (this.fsm.is('idle') || this.fsm.is('attack') || this.fsm.is('stagger'));
  }

  engage() {
    if (this.fsm.is('dormant')) this.fsm.change('intro');
  }

  turnToward(x, y, dt, rate) {
    const d = angleDiff(this.facing, angleTo(this.x, this.y, x, y));
    const maxTurn = rate * dt * this.speedMult;
    this.facing += Math.max(-maxTurn, Math.min(maxTurn, d));
  }

  // ---- coroutine runner -------------------------------------------------
  run(gen) {
    this.co = gen;
    this.wait = 0;
    this.waitFn = null;
    this.advance();
  }

  step(dt) {
    if (!this.co) return;
    if (this.waitFn) {
      if (this.waitFn(dt)) {
        this.waitFn = null;
        this.advance();
      }
      return;
    }
    this.wait -= dt;
    if (this.wait <= 0) this.advance();
  }

  advance() {
    const { value, done } = this.co.next();
    if (done) {
      this.co = null;
      return;
    }
    if (typeof value === 'function') this.waitFn = value;
    else this.wait = value;
  }

  stop() {
    if (this.co) this.co.return();
    this.co = null;
    this.waitFn = null;
  }

  /** Cancel whatever the boss is doing and enter `state`. */
  interrupt(state, data) {
    this.stop();
    this.world.cancelHazardsOf(this);
    this.fsm.change(state, data);
  }

  // ---- attack selection -------------------------------------------------
  /** Weighted pick, adjusted for distance, broken parts and repetition. */
  pickAttack() {
    const p = this.world.player;
    const d = dist(this.x, this.y, p.x, p.y);
    const base = { ...this.cfg.weights[this.phase === 2 ? 'p2' : 'p1'] };
    base.hook = d < 220 ? 4 : 0;
    if (base.stomp) base.stomp *= d < 230 ? 2 : 0.4;
    if (this.antlersBroken) {
      base.trample = (base.charge || 0) + (base.feintCharge || 0);
      delete base.charge;
      delete base.feintCharge;
    }
    const last = this.history[this.history.length - 1];
    if (last && base[last]) base[last] *= 0.3;
    const total = Object.values(base).reduce((a, b) => a + b, 0);
    let roll = this.world.rng() * total;
    for (const [id, w] of Object.entries(base)) {
      roll -= w;
      if (roll <= 0) return id;
    }
    return Object.keys(base)[0];
  }

  attackRoutine(id) {
    switch (id) {
      case 'charge': return this.charge(this.cfg.attacks.charge, false);
      case 'feintCharge': return this.charge(this.cfg.attacks.charge, true);
      case 'trample': return this.charge(this.cfg.attacks.trample, false);
      case 'stomp': return this.stomp();
      case 'rootSpikes': return this.rootSpikes();
      case 'wispVolley': return this.wispVolley();
      case 'thornRing': return this.thornRing();
      case 'hook': return this.hook();
      default: throw new Error(`Unknown boss attack ${id}`);
    }
  }

  // ---- attacks (generators) ----------------------------------------------
  *charge(c, feint) {
    const w = this.world;
    const lane = (len) => {
      const ex = this.x + Math.cos(this.facing) * len;
      const ey = this.y + Math.sin(this.facing) * len;
      return [
        { type: 'capsule', x1: this.x, y1: this.y, x2: ex, y2: ey, r: c.width },
        { type: 'capsule', x1: this.x, y1: this.y, x2: ex, y2: ey, r: c.visualWidth },
      ];
    };
    const p = w.player;
    this.facing = angleTo(this.x, this.y, p.x, p.y);
    this.pose = 'windup';
    const windup = c.windup / this.speedMult;
    let [shape, visual] = lane(c.length);
    let tele = w.addHazard({ owner: this, telegraphOnly: true, shape, visual, delay: windup, active: 0, label: feint ? 'Charge?' : 'Antler Charge' });
    if (feint) {
      yield windup * 0.75;
      tele.cancelled = true;
      this.pose = 'feint';
      w.events.emit('bossFeint');
      yield this.cfg.attacks.feintCharge.pause;
      // the trick: it re-aims at where you dodged to, with a short re-telegraph
      this.facing = angleTo(this.x, this.y, p.x, p.y);
      [shape, visual] = lane(c.length);
      tele = w.addHazard({ owner: this, telegraphOnly: true, shape, visual, delay: 0.32, active: 0, label: 'Feint Charge' });
      yield 0.32;
    } else {
      yield windup;
    }
    this.pose = 'charge';
    const hit = w.addHazard({ owner: this, follow: this, label: 'Charge', shape: { type: 'circle', x: this.x, y: this.y, r: this.r + 8 }, delay: 0, active: 99, damage: c.damage, parryable: false });
    let traveled = 0;
    let wall = false;
    const speed = c.speed * this.speedMult;
    yield (dt) => {
      const stepLen = speed * dt;
      const res = w.moveCircle(this, Math.cos(this.facing) * stepLen, Math.sin(this.facing) * stepLen);
      traveled += stepLen;
      if (res.pillar) {
        wall = true;
        return true;
      }
      return traveled >= c.length || res.blocked;
    };
    hit.spent = true;
    if (wall && c.wallStun) {
      w.shake(14, 0.5);
      w.events.emit('bossWallStun', { boss: this });
      this.pose = 'stagger';
      this.staggered = true;
      yield c.wallStun;
      this.staggered = false;
    }
    this.pose = 'recover';
    yield c.recovery;
  }

  *stomp() {
    const c = this.cfg.attacks.stomp;
    const w = this.world;
    this.pose = 'rear';
    const windup = c.windup / this.speedMult;
    w.addHazard({
      owner: this, label: 'Stomp',
      shape: { type: 'circle', x: this.x, y: this.y, r: c.radius },
      visual: { type: 'circle', x: this.x, y: this.y, r: c.visualRadius },
      delay: windup, active: c.active, damage: c.damage, parryable: false,
    });
    yield windup;
    w.shake(12, 0.35);
    this.pose = 'recover';
    yield c.active + c.recovery;
  }

  *rootSpikes() {
    const c = this.cfg.attacks.rootSpikes;
    const w = this.world;
    const n = this.phase === 2 ? c.countP2 : c.count;
    this.pose = 'channel';
    for (let i = 0; i < n; i++) {
      const p = w.player;
      w.addHazard({ owner: this, label: 'Root Spike', shape: { type: 'circle', x: p.x, y: p.y, r: c.radius }, delay: c.delay, active: c.active, damage: c.damage, parryable: false });
      yield c.interval / this.speedMult;
    }
    yield c.delay;
    this.pose = 'recover';
    yield c.recovery;
  }

  *wispVolley() {
    const c = this.cfg.attacks.wispVolley;
    const w = this.world;
    this.pose = 'channel';
    yield c.windup / this.speedMult;
    const p = w.player;
    const base = angleTo(this.x, this.y, p.x, p.y);
    const spread = rad(c.spread);
    for (let i = 0; i < c.count; i++) {
      const a = base - spread / 2 + (spread * i) / (c.count - 1);
      w.addHazard({
        owner: this, projectile: true, label: 'Wisp',
        shape: { type: 'circle', x: this.x + Math.cos(a) * this.r, y: this.y + Math.sin(a) * this.r, r: c.radius },
        vel: { x: Math.cos(a) * c.speed, y: Math.sin(a) * c.speed },
        delay: 0, active: c.life, damage: c.damage, parryable: true, color: '#7dffb0',
      });
    }
    this.pose = 'recover';
    yield c.recovery;
  }

  *thornRing() {
    const c = this.cfg.attacks.thornRing;
    const w = this.world;
    this.pose = 'rear';
    const windup = c.windup / this.speedMult;
    w.addHazard({ owner: this, telegraphOnly: true, label: 'Thorn Ring', shape: { type: 'circle', x: this.x, y: this.y, r: this.r + 30 }, delay: windup, active: 0 });
    yield windup;
    w.shake(8, 0.3);
    w.addHazard({
      owner: this, label: 'Thorn Ring',
      shape: { type: 'ring', x: this.x, y: this.y, r: c.startRadius, width: c.width },
      grow: (c.endRadius - c.startRadius) / c.duration, delay: 0, active: c.duration, damage: c.damage, parryable: false,
    });
    yield c.duration * 0.5;
    this.pose = 'recover';
    yield c.recovery;
  }

  *hook() {
    const w = this.world;
    const p = w.player;
    this.facing = angleTo(this.x, this.y, p.x, p.y);
    this.pose = 'windup';
    const windup = HOOK.windup / this.speedMult;
    w.addHazard({
      owner: this, label: this.antlersBroken ? 'Hoof Kick' : 'Antler Hook',
      shape: { type: 'arc', x: this.x, y: this.y, r: HOOK.range, dir: this.facing, half: rad(HOOK.arc / 2) },
      delay: windup, active: HOOK.active, damage: HOOK.damage, parryable: true,
    });
    yield windup + HOOK.active;
    this.pose = 'recover';
    yield HOOK.recovery;
  }

  // ---- reactions --------------------------------------------------------
  /** A parry landed on one of the boss's attacks. */
  onParried() {
    this.applyPoise(60);
  }

  applyPoise(amount) {
    if (this.staggered || !this.damageable) return;
    this.poise -= amount;
    if (this.poise <= 0) this.interrupt('stagger', this.cfg.staggerTime);
  }

  /** Where on the boss did a hit from (ax, ay) land? */
  hitZone(ax, ay) {
    const rel = Math.abs(angleDiff(this.facing, angleTo(this.x, this.y, ax, ay)));
    if (rel <= rad(this.parts.antlers.frontArc / 2)) return 'front';
    if (rel >= Math.PI - rad(this.cfg.rearWeakness.arc / 2)) return 'rear';
    return 'side';
  }

  update(dt) {
    this.flash = Math.max(0, this.flash - dt);
    if (this.alive && this.engaged) this.poise = Math.min(this.cfg.poise, this.poise + this.cfg.poiseRegen * dt);
    this.fsm.update(dt);
  }
}
