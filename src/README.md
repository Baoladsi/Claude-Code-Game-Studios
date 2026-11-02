# Aetherfall Online — Vertical Slice (browser)

Original action RPG inspired by "game-inside-a-game" anime. HTML5 Canvas + vanilla
JavaScript (ES modules), **no dependencies, no build step**.

## Run it

```bash
# from the repository root (Node 18+)
npm start            # → http://localhost:8080
```
Any static server works too (`python3 -m http.server -d src 8080`). Opening `index.html`
straight from disk does **not** work: browsers block ES modules on `file://`.

Deep links for testing: `?scene=arena` (start beside the boss arena), `?scene=ledge`
(next to the cliff secret), `?autostart=1` (skip the title), `?seed=42`.

## Controls

| Action | Keys |
|---|---|
| Move | WASD / arrows |
| Dodge (time it for **Just Evade**) | Space |
| Light / Heavy attack | J / K, or left / right mouse |
| Guard (tap just before a hit = **Parry**) | Shift or L |
| Swap weapon (during an attack's recovery = **Switch Cancel**) | Q |
| Glitch Instinct (when full) | E |
| Pause | Esc / P |

Orange telegraphs can be parried; magenta ones must be dodged. Mouse aims; keyboard-only
play soft-locks onto the nearest enemy in front of you.

## What's in the slice

- **Zone:** Mossveil Ruins — field with ruins, a boss sanctum and a cliff ("DO NOT JUMP").
- **Enemies:** Thornling (lunge), Ruin Sentinel (armoured front, slam reaches further than it looks), Wisp Archer (ranged; parry to reflect).
- **Unique Boss:** Orrun, the Antlered Warden — 2 phases, breakable antlers, pillar crash stun, feint charge, rear weak point in phase 2.
- **Systems:** stamina, Just Evade slow-mo, parry/counter, combos + finishers, Switch Cancel, damage numbers, combo counter, style rank D→SSS, Glitch Instinct (true hitboxes), skills that evolve by use, loot pickups, simulated forum/rival feed, world-first announcement, real-life vignettes.

## Folder structure

```
src/
  index.html, styles.css, main.js   page, holographic HUD styles, entry point
  data/config.js                    ALL gameplay tuning (data-driven)
  data/feed.js                      forum / rival / system text, vignettes
  core/                             math, seeded rng, event bus, input, generic FSM
  game/
    world.js      simulation step, collision, hazard resolution, damage, zone logic
    player.js     player controller (move, dodge, guard/parry, combos, switch cancel)
    enemy.js      regular enemy AI (state machine) for the 3 enemy types
    boss.js       Unique Boss AI: state machine + attack coroutines, phases, parts
    hazard.js     telegraph + true hitbox objects
    hitbox.js     circle / arc / capsule / ring overlap tests
    stamina.js, damage.js, evade.js, style.js, combo.js, glitch.js, skills.js
    game.js       loop (fixed 60 Hz), screens, event → HUD/feed/audio wiring
  render/renderer.js, render/hud.js   canvas drawing, DOM HUD
  audio/sfx.js                       synthesized sound effects (Web Audio)
tests/unit/                          node:test unit tests (npm test)
tests/integration/browser-smoke.mjs  Playwright smoke test + screenshots (npm run smoke)
tools/serve.mjs                      zero-dependency static server
```

## Tests

```bash
npm test            # 25 unit tests: formulas, timing windows, style, boss phases, part break, secret
npm run smoke       # needs Playwright: plays through title → field → boss → world first, saves screenshots
```

Design docs: `design/gdd/` (start with `game-concept.md`). Roadmap: `production/roadmap.md`.
