# Roadmap — Prototype to Full Game

> Draft v0.1 (2026-11-02). Durations assume a small team (2–4 devs + art/audio help);
> solo, roughly double them.

## M0 — Vertical slice ✅ (this PR)

One zone (Mossveil Ruins), movement + combat (dodge/Just Evade, parry/counter, light/heavy,
Switch Cancel, Glitch Instinct, style rank, combo counter), 3 enemy types, Unique Boss
Orrun with 2 phases + part break, simulated feed, one secret, unit tests + browser smoke test.

## M1 — Slice polish & first playtest (2–3 weeks)

- Playtest with 5–10 action-game players; tune windows, boss HP and telegraph honesty from data.
- Gamepad support, input remapping, accessibility (colour-blind telegraph patterns, slow-mo toggle, hold-to-guard alternatives).
- Real art pass for Kai, the three enemies and Orrun; VFX for Just Evade / part break; music stems (ambient + boss with a phase-2 layer).
- Save/load (localStorage) for inventory and skill evolution.
- **Decision D1 — rendering:** stay top-down 2D in the browser, move to **Three.js** for a true third-person camera, or port to **Godot 4**. The simulation (`src/game/`) has no rendering imports, so the gameplay code carries over either way.

## M2 — Core RPG systems (4–6 weeks)

Leveling and stat allocation; inventory/equipment UI; crafting tree; the remaining weapon
families (spear, bow, catalyst, chain-blade); full skill tree with use-based evolution and
branch choices; enemy roster to ~12 types with shared AI building blocks; lock-on camera.

## M3 — Act I content (6–8 weeks)

Mossveil Ruins expanded (3 sub-areas, side quests), Varn-Ithe (sunken city), **Maresong**
(3-phase rhythm boss); NPC system with memory of player choices; Juno / Ledger / Rook//Zero
story beats; between-session real-life vignettes; forum feed driven by a rules table.

## M4 — Act II content (6–8 weeks)

Shimmerwaste and Cirrus Archipelago; **Sekh'ara** and **Halcyon Drift** (moving-arena tech);
PvP duel arena vs Rook//Zero (AI duellist using the player's own move set); hidden
achievements and the cliff-jump chain toward the Unlit Hollow.

## M5 — Act III & endgame (8–10 weeks)

Ironreach Bastion, **MAGISTER-0** (rule-patching boss), **Nyx-Lantern** (mimic boss that
records the player), Lattice Core and **The Last Administrator** with the Open / Keep
ending; post-game boss rush and "world first" leaderboards (local, then optional online).

## M6 — Online flavour & social (4–6 weeks, optional)

Simulated party members with distinct AI playstyles in co-op fights; asynchronous ghost
data (see other players' best boss runs); optional real leaderboards.

## M7 — Polish & release (6–8 weeks)

Performance pass, difficulty modes (assist mode keeps the fantasy: wider windows, not
weaker bosses), localisation, store page, trailer built around a world-first clip.

## Risks

| Risk | Mitigation |
|---|---|
| Combat feels unfair rather than "learnable-unfair" | Glitch Instinct as a teaching tool; every lying telegraph is documented in `combat-system.md`; playtest telemetry on deaths per attack |
| Scope (7 multi-phase bosses) | Shared boss framework (FSM + attack coroutines, data-driven); one boss per milestone |
| Renderer change (D1) late | Decide at end of M1, before M2 content work |
