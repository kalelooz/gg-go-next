import assert from 'node:assert/strict';
import { craftedTier, neutralTip, picksFor } from './neutral.js';

// crafted tier from the enchantment (docs/research/neutral-items.md section 2; Brawny 1, 2 and Tough 3 seen in our logs)
assert.equal(craftedTier(null), 0);
assert.equal(craftedTier({ name: 'item_enhancement_brawny', item_level: 2 }), 2);
assert.equal(craftedTier({ name: 'item_enhancement_tough', item_level: 3 }), 3);
assert.equal(craftedTier({ name: 'item_enhancement_greedy', item_level: 1 }), 2);
assert.equal(craftedTier({ name: 'item_enhancement_timeless', item_level: 1 }), 4);
assert.equal(craftedTier({ name: 'item_enhancement_vampiric', item_level: 1 }), 5);
assert.equal(craftedTier({ name: 'item_enhancement_curious', item_level: 1 }), null);

const empty = { name: 'empty' }, luna = { heroId: 48, heroKey: 'luna', pos: 1 };
// nothing before 7:00 or without a role
assert.equal(neutralTip({ ...luna, minute: 5, art: empty, enc: empty }), null);
assert.equal(neutralTip({ ...luna, pos: null, minute: 9, art: empty, enc: empty }), null);
// Tier 1 shows silently at 9:00, talks at 12:00 and again at 20:00
let t = neutralTip({ ...luna, minute: 9, art: empty, enc: empty });
assert.equal(t.tier, 1); assert.equal(t.clip, null); assert.equal(t.picks.length, 3);
assert.equal(neutralTip({ ...luna, minute: 12, art: empty, enc: empty }).key, 'empty12');
assert.equal(neutralTip({ ...luna, minute: 21, art: empty, enc: empty }).key, 'empty20');
// Tier 1 crafted: quiet until Tier 2 opens at 15:00, nudged at 21:00
const t1 = { art: { name: 'item_duelist_gloves' }, enc: { name: 'item_enhancement_alert', item_level: 1 } };
assert.equal(neutralTip({ ...luna, minute: 14, ...t1 }), null);
t = neutralTip({ ...luna, minute: 15, ...t1 });
assert.equal(t.tier, 2); assert.equal(t.clip, null);
assert.equal(neutralTip({ ...luna, minute: 21, ...t1 }).clip, 'neutral-behind');
// two tiers behind still offers the next one, since tiers can't be skipped
assert.equal(neutralTip({ ...luna, minute: 30, ...t1 }).tier, 2);
// the Luna log: Duelist Gloves + Alert level 2 = Tier 2 crafted, so nothing until 25:00
assert.equal(neutralTip({ ...luna, minute: 24, art: { name: 'item_duelist_gloves' }, enc: { name: 'item_enhancement_alert', item_level: 2 } }), null);
// all five done
assert.equal(neutralTip({ ...luna, minute: 70, art: { name: 'item_desolator_2' }, enc: { name: 'item_enhancement_audacious', item_level: 1 } }), null);
// broken Regalia, and heroes whose crafting doesn't follow the count
assert.equal(neutralTip({ ...luna, minute: 62, art: { name: 'item_divine_regalia_broken' }, enc: { name: 'item_enhancement_evolved', item_level: 1 } }).key, 'regalia');
assert.equal(neutralTip({ heroId: 81, heroKey: 'chaos_knight', pos: 1, minute: 21, ...t1 }), null);
// supports keep their artifact at Tier 3 most often (35% of pro crafts), and take Greedy at Tier 2
assert.equal(picksFor(9999, 5, 3)[0][0], 'keep');
assert.equal(neutralTip({ heroId: 5, heroKey: 'crystal_maiden', pos: 5, minute: 16, art: { name: 'item_kobold_cup' }, enc: { name: 'item_enhancement_mystical', item_level: 1 } }).enc[0], 'enhancement_greedy');
console.log('neutral ok');
