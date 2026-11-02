/**
 * Simulated "online" flavour: system notices, forum posts, rival/party chatter.
 * Keyed by game event; each entry is a list so repeats can vary.
 * Characters (all original): Rook//Zero (top PvP player), Ledger (information
 * broker), Juno Brightwater (leader of the Lantern Parade clan).
 */
export const FEED = {
  start: [
    ['system', 'Full-dive link established. Welcome to Aetherfall Online, Kai.'],
    ['system', 'Zone discovered: Mossveil Ruins.'],
    ['party', 'Juno (Lantern Parade): "New player?! Love the turnip. Clan invite is open forever, no pressure!!"'],
  ],
  firstKill: [['forum', 'anon_772: someone in Mossveil is speedrunning the tutorial mobs with a vegetable on their head']],
  firstJustEvade: [
    ['forum', 'hitbox_enjoyer: did anyone else just see a turnip frame-perfect dodge a Sentinel slam??'],
    ['whisper', 'Ledger: "That dodge was 3 frames. I sell information, and right now YOU are information."'],
  ],
  firstParry: [['forum', 'parry_or_die: "parry window in this game is tight" — the turnip, apparently: no']],
  glitch: [['system', 'Glitch Instinct active — true hitboxes visible.']],
  enterArena: [
    ['world', 'Rook//Zero: "The Warden has wiped 412 parties. Do not embarrass yourself, rookie."'],
    ['system', 'UNIQUE BOSS ENCOUNTER: Orrun, the Antlered Warden.'],
  ],
  partBreak: [
    ['system', 'PART BREAK: Antlers shattered. Orrun can no longer charge.'],
    ['forum', 'ledger_official: Confirmed. The Warden\'s antlers are breakable. Price of this info just went up.'],
  ],
  phase2: [
    ['system', 'Orrun sheds its bark. PHASE 2 — the Verdant Core is exposed on its back.'],
    ['party', 'Juno: "Its back is glowing! That HAS to be a weak spot, right?? Right???"'],
  ],
  wallStun: [['forum', 'anon_19: wait you can make it headbutt a pillar?? since when']],
  sss: [['forum', 'style_police: someone\'s style meter is pinned on SSS. reported for being too cool']],
  death: [
    ['forum', 'anon_404: lol turnip down. F'],
    ['forum', 'rook_fan_01: Rook would never.'],
    ['whisper', 'Ledger: "Death count noted. For my records. Not for sale. Probably."'],
  ],
  secret: [
    ['system', 'HIDDEN ACHIEVEMENT: "Gravity Is a Suggestion" — you jumped. On purpose.'],
    ['forum', 'cliff_diver: there is NOTHING down there. trust me. (there is something down there)'],
  ],
  victory: [
    ['worldfirst', 'WORLD FIRST — Unique Boss "Orrun, the Antlered Warden" defeated. Hunter: Kai.'],
    ['forum', 'THREAD (2.4k replies): WHO IS THE TURNIP'],
    ['world', 'Rook//Zero: "...Fine. Duel me. Arena 7. Tomorrow."'],
    ['whisper', 'Ledger: "I\'ll pay 40,000 aurum for your fight log. Name your price, actually."'],
    ['party', 'Juno: "THE LANTERN PARADE IS THROWING YOU A PARTY. attendance mandatory. hat optional (keep the hat)"'],
  ],
};

/** Between-session "real life" vignettes shown on the title and result screens. */
export const VIGNETTES = {
  intro: [
    "Kai's apartment, 11:58 PM.",
    'Rent: due Friday. Sleep: optional. Library of 312 broken games: all cleared.',
    'Tonight Kai plays a game that actually works, for the first time in years.',
    'The turnip helm from the launch bundle is hideous. Kai will never take it off.',
  ],
  victory: [
    'Kai logs out at 4:12 AM.',
    'Phone: 37 notifications. One is from the landlord. Thirty-six are about a turnip.',
    'Kai opens the fridge, stares at an actual turnip, and decides it is a sign.',
  ],
};
