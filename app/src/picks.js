// Suggestion scoring, kept free of UI and network so it can be tested.
// vsOf(enemyId) -> Map(candidateId -> candidate's win-rate advantage vs that enemy, in points)
// withOf(allyId) -> Map(candidateId -> win-rate gain when paired with that ally, in points)
// Either can return undefined while that hero's data is still loading.
// Used by draft.html, which fetches the STRATZ numbers through main.rs.
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

// --- positions ---
// byPos rows may carry winCount. Returns heroId -> { games: [_, p1..p5], wins: [...] }
export function heroPositions(byPos) {
  const out = {};
  for (let n = 1; n <= 5; n++) for (const x of byPos[n] || []) {
    const h = out[x.heroId] ||= { games: [0, 0, 0, 0, 0, 0], wins: [0, 0, 0, 0, 0, 0] };
    h.games[n] += x.matchCount; h.wins[n] += x.winCount || 0;
  }
  return out;
}
export const posShare = (hp, n) => { const t = hp ? hp.games.reduce((a, b) => a + b, 0) : 0; return t ? hp.games[n] / t : 0.2; };

// Give each hero a different position from `free`, keeping `fixed` ones (set by hand) where they are.
// Picks the set of positions that best fits what each hero usually plays (highest product of shares).
export function assignPositions(heroIds, free, shareOf, fixed = {}) {
  const out = {};
  for (const h of heroIds) if (free.includes(fixed[h])) out[h] = fixed[h];
  const open = free.filter(p => !Object.values(out).includes(p));
  const todo = heroIds.filter(h => !(h in out));
  let best = null, bestScore = -Infinity;
  const walk = (i, used, acc, score) => {
    if (i === todo.length) { if (score > bestScore) { bestScore = score; best = { ...acc }; } return; }
    for (const p of open) if (!used.has(p)) {
      used.add(p); acc[todo[i]] = p;
      walk(i + 1, used, acc, score + Math.log(shareOf(todo[i], p) + 1e-3));
      used.delete(p);
    }
    delete acc[todo[i]];
  };
  // more heroes than open positions can't happen in a real draft; leave them unassigned
  if (todo.length <= open.length) walk(0, new Set(), {}, 0);
  return { ...out, ...(best || {}) };
}

// Who lanes against whom (checked on STRATZ lane data: a Pos 4 Hoodwink met enemy Pos 1 and 5 in 78% of lanes)
export const LANE_VS = { 1: [3, 4], 2: [2], 3: [1, 5], 4: [1, 5], 5: [3, 4] };
export const LANE_PARTNER = { 1: 5, 2: null, 3: 4, 4: 3, 5: 1 };

// rows: STRATZ laneOutcome rows for one hero at one position, any number of weeks.
// A lane counts as won or lost whether or not it was a stomp; draws count for neither.
// Returns the hero's own average lane result and its result against (or with) each other hero, in points of
// (won lanes - lost lanes) per 100 lanes.
export function laneStats(rows) {
  const by = new Map(); let n = 0, net = 0;
  for (const r of rows) {
    const w = r.winCount + r.stompWinCount, l = r.lossCount + r.stompLossCount;
    const a = by.get(r.heroId2) || { n: 0, net: 0 };
    a.n += r.matchCount; a.net += w - l; by.set(r.heroId2, a);
    n += r.matchCount; net += w - l;
  }
  const base = n ? (100 * net) / n : 0;
  return { base, by: new Map([...by].map(([h, a]) => [h, { n: a.n, rate: (100 * a.net) / a.n }])) };
}

// Lane edge for one candidate: how much better than its usual lane it does against these laners
// (and with this partner, at half weight like the game score's ally part). Pairs under minLanes are left out.
export function laneScore(vs, withs, laners, partner, minLanes = 80) {
  const edge = (st, id) => { const x = st?.by.get(id); return x && x.n >= minLanes ? { id, v: x.rate - st.base, n: x.n } : null; };
  const opp = laners.map(id => edge(vs, id) || { id, v: null, n: vs?.by.get(id)?.n || 0 });
  const mate = partner ? edge(withs, partner) || { id: partner, v: null, n: withs?.by.get(partner)?.n || 0 } : null;
  const known = opp.filter(x => x.v != null);
  const score = known.length || mate?.v != null ? known.reduce((s, x) => s + x.v, 0) + ALLY_WEIGHT * (mate?.v || 0) : null;
  return { score, vs: opp, with: mate };
}

// Heroes you've played enough to trust your own results on them
export function myPool(playerHeroes, minGames = 30) {
  return playerHeroes.filter(h => h.games >= minGames).map(h => Number(h.hero_id));
}
