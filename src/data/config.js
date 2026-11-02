/**
 * ALL gameplay tuning for the vertical slice lives here (data-driven, no magic
 * numbers in systems). Units: pixels, seconds, degrees for arcs.
 * Rationale for each value: design/gdd/combat-system.md §Tuning Knobs.
 */

export const TIMESTEP = 1 / 60;

export const BINDINGS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  dodge: ['Space'],
  light: ['KeyJ', 'Mouse0'],
  heavy: ['KeyK', 'Mouse2'],
  guard: ['KeyL', 'ShiftLeft', 'ShiftRight'],
  swap: ['KeyQ'],
  glitch: ['KeyE'],
  pause: ['Escape', 'KeyP'],
  confirm: ['Enter', 'NumpadEnter'],
  restart: ['KeyR'],
};

export const PLAYER = {
  name: 'Kai',
  radius: 16,
  maxHp: 120,
  moveSpeed: 235,
  guardMoveMult: 0.35,
  stats: { STR: 12, AGI: 14, DEX: 16, VIT: 10, LUK: 8, TEC: 20 },
  stamina: { max: 100, regenPerSec: 34, regenDelay: 0.45 },
  dodge: { cost: 22, duration: 0.34, speed: 640, iframeStart: 0.0, iframeEnd: 0.26, perfectWindow: 0.14 },
  guard: { parryWindow: 0.16, blockDamageMult: 0.3, blockStaminaCost: 18, counterWindow: 1.6 },
  hurt: { stun: 0.28, knockback: 280, mercy: 0.5 },
  comboResetTime: 0.6,
  inputBuffer: 0.22,
  softAimRange: 240,
  startWeapons: ['twinFangs', 'ironwood'],
};

/** Just Evade: what a perfect dodge does to time. Durations are real seconds. */
export const JUST_EVADE = { worldTimeScale: 0.22, playerTimeScale: 0.85, duration: 0.85, bonusIframes: 0.55 };

export const WEAPONS = {
  twinFangs: {
    name: 'Twin Fangs',
    type: 'Dual short swords',
    color: '#7df9ff',
    scaling: { DEX: 0.7, AGI: 0.5 },
    light: [
      { base: 9, range: 66, arc: 110, windup: 0.05, active: 0.07, recovery: 0.14, lunge: 70, stamina: 4, poise: 4, partBreak: 0.6 },
      { base: 9, range: 66, arc: 110, windup: 0.05, active: 0.07, recovery: 0.14, lunge: 70, stamina: 4, poise: 4, partBreak: 0.6 },
      { base: 11, range: 70, arc: 130, windup: 0.06, active: 0.08, recovery: 0.16, lunge: 80, stamina: 5, poise: 6, partBreak: 0.7 },
      { base: 17, range: 78, arc: 220, windup: 0.08, active: 0.1, recovery: 0.26, lunge: 60, stamina: 7, poise: 10, partBreak: 0.8, name: 'Fang Whirl' },
    ],
    heavy: { base: 27, range: 86, arc: 70, windup: 0.16, active: 0.1, recovery: 0.3, lunge: 230, stamina: 16, poise: 18, partBreak: 1.0, name: 'Piercing Rush' },
  },
  ironwood: {
    name: 'Ironwood Greatsword',
    type: 'Greatsword',
    color: '#ffcf5c',
    scaling: { STR: 0.9, TEC: 0.3 },
    light: [
      { base: 20, range: 94, arc: 140, windup: 0.16, active: 0.1, recovery: 0.28, lunge: 40, stamina: 10, poise: 20, partBreak: 1.6 },
      { base: 24, range: 94, arc: 140, windup: 0.15, active: 0.1, recovery: 0.3, lunge: 40, stamina: 11, poise: 22, partBreak: 1.6 },
      { base: 34, range: 104, arc: 220, windup: 0.2, active: 0.12, recovery: 0.4, lunge: 50, stamina: 14, poise: 34, partBreak: 2.0, name: 'Ironwood Cyclone' },
    ],
    heavy: { base: 54, range: 108, arc: 90, windup: 0.4, active: 0.12, recovery: 0.45, lunge: 50, stamina: 28, poise: 48, partBreak: 2.6, name: 'Sundering Drop' },
  },
};

export const DAMAGE = {
  statScale: 0.02,
  baseCrit: 0.05,
  lukCrit: 0.006,
  critMult: 1.5,
  tecCritMult: 0.01,
  counterMult: 1.6,
  staggerMult: 1.3,
  vitReduction: 0.012,
  maxReduction: 0.5,
  switchCancelBonus: 1.1,
  finisherBonus: 1.2,
};

export const STYLE = {
  thresholds: [0, 100, 250, 450, 700, 1000, 1400],
  decayPerRank: [4, 10, 18, 26, 38, 55, 80],
  gains: { hit: 12, crit: 18, finisher: 30, justEvade: 95, evade: 15, parry: 85, reflect: 70, switchCancel: 45, counter: 60, partBreak: 160, kill: 40, phaseBreak: 120 },
  repeatFalloff: 0.7,
  memory: 6,
  hitKeep: 0.5,
  hitPenalty: 80,
  maxPoints: 1700,
};

export const COMBO = { window: 2.4 };

export const GLITCH = {
  max: 100,
  duration: 6,
  gains: { justEvade: 28, parry: 22, reflect: 12, hit: 1.4, switchCancel: 6, partBreak: 25 },
};

export const SKILLS = {
  justEvade: { name: 'Just Evade', evolvesAt: 5, into: 'Phantom Step', effect: { perfectWindow: 1.4 }, blurb: 'perfect-dodge window +40%' },
  switchCancel: { name: 'Switch Cancel', evolvesAt: 8, into: 'Fluid Arsenal', effect: { damage: 1.15 }, blurb: 'switch-cancel hits +15% damage' },
  parry: { name: 'Parry', evolvesAt: 4, into: 'Mirror Guard', effect: { parryWindow: 1.3 }, blurb: 'parry window +30%' },
};

export const ENEMIES = {
  thornling: {
    name: 'Thornling',
    hp: 70,
    radius: 15,
    speed: 150,
    aggro: 380,
    attackRange: 125,
    cooldown: [0.8, 1.6],
    poise: 20,
    staggerTime: 0.9,
    attack: { kind: 'lunge', windup: 0.45, active: 0.22, recovery: 0.55, damage: 12, hitRadius: 22, visualRadius: 18, lungeSpeed: 520, parryable: true },
    drop: { item: 'mossFang', chance: 0.75 },
  },
  sentinel: {
    name: 'Ruin Sentinel',
    hp: 190,
    radius: 26,
    speed: 72,
    aggro: 340,
    attackRange: 125,
    cooldown: [1.2, 2.0],
    poise: 60,
    staggerTime: 1.4,
    frontArmor: 0.35,
    frontArc: 120,
    attack: { kind: 'slam', windup: 0.9, active: 0.12, recovery: 0.9, damage: 26, range: 142, arc: 130, visualRange: 118, visualArc: 96, parryable: true },
    drop: { item: 'ruinShard', chance: 1 },
  },
  wispArcher: {
    name: 'Wisp Archer',
    hp: 50,
    radius: 14,
    speed: 115,
    aggro: 520,
    keepMin: 220,
    keepMax: 380,
    attackRange: 470,
    cooldown: [1.4, 2.4],
    poise: 10,
    staggerTime: 0.8,
    attack: { kind: 'bolt', windup: 0.6, recovery: 0.45, damage: 11, speed: 360, radius: 9, life: 2.4, parryable: true },
    drop: { item: 'wispEmber', chance: 0.8 },
  },
};

export const BOSS = {
  id: 'orrun',
  name: 'Orrun, the Antlered Warden',
  hp: 1600,
  radius: 54,
  speed: 95,
  phase2Threshold: 0.5,
  phase2SpeedMult: 1.3,
  poise: 150,
  poiseRegen: 14,
  staggerTime: 2.2,
  partBreakStagger: 2.8,
  phaseShiftTime: 2.4,
  introTime: 2.2,
  contactDamage: 0,
  parts: { antlers: { name: 'Antlers', hp: 260, frontArc: 140 } },
  frontDamageMult: 0.85,
  rearWeakness: { arc: 120, p1: 1.0, p2: 1.5 },
  idleTime: { p1: [0.7, 1.2], p2: [0.35, 0.7] },
  attacks: {
    charge: { windup: 0.85, speed: 900, length: 760, width: 62, visualWidth: 46, damage: 28, recovery: 0.7, wallStun: 1.8 },
    feintCharge: { pause: 0.45 },
    trample: { windup: 0.5, speed: 560, length: 320, width: 58, visualWidth: 58, damage: 20, recovery: 0.6 },
    stomp: { windup: 0.6, radius: 182, visualRadius: 150, damage: 22, active: 0.12, recovery: 0.6 },
    rootSpikes: { count: 3, countP2: 5, interval: 0.42, delay: 0.75, radius: 64, damage: 18, active: 0.25, recovery: 0.5 },
    wispVolley: { windup: 0.7, count: 7, spread: 70, speed: 330, radius: 11, damage: 14, life: 3, recovery: 0.6 },
    thornRing: { windup: 0.7, startRadius: 60, endRadius: 660, duration: 1.4, width: 34, damage: 24, recovery: 0.4 },
  },
  weights: {
    p1: { charge: 3, stomp: 2, rootSpikes: 3 },
    p2: { charge: 2, feintCharge: 2, stomp: 1, rootSpikes: 2, wispVolley: 3, thornRing: 2 },
  },
  rewards: { kill: 'wardensAntler', partBreak: 'verdantCore' },
};

export const ITEMS = {
  mossFang: { name: 'Mossy Fang', color: '#9be36b' },
  ruinShard: { name: 'Ruin Shard', color: '#c7b8a1' },
  wispEmber: { name: 'Wisp Ember', color: '#78d8ff' },
  wardensAntler: { name: "Warden's Antler", color: '#ffd166' },
  verdantCore: { name: 'Verdant Core', color: '#5dff9d' },
  gildedTurnip: { name: 'Gilded Turnip Helm (cosmetic)', color: '#ffd700' },
};

/** Mossveil Ruins — the vertical-slice zone layout. */
export const WORLD = {
  name: 'Mossveil Ruins',
  width: 2600,
  height: 2700,
  spawn: { x: 1300, y: 2500 },
  respawnBeforeArena: { x: 1300, y: 1440 },
  field: { x: 240, y: 1330, w: 2320, h: 1320 },
  corridor: { x: 1220, y: 1240, w: 160, h: 110 },
  arena: { x: 1300, y: 720, r: 560, engageInset: 60 },
  chasm: { x: 60, y: 1750, w: 180, h: 300 },
  ledge: { x: 40, y: 2290, w: 190, h: 330 },
  ledgeArrival: { x: 135, y: 2440 },
  warpStone: { x: 135, y: 2340, r: 22 },
  chest: { x: 135, y: 2560, r: 20, item: 'gildedTurnip' },
  sign: { x: 300, y: 1900 },
  pillars: [
    [520, 1500, 34], [760, 1720, 30], [430, 2050, 38], [700, 2380, 32], [1010, 2240, 28],
    [1600, 2300, 34], [1880, 2420, 30], [2200, 2200, 36], [2350, 1700, 32], [2050, 1480, 30],
    [1550, 1660, 26], [1060, 1600, 30], [1920, 1900, 28], [1250, 2000, 24],
    // arena pillars — a charging boss that hits one is stunned
    [1300 - 340, 720 - 120, 40], [1300 + 340, 720 - 120, 40], [1300 - 220, 720 + 300, 40], [1300 + 220, 720 + 300, 40],
  ],
  enemies: [
    ['thornling', 900, 2150], ['thornling', 1720, 2170], ['thornling', 1320, 1820], ['thornling', 2250, 1950],
    ['sentinel', 820, 1580], ['sentinel', 1800, 1560],
    ['wispArcher', 1120, 1480], ['wispArcher', 1560, 1950], ['wispArcher', 2150, 2050], ['wispArcher', 600, 1850],
  ],
  bossSpawn: { x: 1300, y: 560 },
};
