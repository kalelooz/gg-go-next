import assert from 'node:assert/strict';
import { avgDeaths, deathTip, buybackTip, bkbTiming, bkbTip } from './advice.js';

assert.equal(avgDeaths(1, 20), 2.7);
assert.ok(Math.abs(avgDeaths(4, 12.5) - 2.7) < 1e-9);       // halfway between 1.9 and 3.5
assert.ok(avgDeaths(2, 40) > 6.0);                          // keeps rising after 35:00

const none = new Set(), buys = i => i === 'item_glimmer_cape';
// support at 20:00 averages 5 deaths: 8 is over 1.5x, 7 isn't
assert.equal(deathTip({ deaths: 7, minute: 20, pos: 4, owned: none, buys }), null);
assert.match(deathTip({ deaths: 8, minute: 20, pos: 4, owned: none, buys }), /Glimmer Cape/);
assert.doesNotMatch(deathTip({ deaths: 8, minute: 20, pos: 4, owned: new Set(['item_force_staff']), buys }), /Save item/);
// never under 3 deaths, even early when the average is tiny
assert.equal(deathTip({ deaths: 2, minute: 8, pos: 2, owned: none, buys }), null);
assert.match(deathTip({ deaths: 3, minute: 8, pos: 2, owned: none, buys }), /^3 deaths/);

assert.equal(buybackTip({ pos: 1, minute: 33, bb: { state: 'short', short: 300 } }), null);   // carry waits to 35:00
assert.match(buybackTip({ pos: 2, minute: 31, bb: { state: 'short', short: 300 } }), /300 short/);
assert.equal(buybackTip({ pos: 4, minute: 40, bb: { state: 'short', short: 300 } }), null);   // cores only
assert.equal(buybackTip({ pos: 3, minute: 40, bb: { state: 'cd', cd: 100 } }), null);

// BKB (116) in 60 of 100 games, half of them done by 24:00
const rows = [{ itemId: 1, time: 3, matchCount: 100 }, { itemId: 116, time: 20, matchCount: 20 },
  { itemId: 116, time: 24, matchCount: 15 }, { itemId: 116, time: 30, matchCount: 25 }];
assert.equal(bkbTiming(rows, 116), 24);
assert.equal(bkbTiming([...rows.slice(0, 1), { itemId: 116, time: 20, matchCount: 30 }], 116), null);   // under 40%
const b = { pos: 1, minute: 25, heroKey: 'sven', heroName: 'Sven', median: 24, owned: none };
assert.match(bkbTip(b), /by 24:00/);
assert.equal(bkbTip({ ...b, minute: 23 }), null);
assert.equal(bkbTip({ ...b, heroKey: 'slark' }), null);
assert.equal(bkbTip({ ...b, owned: new Set(['item_black_king_bar']) }), null);
assert.equal(bkbTip({ ...b, pos: 5 }), null);
console.log('advice ok');
