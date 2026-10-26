// Carry farming: when you're ready for ancients, when ancients near you are up, and the :51 ancient stack.
// Farm order from docs/research/carry.md; camp spots and creep names from our own game logs (2026-10-26).

// Ancient creeps as the game feed's minimap names them; the flooded frog camp turns into these around 20:00
export const ANCIENT = /^npc_dota_neutral_(black_dragon|black_drake|granite_golem|rock_golem|big_thunder_lizard|small_thunder_lizard|prowler_acolyte|prowler_shaman|ice_shaman|frostbitten_golem|ancient_frog|ancient_frog_mage)$/;
// centers of the camps where ancients were seen in our logs (7.41 map): each side's triangle, then the
// flooded camp in each safe-lane jungle. The river runs top-left to bottom-right, so Radiant's half is x + y < 0.
export const CAMPS = [
  { x: -5005, y: -94, name: 'triangle ancients' }, { x: 117, y: -5167, name: 'flooded ancients' },
  { x: 4216, y: 8, name: 'triangle ancients' }, { x: -816, y: 4850, name: 'flooded ancients' },
];
export const ourCamps = team => CAMPS.filter(c => (team === 'radiant') === (c.x + c.y < 0));
const near = (a, b, r) => Math.hypot(a.x - b.x, a.y - b.y) <= r;

// camps with a live ancient on the minimap right now. Neutrals only show while we have vision of them,
// so "not seen" means unknown, never dead. Live units report a vision range; 0 ones are left out.
export function campsUp(minimap, camps) {
  const up = new Set();
  for (const u of Object.values(minimap || {})) {
    if (u?.team !== 4 || !u.visionrange || !ANCIENT.test(u.unitname || '')) continue;
    camps.forEach((c, i) => { if (near(c, { x: u.xpos, y: u.ypos }, 900)) up.add(i); });
  }
  return up;
}

// The hero's first big farming item: bought in 30%+ of games (most-bought item stands in for the game count),
// costs 2,000+, earliest median finish minute. rows: STRATZ itemFullPurchase; cost: itemId -> gold.
export function coreItem(rows, cost) {
  const by = new Map();
  for (const r of rows) {
    if ((cost(r.itemId) || 0) < 2000) continue;
    const s = by.get(r.itemId) || { id: r.itemId, games: 0, mins: [] };
    s.games += r.matchCount; s.mins.push([r.time, r.matchCount]);
    by.set(r.itemId, s);
  }
  const all = new Map();
  for (const r of rows) all.set(r.itemId, (all.get(r.itemId) || 0) + r.matchCount);
  const most = Math.max(0, ...all.values());
  const median = s => { s.mins.sort((a, b) => a[0] - b[0]); let n = 0; for (const [t, c] of s.mins) if ((n += c) >= s.games / 2) return t; };
  const picks = [...by.values()].filter(s => s.games >= 0.3 * most).map(s => ({ id: s.id, at: median(s) }));
  return picks.sort((a, b) => a.at - b.at)[0]?.id ?? null;
}

// ready for ancients: your hero's first core item, or level 12 when we don't know it (no STRATZ token)
export const readyForAncients = ({ minute, level, ownedIds, core }) =>
  minute >= 8 && ((core != null && ownedIds.has(core)) || level >= 12);

// One line or null. me: {x, y}; enemies: visible enemy heroes [{x, y}]; second: seconds into the minute.
// Carry only, 8:00 to 35:00. Stack beats "up near you" beats "you're ready".
export function farmTip({ pos, minute, second, ready, readySince, now, me, camps, up, enemies, coreName }) {
  if (pos !== 1 || minute < 8 || minute >= 35 || !ready) return null;
  const safe = c => !enemies.some(e => near(e, c, 2500));
  for (const [i, c] of camps.entries()) {
    if (!up.has(i) || !safe(c)) continue;
    // ancients stack later than other camps: pull at :51 (docs/research/pulls-stacks.md)
    if (near(me, c, 1500) && second >= 44 && second < 51)
      return { id: 'stack', clip: 'farm-stack', text: `Stack the ${c.name}: hit them at :51 and walk away.` };
  }
  for (const [i, c] of camps.entries()) {
    if (up.has(i) && safe(c) && near(me, c, 3500))
      return { id: 'up', clip: 'farm-up', text: `${c.name[0].toUpperCase() + c.name.slice(1)} are up near you. Clear them between waves.` };
  }
  // the "ready" line stays a minute, then only the camp lines show
  if (now - readySince < 60000)
    return { id: 'ready', clip: 'farm-ready', text: `You can farm ancients now${coreName ? ` with your ${coreName}` : ''}. Waves first, then the ancients near that lane.` };
  return null;
}
