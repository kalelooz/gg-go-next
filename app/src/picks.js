// Suggestion scoring, kept free of UI and network so it can be tested.
// vsOf(enemyId) -> Map(candidateId -> candidate's win-rate advantage vs that enemy, in points)
// withOf(allyId) -> Map(candidateId -> win-rate gain when paired with that ally, in points)
// Either can return undefined while that hero's data is still loading.
export const ALLY_WEIGHT = 0.5;

export function suggest({ candidates, enemies, allies, taken, vsOf, withOf, limit = 5 }) {
  const out = [];
  for (const c of candidates) {
    if (taken.has(c)) continue;
    const vs = enemies.map(e => ({ id: e, v: vsOf(e)?.get(c) })).filter(x => x.v != null);
    const withs = allies.map(a => ({ id: a, v: withOf(a)?.get(c) })).filter(x => x.v != null);
    const vsSum = vs.reduce((s, x) => s + x.v, 0);
    const withSum = withs.reduce((s, x) => s + x.v, 0);
    out.push({ id: c, score: vsSum + ALLY_WEIGHT * withSum, vs: vs.sort((a, b) => b.v - a.v), withSum });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}

// S to F like STRATZ+, from the average edge per enemy the pick has data for.
// Our own cut-offs: a pair edge is usually within ±5 points, so +2 on average is a strong counter.
const GRADES = [[2, 'S'], [1, 'A'], [0.3, 'B'], [-0.3, 'C'], [-1, 'D']];
export function grade(pick) {
  if (!pick.vs.length) return null;
  const avg = pick.vs.reduce((s, x) => s + x.v, 0) / pick.vs.length;
  return (GRADES.find(([min]) => avg >= min) || [0, 'F'])[1];
}

// How many heroes on a side fill each job, from the hero roles list
export const SHAPE = [['Disabler', 'Stuns'], ['Initiator', 'Initiation'], ['Durable', 'Frontline'], ['Escape', 'Escape'], ['Pusher', 'Push']];
export const teamShape = heroes => SHAPE.map(([role, label]) => ({ role, label, n: heroes.filter(h => h.roles.includes(role)).length }));

// Your picks' summed edge over the enemy picks. null until at least one pair has data.
export function draftEdge(allies, enemies, vsOf) {
  let sum = 0, pairs = 0;
  for (const e of enemies) for (const a of allies) {
    const v = vsOf(e)?.get(a);
    if (v != null) { sum += v; pairs++; }
  }
  return pairs ? sum : null;
}

// byPos: { 1: [{ heroId, matchCount }], ..., 5: [...] } from STRATZ winWeek per position.
// A hero belongs to a position if at least `share` of its games are played there.
export function rolePools(byPos, share = 0.15) {
  const games = new Map();
  for (let n = 1; n <= 5; n++) for (const x of byPos[n] || []) {
    const g = games.get(x.heroId) || [0, 0, 0, 0, 0, 0];
    g[n] += x.matchCount;
    games.set(x.heroId, g);
  }
  const pools = {};
  for (let n = 1; n <= 5; n++) {
    pools[n] = [...games].filter(([, g]) => { const t = g.reduce((a, b) => a + b, 0); return t && g[n] / t >= share; }).map(([id]) => id);
  }
  return pools;
}

// Heroes you've played enough to trust your own results on them
export function myPool(playerHeroes, minGames = 30) {
  return playerHeroes.filter(h => h.games >= minGames).map(h => Number(h.hero_id));
}
