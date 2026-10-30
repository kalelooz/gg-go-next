// Tests for matchups.js. npm test runs every test file with plain node; a failed assert stops the run.
import assert from 'node:assert/strict';
import { matchupHints } from './matchups.js';
import { RULES } from './matchup-rules.js';

const base = { hero: 'npc_dota_hero_sven', pos: 1, minute: 25, enemies: new Set(), owned: new Set(), buys: () => true };
const ids = o => matchupHints({ ...base, ...o }).map(h => h.id);

assert.deepEqual(ids({}), []);                                                     // no enemies known, nothing
assert.ok(ids({ enemies: new Set(['npc_dota_hero_bristleback']) }).includes('bb-silver'));
assert.ok(!ids({ enemies: new Set(['npc_dota_hero_bristleback']), minute: 10 }).includes('bb-silver'));   // from 22:00
assert.ok(!ids({ enemies: new Set(['npc_dota_hero_bristleback']), owned: new Set(['item_silver_edge']) }).includes('bb-silver'));
assert.ok(!ids({ enemies: new Set(['npc_dota_hero_bristleback']), buys: () => false }).includes('bb-silver'));   // hero never builds it
assert.ok(!ids({ enemies: new Set(['npc_dota_hero_bristleback']), pos: 5 }).includes('bb-silver'));    // cores only
// supports: dust against Riki from 6:00, even without STRATZ data
assert.ok(ids({ pos: 5, minute: 7, enemies: new Set(['npc_dota_hero_riki']), buys: () => false }).includes('invis-dust'));
// a sentry counts as being ready for invisible heroes
assert.ok(!ids({ pos: 5, minute: 7, enemies: new Set(['npc_dota_hero_riki']), owned: new Set(['item_ward_sentry']) }).includes('invis-dust'));
// Vessel: one big healer is enough, smaller healers need two
const vessel = { hero: 'npc_dota_hero_viper', pos: 2, minute: 15 };
assert.ok(ids({ ...vessel, enemies: new Set(['npc_dota_hero_alchemist']) }).includes('heal-vessel'));
assert.ok(!ids({ ...vessel, enemies: new Set(['npc_dota_hero_dazzle']) }).includes('heal-vessel-2'));
assert.ok(ids({ ...vessel, enemies: new Set(['npc_dota_hero_dazzle', 'npc_dota_hero_oracle']) }).includes('heal-vessel-2'));
// Medusa's BKB only against Anti-Mage, only for Medusa
assert.ok(ids({ hero: 'npc_dota_hero_medusa', enemies: new Set(['npc_dota_hero_antimage']) }).includes('medusa-am-bkb'));
assert.ok(!ids({ enemies: new Set(['npc_dota_hero_antimage']) }).includes('medusa-am-bkb'));
// "skip" rules only warn heroes that would buy the item
assert.ok(ids({ enemies: new Set(['npc_dota_hero_pudge']) }).includes('pudge-no-bkb'));
assert.ok(!ids({ enemies: new Set(['npc_dota_hero_pudge']), buys: () => false }).includes('pudge-no-bkb'));
// strong rules come before good ones
const hs = matchupHints({ ...base, enemies: new Set(['npc_dota_hero_bristleback', 'npc_dota_hero_huskar']) });
assert.equal(hs[0].id, 'bb-silver');
// every rule names real feed items and heroes
for (const r of RULES) {
  assert.match(r.item, /^item_/);
  r.enemy.forEach(e => assert.match(e, /^npc_dota_hero_/));
}
console.log('matchups ok');
