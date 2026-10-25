import assert from 'node:assert/strict';
import { suggest, myPool, rolePools, grade, teamShape, draftEdge } from './picks.js';

// Lina: 70% mid, 25% pos 4. Invoker: 95% mid. CM: all pos 5
const pools = rolePools({
  2: [{ heroId: 25, matchCount: 70 }, { heroId: 74, matchCount: 95 }],
  4: [{ heroId: 25, matchCount: 25 }, { heroId: 74, matchCount: 5 }],
  1: [{ heroId: 25, matchCount: 5 }],
  5: [{ heroId: 5, matchCount: 40 }],
});
assert.deepEqual(pools[2].sort(), [25, 74]);
assert.deepEqual(pools[4], [25]);
assert.deepEqual(pools[5], [5]);
assert.deepEqual(pools[1], []);
assert.deepEqual(pools[3], []);

// enemy 59 (Huskar): candidate 68 (AA) is +5, 31 (Lich) is -1
const vs = { 59: new Map([[68, 5], [31, -1], [7, 2]]), 12: new Map([[68, 1], [7, 4]]) };
const wi = { 1: new Map([[31, 6]]) };
const r = suggest({
  candidates: [68, 31, 7, 1],
  enemies: [59, 12],
  allies: [1],
  taken: new Set([1]),
  vsOf: id => vs[id],
  withOf: id => wi[id],
});
assert.deepEqual(r.map(x => x.id), [68, 7, 31]);
assert.equal(r[0].score, 6);
assert.equal(r[0].vs[0].id, 59);
assert.equal(r[2].score, -1 + 3);
// data still loading for an enemy: skipped, not counted as zero-advantage noise
const loading = suggest({ candidates: [68], enemies: [59, 99], allies: [], taken: new Set(), vsOf: id => vs[id], withOf: () => undefined });
assert.equal(loading[0].vs.length, 1);
assert.deepEqual(myPool([{ hero_id: '105', games: 334 }, { hero_id: '2', games: 3 }]), [105]);
// AA averages +3 over two enemies, Lich -1 over one
assert.equal(grade(r[0]), 'S');
assert.equal(grade({ vs: [{ v: -1 }] }), 'D');
assert.equal(grade({ vs: [{ v: 0.5 }, { v: 0.3 }] }), 'B');
assert.equal(grade({ vs: [{ v: -4 }] }), 'F');
assert.equal(grade({ vs: [] }), null);
const shape = teamShape([{ roles: ['Initiator', 'Disabler'] }, { roles: ['Disabler', 'Durable'] }]);
assert.deepEqual(shape.map(s => s.n), [2, 1, 1, 0, 0]);
// ally 68 vs enemies 59 (+5) and 12 (+1); ally 31 vs 59 (-1); nothing for 12 vs 31
assert.equal(draftEdge([68, 31], [59, 12], id => vs[id]), 5);
assert.equal(draftEdge([1], [59], id => vs[id]), null);
console.log('picks ok');
