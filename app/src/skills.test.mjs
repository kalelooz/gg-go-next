import assert from 'node:assert/strict';
import { freePoints, guideOrders, nextSkill, talentTip } from './skills.js';

// Sniper, level by level from a real game log: keen_scope is innate, cosmetics never count
const sniper = new Set(['sniper_shrapnel', 'sniper_headshot', 'sniper_take_aim', 'sniper_assassinate']);
const feed = (level, attr, lv, talents = '') => ({
  hero: { level, attributes_level: attr, ...Object.fromEntries([...talents].map((c, i) => ['talent_' + (i + 1), c === '1'])) },
  best: new Map([['sniper_shrapnel', lv[0]], ['sniper_headshot', lv[1]], ['sniper_take_aim', lv[2]], ['sniper_assassinate', lv[3]],
    ['sniper_keen_scope', 1], ['plus_high_five', 1], ['seasonal_dark_carnival_pie', 6]]) });
const fp = (...a) => { const f = feed(...a); return freePoints(f.hero, f.best, sniper); };
assert.deepEqual(fp(1, 0, [0, 0, 0, 0]), { skills: 0, skill: 1, talent: 0 });       // before the first click
assert.equal(fp(7, 0, [3, 1, 1, 1]).skill, 1);                                       // level 7, ult not taken yet
assert.equal(fp(8, 0, [4, 1, 1, 2]).skill, 0);
assert.deepEqual(fp(10, 0, [4, 3, 1, 1]).talent, 1);                                  // level 10 talent open
assert.equal(fp(11, 0, [4, 4, 1, 1], '01').talent, 0);
assert.equal(fp(22, 7, [4, 4, 4, 3], '010101').skill, 0);                             // all 22 points spent

// Centaur pos 3 guide games (STRATZ ids): 5514 Hoof Stomp, 5515 Double Edge, 5516 Retaliate, 5517 Stampede, 5917 a talent
const names = new Map([[5514, 'stomp'], [5515, 'edge'], [5516, 'ret'], [5517, 'stamp']]);
const games = [
  [5514, 5515, 5516, 5516, 5516, 5517, 5516, 5515, 5515, 5515, 5917, 5514, 5517],
  [5514, 5516, 5516, 5515, 5516, 5517, 5516, 5514, 5514, 5514, 5917, 5515, 5517],
  [5514, 5515, 5516, 5516, 5516, 5517, 5516, 5514, 5514, 5514, 5917, 5515, 5517],
  [5514, 5516, 5516, 5516, 5516, 5516, 5517],                                          // 5 Retaliate: mislabeled, dropped
];
const orders = guideOrders(games, names, 'stamp');
assert.equal(orders.length, 3);
assert.equal(orders[0][10], 'stomp');                                                 // talent dropped, so entry 11 is level 11's point
const learn = new Set(['stomp', 'edge', 'ret', 'stamp']);
const at = (level, lv) => nextSkill({ level, best: new Map(Object.entries(lv)), learnable: learn, ult: 'stamp', orders });
assert.deepEqual(at(1, {}), { name: 'stomp', votes: 3, of: 3 });
assert.deepEqual(at(6, { stomp: 1, edge: 1, ret: 3 }), { name: 'stamp', votes: null, of: null });
assert.deepEqual(at(7, { stomp: 1, edge: 1, ret: 3, stamp: 1 }), { name: 'ret', votes: 3, of: 3 });
// off the usual path (Double Edge maxed early): still picks the next thing those games took that's legal now
assert.equal(at(5, { stomp: 1, edge: 3 }).name, 'ret');
// level 3: Retaliate can't go to 2 yet unless level 3 is reached; a level-2 hero with Stomp only gets Edge or Ret
assert.ok(['edge', 'ret'].includes(at(2, { stomp: 1 }).name));

const slots = [{ slot: 0, abilityId: 5909 }, { slot: 1, abilityId: 5917 }, { slot: 2, abilityId: 6137 }, { slot: 3, abilityId: 6617 }];
const rows = [{ abilityId: 5909, matchCount: 21845, winCount: 10650 }, { abilityId: 5917, matchCount: 26880, winCount: 13628 },
  { abilityId: 6137, matchCount: 25764, winCount: 13604 }, { abilityId: 6617, matchCount: 17222, winCount: 10227 }];
const tName = id => ({ 5909: '+4 Health Regen', 5917: '+15 Movement Speed', 6137: '+10 Strength', 6617: '+30% Double Edge Strength Damage' })[id];
assert.equal(talentTip({ hero: { level: 10 }, free: 1, rows, slots, talentName: tName }), 'Level 10 talent: most take +15 Movement Speed (55%).');
assert.equal(talentTip({ hero: { level: 10 }, free: 0, rows, slots, talentName: tName }), null);
// level 15: 59% take Strength, but Double Edge wins 7 points more on 17k games, so say so
assert.match(talentTip({ hero: { level: 15, talent_2: true }, free: 1, rows, slots, talentName: tName }), /\+10 Strength \(60%\)\. \+30% Double Edge Strength Damage wins 7 points more/);
assert.match(talentTip({ hero: { level: 27, talent_1: true, talent_4: true }, free: 1, rows, slots, talentName: tName }), /other level 10/);
console.log('skills ok');
