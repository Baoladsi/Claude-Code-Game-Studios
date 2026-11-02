// Integration-style unit tests on the headless World: Just Evade, parry, boss phases, part break, secret.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeInput, makeWorld, run, CONFIG } from './helpers.js';

/** Put the player in the arena next to an awake boss, field enemies far away. */
function arenaWorld() {
  const w = makeWorld(3);
  const a = CONFIG.WORLD.arena;
  w.player.x = a.x;
  w.player.y = a.y + 200;
  w.arenaLocked = true;
  w.boss.engage();
  w.boss.fsm.change('idle');
  return w;
}

test('dodge_started_just_before_hit_triggers_just_evade_slowmo', () => {
  const w = arenaWorld();
  const input = fakeInput();
  const p = w.player;
  w.addHazard({ shape: { type: 'circle', x: p.x, y: p.y, r: 80 }, delay: 0.05, active: 0.2, damage: 30 });
  input.pressedSet.add('dodge');
  run(w, input, 4);
  assert.equal(w.stats.justEvades, 1);
  assert.ok(w.slowTimer > 0);
  assert.equal(p.hp, p.maxHp);
});

test('standing_still_in_a_hazard_takes_damage_and_drops_style', () => {
  const w = arenaWorld();
  const input = fakeInput();
  w.style.points = 500;
  const p = w.player;
  w.addHazard({ shape: { type: 'circle', x: p.x, y: p.y, r: 40 }, delay: 0, active: 0.2, damage: 30 });
  run(w, input, 2);
  assert.ok(p.hp < p.maxHp);
  assert.ok(w.style.points < 250);
});

test('guard_tap_parries_parryable_attack_and_staggers_enemy', () => {
  const w = makeWorld(5);
  const input = fakeInput();
  const e = w.enemies.find((x) => x.type === 'thornling');
  const p = w.player;
  p.x = e.x;
  p.y = e.y + 60;
  e.fsm.change('chase');
  w.addHazard({ owner: e, shape: { type: 'circle', x: p.x, y: p.y, r: 30 }, delay: 0.05, active: 0.2, damage: 12, parryable: true });
  input.heldSet.add('guard');
  run(w, input, 6);
  assert.equal(w.stats.parries, 1);
  assert.equal(e.fsm.current, 'stagger');
  assert.ok(p.counterTimer > 0);
  assert.equal(p.hp, p.maxHp);
});

test('unparryable_attack_ignores_guard', () => {
  const w = arenaWorld();
  const input = fakeInput();
  const p = w.player;
  input.heldSet.add('guard');
  w.addHazard({ shape: { type: 'circle', x: p.x, y: p.y, r: 40 }, delay: 0.03, active: 0.2, damage: 20, parryable: false });
  run(w, input, 5);
  assert.equal(w.stats.parries, 0);
  assert.ok(p.hp < p.maxHp);
});

test('boss_enters_phase_two_at_half_hp_and_becomes_temporarily_immune', () => {
  const w = arenaWorld();
  const b = w.boss;
  b.hp = b.maxHp * 0.5 + 5;
  w.hitTarget(b, { base: 200, poise: 0, partBreak: 0 }, { scaling: {} }, { fromX: b.x, fromY: b.y + 300 });
  assert.equal(b.phase, 2);
  assert.equal(b.fsm.current, 'phaseShift');
  assert.equal(b.damageable, false);
});

test('breaking_antlers_staggers_boss_and_removes_charge_attacks', () => {
  const w = arenaWorld();
  const b = w.boss;
  b.facing = Math.PI / 2; // facing the player (south)
  for (let i = 0; i < 20 && !b.antlersBroken; i++) {
    b.fsm.change('idle');
    w.hitTarget(b, { base: 40, poise: 0, partBreak: 2 }, { scaling: {} }, { fromX: b.x, fromY: b.y + 200 });
  }
  assert.equal(b.antlersBroken, true);
  assert.equal(b.fsm.current, 'stagger');
  for (let i = 0; i < 200; i++) {
    const id = b.pickAttack();
    assert.ok(id !== 'charge' && id !== 'feintCharge', `picked ${id} with broken antlers`);
  }
});

test('boss_rear_hits_deal_weakness_damage_only_in_phase_two', () => {
  const w = arenaWorld();
  const b = w.boss;
  b.facing = Math.PI / 2;
  const hitFromRear = () => {
    const before = b.hp;
    b.fsm.change('idle');
    w.hitTarget(b, { base: 20, poise: 0, partBreak: 0 }, { scaling: {} }, { fromX: b.x, fromY: b.y - 200 });
    return before - b.hp;
  };
  w.rng = () => 0.99; // no random crits
  const p1 = hitFromRear();
  b.phase = 2;
  const p2 = hitFromRear();
  assert.ok(p2 > p1, `phase 2 rear ${p2} should exceed phase 1 rear ${p1}`);
});

test('boss_death_emits_world_first_and_drops_reward', () => {
  const w = arenaWorld();
  const input = fakeInput();
  let defeated = false;
  w.events.on('bossDefeated', () => (defeated = true));
  const b = w.boss;
  b.phase = 2;
  b.hp = 5;
  w.hitTarget(b, { base: 50, poise: 0, partBreak: 0 }, { scaling: {} }, { fromX: b.x, fromY: b.y + 200 });
  run(w, input, 12); // includes hit-stop frames
  assert.equal(defeated, true);
  assert.equal(w.arenaLocked, false);
  assert.ok(w.pickups.some((k) => k.item === CONFIG.BOSS.rewards.kill));
});

test('boss_ai_runs_two_minutes_without_errors', () => {
  const w = arenaWorld();
  const input = fakeInput();
  w.player.hp = 1e9;
  w.player.maxHp = 1e9;
  const seen = new Set();
  for (let i = 0; i < 60 * 120; i++) {
    if (i === 60 * 40) {
      w.boss.hp = w.boss.maxHp * 0.4;
      w.boss.interrupt('phaseShift');
    }
    if (w.boss.fsm.is('attack')) seen.add(w.boss.currentAttack);
    w.player.hp = w.player.maxHp;
    if (w.player.state === 'dead') w.player.state = 'move';
    run(w, input, 1);
  }
  for (const id of ['stomp', 'rootSpikes', 'wispVolley', 'thornRing']) assert.ok(seen.has(id), `never used ${id}: ${[...seen]}`);
});

test('dodging_off_the_cliff_finds_the_secret_ledge', () => {
  const w = makeWorld(9);
  const input = fakeInput();
  let secret = false;
  w.events.on('secret', () => (secret = true));
  const c = CONFIG.WORLD.chasm;
  w.player.x = c.x + c.w + 25;
  w.player.y = c.y + c.h / 2;
  input.heldSet.add('left');
  run(w, input, 30); // walking cannot cross the edge
  assert.ok(w.player.x >= c.x + c.w);
  input.pressedSet.add('dodge');
  run(w, input, 120);
  assert.equal(secret, true);
  assert.ok(w.inRect(w.player.x, w.player.y, CONFIG.WORLD.ledge));
});

test('switch_cancel_swaps_weapon_mid_combo_and_awards_style', () => {
  const w = makeWorld(11);
  const input = fakeInput();
  const p = w.player;
  assert.equal(p.weapon.id, 'twinFangs');
  input.pressedSet.add('light');
  run(w, input, 1);
  const m = p.move;
  run(w, input, Math.ceil((m.windup + m.active) / CONFIG.TIMESTEP) + 1);
  input.pressedSet.add('swap');
  run(w, input, 1);
  assert.equal(p.weapon.id, 'ironwood');
  assert.equal(p.move.switchCancel, true);
  assert.ok(w.style.points > 0);
});
