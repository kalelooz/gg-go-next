import assert from 'node:assert/strict';
import { suggest, myPool, rolePools, grade, teamShape, draftEdge, heroPositions, posShare, assignPositions, laneStats, laneScore, LANE_VS, LANE_PARTNER } from './picks.js';

// positions: Invoker is a mid, Pudge mostly 4 then 3, Lion 4/5
{
  const hp = heroPositions({
    2: [{ heroId: 74, matchCount: 900, winCount: 450 }, { heroId: 14, matchCount: 50, winCount: 20 }],
    3: [{ heroId: 14, matchCount: 300, winCount: 160 }],
    4: [{ heroId: 14, matchCount: 600, winCount: 290 }, { heroId: 26, matchCount: 500, winCount: 250 }],
    5: [{ heroId: 26, matchCount: 400, winCount: 210 }],
  });
  assert.equal(posShare(hp[74], 2), 1);
  assert.equal(posShare(hp[14], 4), 600 / 950);
  assert.equal(posShare(undefined, 3), 0.2);
  const share = (h, p) => posShare(hp[h], p);
  assert.deepEqual(assignPositions([74, 14, 26], [1, 2, 3, 4, 5], share), { 74: 2, 14: 4, 26: 5 });
  // Pudge set to 3 by hand stays there, Lion still takes 4 (better than 5 by a little)
  assert.deepEqual(assignPositions([74, 14, 26], [1, 2, 3, 4, 5], share, { 14: 3 }), { 74: 2, 14: 3, 26: 4 });
  // you're the 4, so your team's Pudge goes to 3 and Lion to 5
  assert.deepEqual(assignPositions([14, 26], [1, 2, 3, 5], share), { 14: 3, 26: 5 });
  // a hand-set position that isn't free (it's yours) is ignored
  assert.deepEqual(assignPositions([14], [1, 2, 3, 5], share, { 14: 4 }), { 14: 3 });
  assert.deepEqual(LANE_VS[4], [1, 5]);
  assert.equal(LANE_PARTNER[4], 3);
}
// lane: Hoodwink at 4 vs Necrophos, the real STRATZ row (32 + 3 stomp wins, 82 + 24 stomp losses of 207)
{
  const row = (heroId2, matchCount, winCount, stompWinCount, lossCount, stompLossCount) => ({ heroId2, matchCount, winCount, stompWinCount, lossCount, stompLossCount });
  const vs = laneStats([row(36, 207, 32, 3, 82, 24), row(41, 300, 120, 30, 90, 10), row(36, 100, 20, 0, 40, 0)]);
  assert.equal(vs.by.get(36).n, 307);
  assert.equal(vs.by.get(36).rate, 100 * (35 - 106 + 20 - 40) / 307);
  assert.equal(vs.base, 100 * (35 - 106 + 150 - 100 + 20 - 40) / 607);
  const withs = laneStats([row(129, 200, 90, 10, 60, 0)]);
  const s = laneScore(vs, withs, [36, 41, 8], 129);
  assert.equal(s.vs[0].v, vs.by.get(36).rate - vs.base);
  assert.equal(s.vs[2].v, null);                               // no lanes vs hero 8
  assert.equal(s.with.v, 0);                                   // the partner is the only "with" row, so it's the baseline
  assert.equal(s.score, s.vs[0].v + s.vs[1].v);
  assert.equal(laneScore(vs, withs, [8], null).score, null);   // nothing known yet
  assert.equal(laneScore(vs, null, [36], null, 400).vs[0].v, null);   // under minLanes
}

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
