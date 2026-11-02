# Aetherfall Online — One-Page Game Design Summary

> Status: **Draft v0.1** (2026-11-02) · Vertical slice playable in `src/` · Original IP.
> Inspired by the *feel* of "game-inside-a-game" anime (full-dive VR MMO, legendary
> unbeaten bosses, a hero who mastered broken games). No names, characters, places
> or story from any existing series are used.

## Title

Working title: **Aetherfall Online: The Unbeaten Seven** (the in-fiction MMO is *Aetherfall Online*).

| Option | Why it works |
|---|---|
| **Aetherfall Online: The Unbeaten Seven** *(recommended)* | Names the core promise — seven bosses nobody has beaten — and the MMO in one line. |
| Frontier of the Endless Hunt | The original working title; evocative, but generic and close to genre conventions. |
| Hitbox Heretic | Funny, on-theme for a hero who reads broken hitboxes; best for a smaller, comedic tone. |
| World First: Turnip Protocol | Leans into the running gag and the world-first race; strongest for marketing, weakest for tone range. |

## Premise

Near future. *Aetherfall Online*, a full-dive VRMMO praised as the first "god-tier" game
that actually works, has launched. **Kai** is infamous online for clearing *trash games*:
buggy, unfinished, unfair releases nobody else can beat. Years of desynced hitboxes and
one-frame dodge windows gave Kai strange skills. Now Kai plays a polished game for the
first time — wearing a hideous launch-bundle **turnip helm** they refuse to take off —
and starts racing the world's top players to the seven Unique Bosses no one has ever beaten.

**Tone:** exciting, funny, skill-obsessed. A love letter to gamer culture, forum drama and
the joy of finally reading a fight.

## Pillars

1. **Mastery is the fantasy.** Every fight is learnable; perfect play is visibly rewarded
   (Just Evade slow-mo, parries, style rank, Glitch Instinct).
2. **Bosses are characters.** Each Unique Boss has a personality, multiple phases and a
   secret that changes the fight (part breaks, pillar stuns, feints).
3. **The world is watching.** A simulated MMO reacts: forum threads, rival whispers,
   world-first announcements.
4. **Trash-game instincts.** Telegraphs can lie; true hitboxes can differ from what you
   see. Kai's edge is noticing that — and the game teaches the player to do the same.

## Core loop

Explore zone → fight monsters → gather loot & materials → upgrade build (craft, stats,
skills that grow by use) → challenge the zone's Unique Boss → unlock a world secret →
open the next zone.

## Combat (summary — full spec in `combat-system.md`)

Real-time third-person action (top-down in the browser slice). Stamina-based dodge with a
**Just Evade** window that slows time; light/heavy combos with heavy finishers; **Switch
Cancel** (swap weapon in a move's recovery to continue the combo); guard with a tight
**Parry** window that staggers and grants a **Counter**; limb/part breaking that changes
boss behaviour; damage numbers, combo counter, **style rank D → SSS**; **Glitch Instinct**
meter that fills through perfect play and reveals true attack hitboxes.

## Build

No classes. Builds come from weapons, use-evolved skills and six stats
(**STR, AGI, DEX, VIT, LUK, TEC**). Six weapon families plus experimental oddities.
Boss materials feed a crafting tree. Cosmetics — including the Turnip Helm — are purely
visual. See `skills-and-weapons.md`.

## World & lore

Six zones: **Mossveil Ruins** (forest ruins), **Varn-Ithe** (sunken city), **the
Shimmerwaste** (crystal desert), **Cirrus Archipelago** (sky islands), **Ironreach
Bastion** (ancient machine fortress), and the secret **Unlit Hollow**, plus the endgame
**Lattice Core**.

**Deep lore:** the world is the ruin of the **Vaelith Concord**, a civilization that did
not die — it *uploaded itself* into the Aether Lattice when its world failed, leaving
caretaker programs to guard the doors. Those caretakers decayed into the seven Unique
Bosses. Each one defeated returns a **Seal Fragment** and a memory. The final revelation:
the Vaelith are still "logged in", trapped in their own game — and the last caretaker
will not let anyone out *or* in. Kai, who has spent years inside broken worlds, is the
one person who knows how to beat a game that cheats.

## Story — three acts

| Act | Zones | Act finale (major Unique) | Arc |
|---|---|---|---|
| I — *New Game* | Mossveil Ruins, Varn-Ithe | **Maresong, the Drowned Choir** (after world-first on **Orrun**) | Kai goes viral as "the turnip"; meets Juno's clan and Ledger. |
| II — *Meta Shift* | Shimmerwaste, Cirrus Archipelago | **Halcyon Drift, the Sky Leviathan** | The world-first race with Rook//Zero turns personal; the Vaelith memories start to disagree with the official lore. |
| III — *Patch Notes* | Ironreach Bastion, Lattice Core | **The Last Administrator** | The game starts "patching" itself against Kai. Trash-game skills vs a world that rewrites its rules. |

Optional: **Nyx-Lantern, the Hollow Hunter** in the Unlit Hollow, reached only through a
chain of deliberate cliff jumps. Between sessions, short **real-life vignettes** of Kai
(rent, sleep, a fridge with a real turnip) frame each act.

## Social flavour (simulated in single-player)

- **Rook//Zero** — #1 PvP player; cold, precise, slowly respects Kai. Recurring duel rival.
- **Ledger** — information broker; sells boss intel, buys Kai's fight logs; never quite trustworthy.
- **Juno Brightwater** — cheerful leader of the **Lantern Parade** clan; relentless (kind) recruiter.
- **World-first race:** server-wide banners when a Unique Boss falls.
- **Forum / news feed** that reacts to deaths, perfect dodges, secrets and style ranks.
- NPCs keep a memory log of the player's choices (who you helped, sold to, lied to) that changes dialogue and prices.

## Art & audio

Vibrant anime cel-shading: flat colour fields, heavy ink outlines, rim light, flashy VFX on
skills and Just Evades. UI is a sleek **holographic HUD** (cyan glass, magenta for Unique
Bosses, gold for world-firsts). Music: orchestral rock for bosses (stems that add layers
per phase), calm ambient for exploration.

## Technology

**Browser HTML5 + JavaScript** (Canvas 2D, ES modules, no dependencies) for the vertical
slice: runs anywhere, zero install. The simulation is renderer-independent so it can move
to Three.js or an engine later (see `production/roadmap.md`, decision point D1).
