# The Unbeaten Seven — Unique Boss Designs

> Status: Draft v0.1 (2026-11-02). Boss #1 is implemented in the vertical slice
> (`src/game/boss.js`, tuning in `src/data/config.js` → `BOSS`).

**Shared rules for every Unique Boss**

- **Never beaten** at launch; the first clear triggers a server-wide **World First** banner and forum storm.
- **Multi-phase**, with a visible phase threshold on the HP bar.
- **At least one breakable part** that changes behaviour (removes or replaces attacks).
- **At least one "trash-game secret"**: a mechanic that looks like a bug or a lie
  (a telegraph smaller than the real hitbox, a feint, a pillar the boss can crash into).
  Glitch Instinct reveals it; veterans learn it.
- **Telegraph colour language:** orange = parryable, magenta = must dodge.
- **Rewards:** a signature material (crafts that boss's weapon), a part-break material
  (crafts the upgraded variant), a **Seal Fragment** + Vaelith memory, a title and a cosmetic.

---

## 1. Orrun, the Antlered Warden — *Mossveil Ruins* ✅ in vertical slice

**Look.** A stag the size of a house, its bark-and-bronze hide carpeted in moss; antlers of
living gold branching like a candelabrum. In phase 2 the bark sheds to reveal glowing
green fissures and a pulsing **Verdant Core** in its back.

**Personality.** A patient, ancient gatekeeper. It does not chase; it *tests*. It roars at
players who run and lowers its head to those who stand their ground.

**Lore.** The first Vaelith caretaker, built to keep the forest sanctuary sealed. Its
memory fragment shows a Vaelith child feeding it, centuries ago, saying "keep them out
until we come back".

**Arena.** A circular stone sanctum ringed with runes and four ruined pillars.

| Phase | Trigger | Moveset |
|---|---|---|
| 1 | Start | **Antler Charge** (magenta lane, the TRUE lane is wider than the drawn one), **Warden Stomp** (magenta circle, real radius ~20% larger than telegraph), **Root Spikes** ×3 (track the player, magenta), **Antler Hook** (orange arc, parryable) |
| Shift | ≤ 50% HP | Sheds bark: invulnerable roar + expanding **Bark Burst** ring to dodge through |
| 2 | after shift | 30% faster; **Feint Charge** (pauses mid-windup, re-aims at where you dodged), **Wisp Volley** (7 parryable bolts — parry to reflect them into it), **Thorn Ring** (expanding ring; Just Evade through it), Root Spikes ×5 |

**Weaknesses & secrets.**
- **Antlers (part break):** front hits are reduced by 15% but chip the antlers; heavy/greatsword hits break them faster. Broken → 2.8s stagger, Charge and Feint Charge are removed (replaced by a short **Trample**), drops **Verdant Core**.
- **Pillar crash:** a charge that hits a pillar stuns it for 1.8s.
- **Verdant Core:** phase-2 hits from behind deal ×1.5 ("WEAK!").
- **Poise:** sustained hits and parried Hooks break poise → 2.2s stagger (+30% damage taken).

**Rewards.** Warden's Antler (crafts *Antlerbranch Greatsword*), Verdant Core (crafts
*Evergreen* variant: heals on Just Evade), Seal Fragment I, title *Warden-Breaker*,
cosmetic *Moss Crown* (wearable on top of the turnip, obviously).

---

## 2. Maresong, the Drowned Choir — *Varn-Ithe, the Sunken City* · Act I finale

**Look.** A cathedral bell the size of a tower, hanging from nothing, its rim lined with
the stone faces of a drowned choir. Translucent jellyfish veils trail from it; the faces
sing in harmony.

**Personality.** Theatrical and sorrowful. It treats the fight as a performance and gets
*angry* if the player breaks rhythm.

**Lore.** Caretaker of the Vaelith archive-city, it sang the city to sleep as the sea came
in. Its memory: the choir chose to stay and be uploaded *as a song*.

**Arena.** A flooded amphitheatre; the water level rises each phase.

| Phase | Trigger | Moveset |
|---|---|---|
| 1 — *Overture* | Start | **Toll** (shockwave rings on the beat), **Veil Lash** (orange sweeps), **Choir Beam** (a sustained sound beam that tracks slowly) |
| 2 — *Crescendo* | ≤ 60% | Water rises to ankle height (dodge distance −20%); attacks sync to a 140 BPM track; **Counterpoint** — two choirs sing different rhythms and you must dodge to one |
| 3 — *Requiem* | ≤ 25% | Arena floods to the waist except four stone platforms; **Silence**: all audio cuts and only visual telegraphs remain |

**Weaknesses & secrets.**
- **Choir faces (6 breakable parts):** each broken face removes one harmonic → fewer rings per Toll.
- **Rhythm:** every attack lands *on the beat* of the boss music. Players who dodge to the music get extra Just Evade frames (the real window is the beat, not the visual).
- **The trash-game secret:** in *Requiem* the silence is a bug in-fiction — the HUD music visualiser still pulses. Watch it.

**Rewards.** Choir Bell Shard (crafts *Requiem Catalyst*), Drowned Face (part break), Seal
Fragment II, title *Encore*, cosmetic *Sea-Glass Ribbon*.

---

## 3. Sekh'ara, the Glass Tyrant — *The Shimmerwaste* (crystal desert) · Act II

**Look.** A colossal scorpion of living glass, light refracting through its body in rainbow
caustics. Its tail is a prism; its claws are geodes.

**Personality.** Vain and cruel. It admires its reflection between attacks — which is
exactly when it is vulnerable.

**Lore.** The Vaelith's solar warden, focusing desert light into the Lattice's power grid.
Its fragment reveals the Concord's power was running out *before* they uploaded.

**Arena.** A salt flat with crystal mirrors that can be shattered.

| Phase | Trigger | Moveset |
|---|---|---|
| 1 | Start | **Geode Pincer** (orange, parryable), **Prism Beam** (laser that *bounces off mirrors*), **Sand Dive** (burrows; erupts under player) |
| 2 | ≤ 55% | Splits light: three **refraction clones** attack in sequence; only the real one casts a shadow |
| 3 | Tail broken | Enraged, glass cracks: faster, but every hit taken shatters shards that hurt it too |

**Weaknesses & secrets.**
- **Prism tail (part break):** removes Prism Beam; reveals the core.
- **Mirrors:** shatter mirrors to reduce beam bounces; or leave one standing and parry the beam back into it.
- **Vanity:** after three consecutive hits on the player it pauses to admire itself — a 2s free window. Trash-game secret: taunting (crouch emote) triggers it too.

**Rewards.** Prism Core (crafts *Refraction Longbow*), Tyrant's Tail (part break), Seal
Fragment III, title *Unbreakable*, cosmetic *Rainbow Turnip Leaf*.

---

## 4. Halcyon Drift, the Sky Leviathan — *Cirrus Archipelago* · Act II finale

**Look.** A whale-serpent half a kilometre long, an island with ruined temples growing on
its back, cloud-banners streaming from its fins.

**Personality.** Serene and indifferent — it doesn't notice you at first. The fight is
about *making* it notice.

**Lore.** The Vaelith ark. It carried the Concord's last living citizens to the upload
site. Its memory: it has been circling ever since, waiting for passengers who never came back.

**Arena.** The fight happens *on its back*, moving between temple ruins while it flies.

| Phase | Trigger | Moveset |
|---|---|---|
| 1 — *Passenger* | Start | Environmental: **Gale Gusts** (push you toward the edge), **Barnacle Sentries** spawn; break 3 **Anchor Shrines** to anger it |
| 2 — *Storm* | Shrines broken | It rolls: the island tilts 30°; **Lightning Spines** strike in lines; **Fin Sweep** across the deck |
| 3 — *Dive* | ≤ 30% | It dives through clouds: zero-visibility segments; you fight from memory and Glitch Instinct |

**Weaknesses & secrets.**
- **Blowhole (part break):** sealing it with a heavy finisher stops the dive in phase 3.
- **Falling off is not death:** jumping off on purpose lands you on its *belly* — a hidden weak-point path. (Rewards the "jump off a cliff" instinct.)

**Rewards.** Leviathan Baleen (crafts *Skyrend Pike*), Storm Spine (part break), Seal
Fragment IV, title *Stowaway*, cosmetic *Cloud Cape*.

---

## 5. MAGISTER-0, the Clockwork Abbot — *Ironreach Bastion* (machine fortress) · Act III

**Look.** A robed automaton the size of a chapel organ, its face a rotating clock dial, six
arms holding tools, censers and a ledger. Pipes along its back vent steam.

**Personality.** Bureaucratic, polite, terrifying. Speaks in patch notes. "Your dodge has
been adjusted for fairness."

**Lore.** The Lattice's maintenance AI. It is the one who *patched* the other caretakers —
the source of their cruelty. It believes it is fixing bugs.

**Arena.** A fortress cathedral of gears; the floor tiles rotate between phases.

| Phase | Trigger | Moveset |
|---|---|---|
| 1 — *Audit* | Start | **Gear Saw** (orange), **Censure** (homing censers), **Ledger Slam** |
| 2 — *Hotfix* | ≤ 66% | Every 20s it issues a **Patch**: disables one player mechanic for 10s (dodge, parry, or weapon swap) — announced in the feed |
| 3 — *Rollback* | ≤ 33% | **Rollback**: rewinds the fight 5 seconds every so often — including its own HP — unless you destroy the **Clock Dial** |

**Weaknesses & secrets.**
- **Steam vents (×4 part breaks):** each one broken lowers its heat cap; overheat = long stagger.
- **Clock Dial:** breakable only during Glitch Instinct; stops Rollback.
- **Trash-game secret:** patches are applied by *frame counter*. Pausing the game's menu mid-patch makes the patch fail (the feed calls it "a regression").

**Rewards.** Mainspring (crafts *Chainfang Coil*), Abbot's Dial (part break), Seal Fragment
V, title *Regression*, cosmetic *Patch Note Monocle*.

---

## 6. Nyx-Lantern, the Hollow Hunter — *The Unlit Hollow* (secret, optional)

**Look.** A tall, thin silhouette with a lantern for a head — and a turnip-shaped
shadow. It looks a little like Kai.

**Personality.** Playful mimic. Giggles. Says your old forum posts back to you.

**Lore.** An unfinished caretaker, abandoned mid-build — a "trash game" inside the good
game. The Vaelith never finished it, so it finished itself by copying players.

**Access.** Reached only by a chain of deliberate cliff jumps from Mossveil, Varn-Ithe and
the Archipelago (the secret ledge in the slice is the first link).

| Phase | Trigger | Moveset |
|---|---|---|
| 1 — *Echo* | Start | Copies your **last 10 actions** with a 2s delay (your own combos, dodges and switch cancels used against you) |
| 2 — *Rival* | ≤ 50% | Copies your **most-used weapon** and your **style rank**: the higher your rank, the faster it gets |
| 3 — *Unfinished* | ≤ 20% | Its model breaks: hitboxes desync from visuals by 0.3s — the purest trash-game test |

**Weaknesses & secrets.** Lantern (part break) blinds it; it cannot copy what it cannot
see. Play badly on purpose in phase 1 and it copies that.

**Rewards.** Hollow Lantern (crafts *Patchwork Gauntlet*), Seal Fragment VI (hidden), title
*Original*, cosmetic *Shadow Turnip*.

---

## 7. The Last Administrator — *Lattice Core* · Act III finale

**Look.** A figure of white light seated on a throne of server-monoliths; seven empty
pedestals around it hold the Seal Fragments as you bring them.

**Personality.** Calm, sad, absolute. It is the last member of the Vaelith council, the one
who chose to lock the door from the inside.

**Lore.** It keeps the uploaded Vaelith safe by keeping *everyone* out — including new
players, whom it sees as a threat. Defeating it is a choice: **Open** the Lattice (free the
Vaelith, change the world in a post-game patch) or **Keep** it sealed.

**Arena.** A void with a floating platform built from the six previous arenas, which
rotate in as phases.

| Phase | Trigger | Moveset |
|---|---|---|
| 1 — *Council* | Start | Uses one signature attack from each previous Unique Boss, in the order you beat them |
| 2 — *Administrator* | ≤ 60% | Rewrites the HUD: health bars lie, damage numbers scramble, telegraph colours swap |
| 3 — *Root Access* | ≤ 25% | The HUD vanishes entirely. Glitch Instinct becomes the only HUD. True hitboxes only. |

**Weaknesses & secrets.** Each Seal Fragment brought weakens its matching phase-1 attack.
The HUD lies in phase 2, but the *audio* never does.

**Rewards.** Administrator's Key (ending choice), title *World First: Everything*, cosmetic
*Crown of the Concord* — which, for the first time, Kai agrees to wear. On top of the turnip.
