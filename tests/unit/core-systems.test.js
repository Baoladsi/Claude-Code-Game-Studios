// Unit tests: stamina, evade/guard windows, damage formulas, style rank, glitch, skills, hitboxes, FSM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Stamina } from '../../src/game/stamina.js';
import { classifyDodge, classifyGuard } from '../../src/game/evade.js';
import { computeDamage, incomingDamage } from '../../src/game/damage.js';
import { StyleMeter, RANKS } from '../../src/game/style.js';
import { GlitchInstinct } from '../../src/game/glitch.js';
import { SkillBook } from '../../src/game/skills.js';
import { ComboCounter } from '../../src/game/combo.js';
import { overlapsCircle } from '../../src/game/hitbox.js';
import { StateMachine } from '../../src/core/fsm.js';
import { CONFIG } from './helpers.js';

const always = () => 0.99; // never crits by chance
const never = () => 0; // always crits by chance

test('stamina_spend_refuses_when_insufficient', () => {
  const s = new Stamina({ max: 30, regenPerSec: 10, regenDelay: 0.5 });
  assert.equal(s.spend(22), true);
  assert.equal(s.spend(22), false);
  assert.equal(s.value, 8);
});

test('stamina_regen_waits_for_delay_then_caps_at_max', () => {
  const s = new Stamina({ max: 100, regenPerSec: 50, regenDelay: 0.5 });
  s.spend(60);
  s.update(0.4);
  assert.equal(s.value, 40);
  s.update(0.1);
  s.update(0.2);
  assert.equal(s.value, 50);
  s.update(10);
  assert.equal(s.value, 100);
});

test('dodge_classification_perfect_then_evade_then_hit', () => {
  const cfg = CONFIG.PLAYER.dodge;
  assert.equal(classifyDodge(0, cfg), 'perfect');
  assert.equal(classifyDodge(cfg.perfectWindow, cfg), 'perfect');
  assert.equal(classifyDodge(cfg.perfectWindow + 0.01, cfg), 'evade');
  assert.equal(classifyDodge(cfg.iframeEnd + 0.01, cfg), null);
});

test('guard_classification_parry_inside_window_block_after', () => {
  const cfg = CONFIG.PLAYER.guard;
  assert.equal(classifyGuard(0.05, cfg), 'parry');
  assert.equal(classifyGuard(cfg.parryWindow + 0.01, cfg), 'block');
});

test('damage_scales_with_stats_and_counter_forces_crit', () => {
  const move = { base: 10 };
  const scaling = { STR: 1 };
  const t = CONFIG.DAMAGE;
  const plain = computeDamage(move, scaling, { STR: 0 }, {}, always, t);
  assert.deepEqual(plain, { amount: 10, crit: false });
  const strong = computeDamage(move, scaling, { STR: 50 }, {}, always, t);
  assert.equal(strong.amount, 20); // 10 × (1 + 50×1×0.02)
  const counter = computeDamage(move, scaling, { STR: 0 }, { counter: true }, always, t);
  assert.equal(counter.crit, true);
  assert.equal(counter.amount, Math.round(10 * t.critMult * t.counterMult));
});

test('damage_applies_weakness_armor_and_minimum_one', () => {
  const t = CONFIG.DAMAGE;
  const weak = computeDamage({ base: 10 }, {}, {}, { weakness: 1.5 }, always, t);
  assert.equal(weak.amount, 15);
  const armored = computeDamage({ base: 1 }, {}, {}, { armor: 0.1 }, always, t);
  assert.equal(armored.amount, 1);
  const crit = computeDamage({ base: 10 }, {}, { TEC: 0 }, {}, never, t);
  assert.equal(crit.crit, true);
});

test('incoming_damage_reduced_by_vit_and_capped', () => {
  const t = CONFIG.DAMAGE;
  assert.equal(incomingDamage(100, { VIT: 0 }, t), 100);
  assert.equal(incomingDamage(100, { VIT: 10 }, t), 88);
  assert.equal(incomingDamage(100, { VIT: 999 }, t), 50);
  assert.equal(incomingDamage(100, { VIT: 0 }, t, 0.3), 30);
});

test('style_rank_climbs_with_variety_and_drops_on_hit', () => {
  const s = new StyleMeter(CONFIG.STYLE);
  assert.equal(s.rank, 'D');
  for (const a of ['justEvade', 'parry', 'switchCancel', 'partBreak', 'counter', 'finisher']) s.add(a);
  assert.ok(s.rankIndex >= 3, `expected A or better, got ${s.rank}`);
  const before = s.points;
  s.hit();
  assert.ok(s.points < before / 2);
});

test('style_repeating_same_action_has_diminishing_returns', () => {
  const s = new StyleMeter(CONFIG.STYLE);
  const first = s.add('hit');
  const second = s.add('hit');
  assert.ok(second < first);
  assert.equal(RANKS.length, 7);
});

test('glitch_instinct_only_activates_when_full_and_drains', () => {
  const g = new GlitchInstinct(CONFIG.GLITCH);
  assert.equal(g.activate(), false);
  for (let i = 0; i < 4; i++) g.gain('justEvade');
  assert.equal(g.ready, true);
  assert.equal(g.activate(), true);
  g.gain('justEvade'); // ignored while active
  g.update(CONFIG.GLITCH.duration / 2);
  assert.ok(Math.abs(g.ratio - 0.5) < 1e-9);
  g.update(CONFIG.GLITCH.duration);
  assert.equal(g.active, false);
});

test('skill_evolves_after_threshold_uses', () => {
  const book = new SkillBook(CONFIG.SKILLS);
  const n = CONFIG.SKILLS.justEvade.evolvesAt;
  for (let i = 1; i < n; i++) assert.equal(book.use('justEvade'), null);
  assert.equal(book.use('justEvade').into, 'Phantom Step');
  assert.equal(book.effect('justEvade', 'perfectWindow'), CONFIG.SKILLS.justEvade.effect.perfectWindow);
  assert.equal(book.use('justEvade'), null); // evolves once
});

test('combo_counter_resets_after_window', () => {
  const c = new ComboCounter(1);
  c.hit();
  c.hit();
  assert.equal(c.count, 2);
  c.update(1.01);
  assert.equal(c.count, 0);
  assert.equal(c.best, 2);
});

test('hitbox_shapes_overlap_correctly', () => {
  assert.equal(overlapsCircle({ type: 'circle', x: 0, y: 0, r: 10 }, 15, 0, 5), true);
  assert.equal(overlapsCircle({ type: 'circle', x: 0, y: 0, r: 10 }, 16, 0, 5), false);
  const arc = { type: 'arc', x: 0, y: 0, r: 100, dir: 0, half: Math.PI / 4 };
  assert.equal(overlapsCircle(arc, 50, 0, 5), true);
  assert.equal(overlapsCircle(arc, -50, 0, 5), false);
  assert.equal(overlapsCircle({ type: 'capsule', x1: 0, y1: 0, x2: 100, y2: 0, r: 10 }, 50, 14, 5), true);
  assert.equal(overlapsCircle({ type: 'ring', x: 0, y: 0, r: 100, width: 20 }, 0, 0, 5), false);
  assert.equal(overlapsCircle({ type: 'ring', x: 0, y: 0, r: 100, width: 20 }, 95, 0, 5), true);
});

test('fsm_runs_enter_update_exit_and_transitions', () => {
  const log = [];
  const owner = {};
  const fsm = new StateMachine(owner, {
    a: { enter: () => log.push('enter a'), update: (o, dt, t) => (t >= 1 ? 'b' : null), exit: () => log.push('exit a') },
    b: { enter: () => log.push('enter b') },
  }, 'a');
  fsm.update(0.5);
  assert.equal(fsm.current, 'a');
  fsm.update(0.6);
  assert.equal(fsm.current, 'b');
  assert.deepEqual(log, ['enter a', 'exit a', 'enter b']);
  assert.throws(() => fsm.change('nope'));
});
