# Combat System (Vertical Slice)

> Status: Draft v0.1 (2026-11-02). Implementation: `src/game/` · Tuning: `src/data/config.js`
> · Tests: `tests/unit/`.

## 1. Overview

Real-time action combat built around reading attacks. Kai moves freely, spends stamina on
dodges and attacks, and is rewarded for precision: a dodge started just before a hit is a
**Just Evade** (slow motion, style, Glitch Instinct); a guard raised just before a hit is a
**Parry** (stagger + Counter). Two equipped weapons can be swapped mid-combo (**Switch
Cancel**). Bosses have parts that break and phases that change their moveset.

## 2. Player Fantasy

"I've seen worse." The player should feel like a veteran who reads a fight faster than it
can be shown: dodging *through* a shockwave by a few frames, parrying the one attack that
can be parried, and noticing that the boss's slam reaches further than its telegraph.

## 3. Detailed Rules

- **Movement:** 8-direction, 235 px/s. Guarding slows to 35%.
- **Dodge:** costs 22 stamina; 0.34s; invulnerable 0–0.26s. If an attack first touches Kai
  within the first 0.14s → **Just Evade**: world time ×0.22 and Kai ×0.85 for 0.85s real
  time, +0.55s bonus invulnerability. Later in the i-frames = plain evade (small style).
- **Guard:** hold. First 0.16s = **Parry** window vs **orange** (parryable) attacks: no
  damage, attacker staggered (boss: −60 poise), Counter ready for 1.6s (next hit is a forced
  crit ×1.6). Parried projectiles are **reflected** at 1.5× speed. After the window:
  **Block** (30% damage, 18 stamina; not enough stamina = Guard Break, full damage).
  **Magenta** attacks cannot be blocked or parried.
- **Attacks:** light combo per weapon (4 hits Twin Fangs, 3 Greatsword). Inputs buffer for
  0.22s. During recovery: light → next hit, heavy → **finisher** (+20%), dodge → dodge
  cancel, swap → **Switch Cancel** (swap and immediately continue with the other weapon's
  combo; +10% damage). Combo resets after 0.6s idle.
- **Hits** apply damage, poise damage and (on the boss's front) part damage. Hit-stop
  0.025–0.06s.
- **Style rank** D/C/B/A/S/SS/SSS from style points: each action type earns points,
  repeating the same action earns 30% less each time (memory of 6), points decay faster at
  high ranks, taking a hit halves points and subtracts 80.
- **Combo counter** resets after 2.4s without a hit or when Kai is hit.
- **Glitch Instinct** (0–100): gains from Just Evade 28, Parry 22, reflect 12, part break 25,
  switch cancel 6, any hit 1.4. Full → press E: 6s of **true hitboxes** (cyan wireframes,
  with attack name and countdown) drawn over every telegraph.
- **Telegraph honesty:** each attack has a TRUE shape and a VISUAL shape. Some visuals are
  deliberately smaller (Sentinel Slam, Orrun's Stomp and Charge lane). This is a designed
  "glitchy hitbox", not a bug.
- **Enemies:** Thornling (fast lunge, orange), Ruin Sentinel (front armour ×0.35, slow wide
  slam, orange), Wisp Archer (keeps 220–380px away, bolts reflectable).
- **Boss:** see `unique-bosses.md` §1. Phase 2 at ≤50% HP; antler break removes charges.
- **Skill evolution:** Just Evade ×5 → Phantom Step; Switch Cancel ×8 → Fluid Arsenal;
  Parry ×4 → Mirror Guard.

## 4. Formulas

Outgoing damage (`computeDamage`):

```
amount = base × (1 + Σ stat_k × scaling_k × statScale)
       × (crit ? critMult + TEC × tecCritMult : 1)
       × (counter ? counterMult : 1)
       × weakness × armor × (staggered ? staggerMult : 1) × bonus
critChance = clamp(baseCrit + LUK × lukCrit, 0, 1); counter ⇒ crit
amount = max(1, round(amount))
```
statScale 0.02 · baseCrit 0.05 · lukCrit 0.006 · critMult 1.5 · tecCritMult 0.01 ·
counterMult 1.6 · staggerMult 1.3 · finisher bonus 1.2 · switch-cancel bonus 1.1 (×1.15 evolved).

Example: Twin Fangs hit 1 (base 9; DEX 16×0.7 + AGI 14×0.5 = 18.2 → ×1.364) = 12.

Incoming damage (`incomingDamage`): `max(1, round(base × (1 − min(0.5, VIT × 0.012)) × guardMult))`.
Kai (VIT 10) takes 88% of base.

Part damage: `partHP −= amount × move.partBreak` for front hits while antlers intact.
Poise: `poise −= move.poise` (regen 14/s); ≤0 → stagger 2.2s.

## 5. Edge Cases

- A hit during a dodge's i-frames that is *not* perfect still counts as evaded once per hazard; a long-lived hazard (charge) can still hit after i-frames end, unless it was a Just Evade (bonus i-frames).
- Mercy invulnerability 0.5s after being hit prevents multi-hit stacking from overlapping hazards.
- Boss is immune during intro and phase shift (floater "IMMUNE").
- Breaking antlers during the phase-shift does not re-interrupt it.
- Dying in the boss arena resets the boss (HP, phase, parts) and unlocks the arena; field kills persist.
- Walking cannot cross the cliff edge; only a dodge can (secret).
- Not enough stamina: dodge/attack refused with a "NO STAMINA" floater.

## 6. Dependencies

Input → Player → World (hazards, hit resolution) → Enemy/Boss AI (FSM + coroutines) →
Style / Combo / Glitch / SkillBook → HUD, feed, audio via `EventBus`.

## 7. Tuning Knobs

All in `src/data/config.js`: `PLAYER` (speed, dodge/guard windows, stamina), `JUST_EVADE`,
`WEAPONS` (per-move base, range, arc, windup/active/recovery, lunge, stamina, poise,
partBreak), `DAMAGE`, `STYLE`, `COMBO`, `GLITCH`, `SKILLS`, `ENEMIES`, `BOSS`
(HP, thresholds, attack timings, true vs visual sizes, weights), `WORLD` (layout).

## 8. Acceptance Criteria

- [x] Dodge started ≤0.14s before contact → Just Evade, slow-mo, no damage (`world-combat.test.js`).
- [x] Guard tap vs orange attack → parry, attacker staggered, Counter ready.
- [x] Magenta attacks ignore guard.
- [x] Boss enters phase 2 at ≤50% HP and is immune during the shift.
- [x] Broken antlers remove Charge/Feint Charge from the boss's pool.
- [x] Phase-2 rear hits deal more damage than phase-1 rear hits.
- [x] Boss death → World First event, arena unlocks, reward drops.
- [x] Switch Cancel swaps weapon mid-combo and awards style.
- [x] Cliff dodge leads to the secret ledge; walking does not.
- [x] Boss AI runs 2 simulated minutes, using every phase-2 attack, without errors.
- [x] Screens observed in a real browser: `production/qa/evidence/vertical-slice/`.
