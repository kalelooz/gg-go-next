// Neutral item helper: which artifact and enchantment pros craft for your hero, role and tier, and a nudge when
// you're a tier behind. Rules and timings from Valve's 7.38-7.41f patch notes and pro games.
// Used by index.html.
import { ATTR, NAMES, PICKS, ENC } from './neutrals.js';

// game-clock minute each tier opens, Tier 1 to 5 (7.41), and its Madstone cost
export const OPENS = [0, 15, 25, 35, 60];
const COST = [6, 10, 10, 10, 10];
// the tier an enchantment first appears in; its level counts up from there (Tier 5-only ones are left out)
const FIRST = { quickened: 1, vital: 1, brawny: 1, tough: 1, alert: 1, mystical: 1,
  greedy: 2, crude: 2, nimble: 2, keen_eyed: 2, titanic: 2, timeless: 4 };
// their crafting works differently (next-tier offers, a bear copy, stacked enchantments), so the tier count is off
const SKIP = new Set(['chaos_knight', 'lone_druid', 'techies']);

// highest tier crafted so far, from the enchantment in neutral1. null: can't tell (Dormant Curio's "curious")
export function craftedTier(enc) {
  if (!enc?.name || enc.name === 'empty') return 0;
  const k = enc.name.replace(/^item_enhancement_/, '');
  if (k === 'curious') return null;
  const first = FIRST[k] ?? 5;
  return first === 5 ? 5 : Math.min(5, first - 1 + (enc.item_level || 1));
}

// roles as the pro data groups them: c richest (carry), m mid and offlane, s supports
const group = pos => pos === 1 ? 'c' : pos <= 3 ? 'm' : 's';
export const picksFor = (heroId, pos, tier) => PICKS[`${heroId}:${group(pos)}:${tier}`] || PICKS[`${group(pos)}:${tier}`] || [];
export const encFor = (heroId, pos, tier) => ENC[`${ATTR[heroId]}:${group(pos)}:${tier}`]?.[0] || null;
export const neutralName = id => NAMES[id] || id.replace(/_/g, ' ');

// The next tier to craft once it's open, or null. Text is two short lines so it never widens the panel. art/enc: GSI items.neutral0 and neutral1.
// Voice (clip) only when it's overdue: Tier 1 still empty at 12:00 and 20:00, a later tier 6 minutes after it opens.
// The feed has no Madstone count, so nothing here says you can afford it.
export function neutralTip({ minute, pos, heroId, heroKey, art, enc }) {
  if (!pos || minute == null) return null;
  if (art?.name === 'item_divine_regalia_broken')
    return { tier: null, picks: [], enc: null, clip: null, key: 'regalia',
      text: 'Regalia broke when you died.\nRecraft: 20 Madstone, then 30.' };
  const have = !art?.name || art.name === 'empty' ? 0 : craftedTier(enc);
  if (have == null || (have > 0 && SKIP.has(heroKey))) return null;
  const tier = have + 1, open = OPENS.filter(m => minute >= m).length;
  // Tier 1 opens at 0:00 but camps need clearing first; pros craft it around 9:00
  if (tier > 5 || tier > open || (tier === 1 && minute < 7)) return null;
  const picks = picksFor(heroId, pos, tier), e = encFor(heroId, pos, tier);
  let clip = null, key = null, text = `Tier ${tier} neutral, ${COST[tier - 1]} Madstone.`;
  if (tier === 1 && minute >= 12) {
    clip = 'neutral-craft'; key = 'empty' + (minute >= 20 ? 20 : 12);
    text = 'Neutral slot empty.\nCraft Tier 1 at 6 Madstone.';
  } else if (tier > 1 && minute >= OPENS[tier - 1] + 6) {
    clip = 'neutral-behind'; key = 'behind' + tier;
    text = `Tier ${tier} neutral is open.\nClear camps for 10 Madstone.`;
  }
  return { tier, picks, enc: e, clip, key, text };
}
