# Build System — Stats, Weapons, Skill Tree, Crafting, Cosmetics

> Status: Draft v0.1 (2026-11-02). The vertical slice implements two weapons
> (Twin Fangs, Ironwood Greatsword), three use-evolving skills and the six stats
> (`src/data/config.js` → `PLAYER.stats`, `WEAPONS`, `SKILLS`).

## Principles

- **No classes.** A build = two equipped weapons + evolved skills + stat allocation.
- **Skills grow by use.** Doing a thing well, many times, evolves it. No skill-point menus for core skills.
- **Two weapons equipped** at all times so Switch Cancel is always available.

## Stats

Gain 3 points per level; respec at shrines for a boss material.

| Stat | Effect (slice formula in `combat-system.md`) |
|---|---|
| **STR** | Damage scaling for heavy weapons; poise damage |
| **AGI** | Damage scaling for light weapons; dodge distance; stamina regen |
| **DEX** | Damage scaling for precise weapons; attack speed; bow draw speed |
| **VIT** | Max HP; incoming damage −1.2% per point (cap 50%) |
| **LUK** | Crit chance +0.6% per point; rare drop rate; *weird secret discovery* chance |
| **TEC** | Crit damage +1% per point; Glitch Instinct gain and duration; perfect-window bonus at high values |

## Weapon families

| Family | Starter | Feel | Scaling | Signature mechanic |
|---|---|---|---|---|
| **Dual short swords** | Twin Fangs ✅ | Fast 4-hit chains, short range | DEX, AGI | *Fang Whirl* finisher; cancels into dodge on any frame of recovery |
| **Greatsword** | Ironwood Greatsword ✅ | Slow, wide, huge poise & part damage | STR, TEC | *Sundering Drop*; ×2.6 part-break multiplier |
| **Spear** | Ashwood Pike | Mid-range thrusts, jump attacks | DEX, STR | *Vault*: thrust off an enemy to leap over attacks (counts as a dodge) |
| **Bow** | Wisp-string Longbow | Ranged, charge shots, weak-point focus | DEX, LUK | *Pinning Shot*: arrows in a part keep it "stuck" for bonus part damage |
| **Magic catalyst** | Lattice Focus | Spells cost stamina + Aether; area control | TEC, LUK | *Spell Weave*: alternate two elements to fuse them |
| **Experimental: chain-blade** | Chainfang Coil | Switches between whip-range lash and close twin blades mid-combo | TEC, AGI | *Reel*: hook an enemy and pull yourself to it or it to you |
| *Oddity:* gauntlet | Patchwork Gauntlet (secret) | Fists that "copy" the last weapon you swapped from | all stats at 50% | Infinite Switch Cancel loops |

### Weapon list (crafted from Unique Boss materials)

| Weapon | Family | Source | Unique effect |
|---|---|---|---|
| Twin Fangs | Dual swords | Start | — |
| Ironwood Greatsword | Greatsword | Start | — |
| Antlerbranch Greatsword | Greatsword | Orrun — Warden's Antler | Heavy finishers spawn root spikes |
| Evergreen Antlerbranch | Greatsword | + Verdant Core (part break) | Just Evade heals 5% HP |
| Requiem Catalyst | Catalyst | Maresong — Choir Bell Shard | Spells land on the music's beat for +30% |
| Refraction Longbow | Bow | Sekh'ara — Prism Core | Arrows split into 3 on crit |
| Skyrend Pike | Spear | Halcyon Drift — Leviathan Baleen | Vault launches a lightning strike |
| Chainfang Coil | Chain-blade | MAGISTER-0 — Mainspring | Reel resets your combo counter timer |
| Patchwork Gauntlet | Oddity | Nyx-Lantern — Hollow Lantern | Copies the previous weapon's finisher |
| Glassfang Twins | Dual swords | Sekh'ara — Tyrant's Tail | Hits during Glitch Instinct ignore armour |

## Skill tree

Core skills evolve by **use** (counts in brackets are the slice values for the first tier).
Branch choices at tier 3 are permanent per save (respec costs a Seal-tier material).

```
MOVEMENT
  Dodge ─► Just Evade ─(5 Just Evades)─► Phantom Step (+40% perfect window) ✅
                                   ├─► Afterimage (a decoy that draws aggro for 1.5s)
                                   └─► Blink Counter (Just Evade → instant teleport strike)

DEFENCE
  Guard ─► Parry ─(4 parries)─► Mirror Guard (+30% parry window) ✅
                         ├─► Riposte Chain (counters chain into another counter)
                         └─► Iron Wall (blocks drain 50% less stamina)

ARSENAL
  Swap ─► Switch Cancel ─(8 cancels)─► Fluid Arsenal (+15% switch-cancel damage) ✅
                                  ├─► Twin Loadout Overdrive (5 cancels in 10s = 6s of free stamina)
                                  └─► Quick Draw (swap during a dodge for a dodge-attack)

GLITCH (TEC gated)
  Glitch Instinct ─► Frame Reader (shows countdown to each hit) ─► Desync (activation grants 0.5s i-frames)
                                                               └─► Exploit (hits while active ignore armour)
```

**Weapon skills** (4–6 per family) evolve the same way, e.g. Twin Fangs:
*Fang Whirl → Cyclone Fang* (after 40 finishers), *Piercing Rush → Phantom Rush* (passes
through enemies, after 25 rush hits); Greatsword: *Sundering Drop → Earthsplitter* (after
20 part-break hits).

## Crafting tree

```
Common mats (Mossy Fang, Ruin Shard, Wisp Ember …) ─► +1 … +5 upgrades of any weapon
Boss signature mat ─────────────────────────────────► unlock that boss's weapon
Boss part-break mat ────────────────────────────────► evolve it (+ unique effect)
Seal Fragments ─────────────────────────────────────► "Concord" tier (+10, cosmetic glow, lore entry)
```
Rule: every Unique weapon needs **one part-break material** for its final form, so part
breaking is always worth learning.

## Cosmetics & the Turnip Helm

- **Turnip Helm** (launch-bundle starter): Kai refuses to remove it. Every other headgear
  is equipped *on top of* it. NPCs comment on it; forum threads are named after it.
  Secret variant in the slice: **Gilded Turnip Helm** (cliff-jump chest).
- One cosmetic per Unique Boss (see `unique-bosses.md`), clan banners, emotes (the
  *crouch-taunt* matters vs Sekh'ara), and a "world-first" aura per boss.
