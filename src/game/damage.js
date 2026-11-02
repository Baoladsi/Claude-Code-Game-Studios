/**
 * Damage formulas. Pure functions; randomness is injected.
 * See design/gdd/combat-system.md §Formulas for the definitions.
 * @module game/damage
 */
import { clamp } from '../core/math.js';

/**
 * Outgoing damage from an attacker's move.
 *
 * amount = base × (1 + Σ stat_k × scaling_k × statScale)
 *        × (crit ? critMult + TEC × tecCritMult : 1)
 *        × (counter ? counterMult : 1)
 *        × weakness × armor × (staggered ? staggerMult : 1) × bonus
 *
 * @param {{base:number}} move the attack (base damage)
 * @param {Record<string, number>} scaling stat -> weight for this weapon
 * @param {Record<string, number>} stats attacker stats (STR, AGI, DEX, VIT, LUK, TEC)
 * @param {{counter?:boolean, weakness?:number, armor?:number, staggered?:boolean, bonus?:number}} ctx
 * @param {() => number} rng injected random source
 * @param {object} tuning DAMAGE block from data/config.js
 * @returns {{amount:number, crit:boolean}}
 */
export function computeDamage(move, scaling, stats, ctx, rng, tuning) {
  let statBonus = 0;
  for (const [stat, weight] of Object.entries(scaling || {})) {
    statBonus += (stats[stat] || 0) * weight * tuning.statScale;
  }
  let amount = move.base * (1 + statBonus);
  const critChance = clamp(tuning.baseCrit + (stats.LUK || 0) * tuning.lukCrit, 0, 1);
  const crit = Boolean(ctx.counter) || rng() < critChance;
  if (crit) amount *= tuning.critMult + (stats.TEC || 0) * tuning.tecCritMult;
  if (ctx.counter) amount *= tuning.counterMult;
  amount *= ctx.weakness ?? 1;
  amount *= ctx.armor ?? 1;
  if (ctx.staggered) amount *= tuning.staggerMult;
  amount *= ctx.bonus ?? 1;
  return { amount: Math.max(1, Math.round(amount)), crit };
}

/**
 * Incoming damage after the defender's VIT reduction.
 * taken = base × (1 − min(maxReduction, VIT × vitReduction)) × guardMult
 */
export function incomingDamage(base, stats, tuning, guardMult = 1) {
  const reduction = Math.min(tuning.maxReduction, (stats.VIT || 0) * tuning.vitReduction);
  return Math.max(1, Math.round(base * (1 - reduction) * guardMult));
}
