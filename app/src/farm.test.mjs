import assert from 'node:assert/strict';
import { ANCIENT, CAMPS, ourCamps, campsUp, coreItem, readyForAncients, farmTip } from './farm.js';

assert.ok(ANCIENT.test('npc_dota_neutral_prowler_acolyte'));
assert.ok(ANCIENT.test('npc_dota_neutral_ancient_frog_mage'));
assert.ok(!ANCIENT.test('npc_dota_neutral_froglet'));            // small flooded camp, not ancients
assert.ok(!ANCIENT.test('npc_dota_neutral_ogre_mauler'));
assert.deepEqual(ourCamps('radiant').map(c => c.x), [-5005, 117]);
assert.deepEqual(ourCamps('dire').map(c => c.x), [4216, -816]);

// Radiant triangle prowlers from a real log (visionrange 800), plus a lane creep and a 0-vision leftover
const camps = ourCamps('radiant');
const mm = { o1: { unitname: 'npc_dota_neutral_prowler_acolyte', team: 4, xpos: -5005, ypos: -94, visionrange: 800 },
  o2: { unitname: 'npc_dota_neutral_black_drake', team: 4, xpos: 130, ypos: -5100, visionrange: 0 },
  o3: { unitname: 'npc_dota_creep_goodguys_melee', team: 2, xpos: -5000, ypos: -90, visionrange: 800 } };
assert.deepEqual([...campsUp(mm, camps)], [0]);

// Battle Fury (145, 3900g) at ~14 min in 70 of 100 games beats BKB (116) later; Treads are too cheap
const cost = id => ({ 145: 3900, 116: 4050, 63: 1400 })[id];
const rows = [{ itemId: 63, time: 6, matchCount: 100 }, { itemId: 145, time: 13, matchCount: 30 }, { itemId: 145, time: 15, matchCount: 40 },
  { itemId: 116, time: 22, matchCount: 50 }];
assert.equal(coreItem(rows, cost), 145);
assert.equal(coreItem([{ itemId: 63, time: 6, matchCount: 100 }], cost), null);

assert.ok(readyForAncients({ minute: 14, level: 9, ownedIds: new Set([145]), core: 145 }));
assert.ok(!readyForAncients({ minute: 14, level: 9, ownedIds: new Set(), core: 145 }));
assert.ok(readyForAncients({ minute: 14, level: 12, ownedIds: new Set(), core: null }));
assert.ok(!readyForAncients({ minute: 6, level: 12, ownedIds: new Set([145]), core: 145 }));

const base = { pos: 1, minute: 15, second: 20, ready: true, readySince: 0, now: 120000, me: { x: -4000, y: -500 },
  camps, up: new Set([0]), enemies: [], coreName: 'Battle Fury' };
assert.equal(farmTip(base).id, 'up');
assert.equal(farmTip({ ...base, second: 46, me: { x: -5100, y: -200 } }).id, 'stack');
assert.equal(farmTip({ ...base, enemies: [{ x: -5200, y: 0 }] }), null);           // enemy at the camp
assert.equal(farmTip({ ...base, up: new Set() }), null);                           // ancients not seen, ready line over
assert.match(farmTip({ ...base, up: new Set(), now: 30000 }).text, /Battle Fury/);  // first minute after getting ready
assert.equal(farmTip({ ...base, pos: 2 }), null);
assert.equal(farmTip({ ...base, minute: 36 }), null);
console.log('farm ok');
