// Tests for items.js. npm test runs every test file with plain node; a failed assert stops the run.
import assert from 'node:assert/strict';
import { itemsNow } from './items.js';

const rows = [
  { itemId: 1, time: 15, matchCount: 100, winCount: 60 },
  { itemId: 1, time: 17, matchCount: 100, winCount: 40 },
  { itemId: 2, time: 16, matchCount: 150, winCount: 90 },
  { itemId: 3, time: 19, matchCount: 120, winCount: 60 },
  { itemId: 3, time: 20, matchCount: 900, winCount: 900 },   // minute 20 is outside 15-19
  { itemId: 4, time: 14, matchCount: 900, winCount: 900 },   // and 14 is before it
];
assert.deepEqual(itemsNow(rows, 15, new Set()), [{ id: 1, win: 0.5 }, { id: 2, win: 0.6 }, { id: 3, win: 0.5 }]);
assert.deepEqual(itemsNow(rows, 15, new Set([1]), 2), [{ id: 2, win: 0.6 }, { id: 3, win: 0.5 }]);
assert.deepEqual(itemsNow(rows, 40, new Set()), []);
console.log('items ok');
