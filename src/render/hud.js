/**
 * Holographic DOM HUD: vitals, weapon, Glitch Instinct, style rank, combo,
 * boss bar with part status, inventory, centre banners and the news feed.
 */
import { RANKS } from '../game/style.js';

const RANK_COLORS = ['#9aa5b1', '#7df9ff', '#72efdd', '#80ffdb', '#ffd166', '#ff9f1c', '#ff4d6d'];
const ATTACK_NAMES = {
  charge: 'Antler Charge', feintCharge: 'Feint Charge', trample: 'Trample', stomp: 'Warden Stomp',
  rootSpikes: 'Root Spikes', wispVolley: 'Wisp Volley', thornRing: 'Thorn Ring', hook: 'Antler Hook',
};

export class Hud {
  /** @param {Document} doc @param {import('../game/world.js').World} world */
  constructor(doc, world) {
    this.doc = doc;
    this.world = world;
    const $ = (id) => doc.getElementById(id);
    this.el = {
      hp: $('hp-fill'), hpText: $('hp-text'), st: $('st-fill'), gl: $('gl-fill'), glLabel: $('gl-label'),
      weapon: $('weapon'), skills: $('skills'), rank: $('rank'), rankBar: $('rank-fill'), combo: $('combo'),
      boss: $('boss'), bossName: $('boss-name'), bossHp: $('boss-fill'), bossPhase: $('boss-phase'), bossPart: $('boss-part'),
      bossCall: $('boss-call'), inv: $('inventory'), banner: $('banner'), feed: $('feed'),
    };
    this.bannerTimer = 0;
    this.lastRank = -1;
  }

  /** Big centre announcement. */
  banner(title, sub = '', kind = '') {
    const b = this.el.banner;
    b.className = `banner show ${kind}`;
    b.innerHTML = `<div class="banner-title"></div><div class="banner-sub"></div>`;
    b.querySelector('.banner-title').textContent = title;
    b.querySelector('.banner-sub').textContent = sub;
    this.bannerTimer = 2.6;
  }

  /** Append a feed line. kind: system|forum|world|whisper|party|worldfirst|skill */
  feed(kind, text) {
    const li = this.doc.createElement('li');
    li.className = `feed-${kind}`;
    const tag = this.doc.createElement('span');
    tag.className = 'tag';
    tag.textContent = kind === 'worldfirst' ? 'WORLD FIRST' : kind.toUpperCase();
    li.appendChild(tag);
    li.appendChild(this.doc.createTextNode(` ${text}`));
    this.el.feed.appendChild(li);
    while (this.el.feed.children.length > 7) this.el.feed.removeChild(this.el.feed.firstChild);
  }

  update(dt) {
    const w = this.world;
    const p = w.player;
    const e = this.el;
    e.hp.style.width = `${(p.hp / p.maxHp) * 100}%`;
    e.hpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    e.st.style.width = `${p.stamina.ratio * 100}%`;
    e.gl.style.width = `${w.glitch.ratio * 100}%`;
    e.glLabel.textContent = w.glitch.active ? 'GLITCH INSTINCT — ACTIVE' : w.glitch.ready ? 'GLITCH INSTINCT — PRESS E' : 'GLITCH INSTINCT';
    e.glLabel.parentElement.classList.toggle('ready', w.glitch.ready);
    const other = p.weapons[(p.weaponIndex + 1) % p.weapons.length];
    e.weapon.innerHTML = `<b style="color:${p.weapon.color}"></b> <span class="dim">[Q] ⇄ </span><span class="dim2"></span>`;
    e.weapon.querySelector('b').textContent = p.weapon.name;
    e.weapon.querySelector('.dim2').textContent = other.name;
    e.skills.textContent = ['justEvade', 'switchCancel', 'parry'].map((id) => `${w.skills.name(id)} ${w.skills.uses[id] || 0}`).join('  ·  ');

    const ri = w.style.rankIndex;
    e.rank.textContent = RANKS[ri];
    e.rank.style.color = RANK_COLORS[ri];
    if (ri !== this.lastRank) {
      e.rank.classList.remove('pop');
      void e.rank.offsetWidth;
      e.rank.classList.add('pop');
      this.lastRank = ri;
    }
    e.rankBar.style.width = `${w.style.progress * 100}%`;
    e.rankBar.style.background = RANK_COLORS[ri];
    e.combo.textContent = w.combo.count > 1 ? `${w.combo.count} HITS` : '';

    const b = w.boss;
    const showBoss = b.engaged && (b.alive || w.flags.bossDefeated);
    e.boss.classList.toggle('show', showBoss && b.alive);
    if (showBoss) {
      e.bossName.textContent = b.name;
      e.bossHp.style.width = `${(b.hp / b.maxHp) * 100}%`;
      e.bossPhase.textContent = `PHASE ${b.phase}`;
      const a = b.parts.antlers;
      e.bossPart.textContent = a.broken ? 'ANTLERS: BROKEN' : `ANTLERS: ${Math.max(0, Math.round((a.hp / a.max) * 100))}%`;
      e.bossPart.classList.toggle('broken', a.broken);
      e.bossCall.textContent = b.fsm.is('attack') ? `» ${ATTACK_NAMES[b.currentAttack] || ''}` : b.fsm.is('stagger') ? '» STAGGERED' : '';
    }

    const inv = Object.entries(w.inventory);
    e.inv.innerHTML = inv.length ? '' : '<span class="dim">No materials yet</span>';
    for (const [id, n] of inv) {
      const it = w.cfg.ITEMS[id];
      const row = this.doc.createElement('div');
      row.innerHTML = `<i style="background:${it.color}"></i><span></span> <b>×${n}</b>`;
      row.querySelector('span').textContent = it.name;
      e.inv.appendChild(row);
    }

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) e.banner.classList.remove('show');
    }
  }
}
