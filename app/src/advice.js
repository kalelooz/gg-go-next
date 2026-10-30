// Short advice lines from our own hero's state.
// Each rule returns one sentence or null. Matchup items (sentries, Vessel) live in matchup-rules.js instead.

// Average cumulative deaths by minute in STRATZ pub games
// shortcut: one curve per role, not per hero; query STRATZ per hero if these feel off for some heroes
const DEATH_MIN = [10, 15, 20, 25, 30, 35];
const DEATH_AVG = { 1: [1.2, 2.0, 2.7, 3.5, 4.3, 5.1], 2: [0.9, 1.8, 2.9, 3.9, 4.9, 6.0],
  3: [1.4, 2.5, 3.6, 4.7, 5.8, 6.9], 4: [1.9, 3.5, 5.0, 6.6, 8.1, 9.7], 5: [1.9, 3.5, 5.0, 6.6, 8.1, 9.7] };

// straight line between the table's minutes, carried on past 35:00 at the last slope
export function avgDeaths(pos, minute) {
  const a = DEATH_AVG[pos] || DEATH_AVG[4];
  if (minute <= DEATH_MIN[0]) return a[0] * minute / DEATH_MIN[0];
  let i = DEATH_MIN.findIndex(m => m >= minute);
  if (i === -1) i = DEATH_MIN.length - 1;
  const f = (minute - DEATH_MIN[i - 1]) / (DEATH_MIN[i] - DEATH_MIN[i - 1]);
  return a[i - 1] + f * (a[i] - a[i - 1]);
}

// first save item your hero and role actually builds, from the research's list
export const SAVE_ITEMS = ['item_black_king_bar', 'item_sphere', 'item_ghost', 'item_cyclone', 'item_force_staff', 'item_glimmer_cape', 'item_aeon_disk'];

// deaths at or over max(3, 1.5 x usual for the role at this minute)
export function deathTip({ deaths, minute, pos, owned, buys }) {
  if (deaths == null || minute < 5) return null;
  const usual = avgDeaths(pos, minute);
  if (deaths < Math.max(3, Math.ceil(1.5 * usual))) return null;
  const times = deaths / Math.max(usual, 0.5);
  let say = `${deaths} deaths, ${times >= 2 ? Math.round(times) + 'x' : 'well over'} the usual. Stay near your towers and move with your team.`;
  const save = SAVE_ITEMS.some(i => owned.has(i)) ? null : SAVE_ITEMS.find(buys);
  if (save) say += ` Save item: ${SAVE_NAME[save]}.`;
  return say;
}
const SAVE_NAME = { item_black_king_bar: 'Black King Bar', item_sphere: "Linken's Sphere", item_ghost: 'Ghost Scepter',
  item_cyclone: "Eul's", item_force_staff: 'Force Staff', item_glimmer_cape: 'Glimmer Cape', item_aeon_disk: 'Aeon Disk' };

// cores past 30:00 (carry 35:00) with buyback ready but not enough gold for it
export function buybackTip({ pos, minute, bb }) {
  if (!pos || pos > 3 || minute < (pos === 1 ? 35 : 30) || bb?.state !== 'short') return null;
  return `Keep gold for buyback: ${bb.short} short.`;
}

// rows: STRATZ itemFullPurchase for our hero and role. Most finished item stands in for the game count,
// since the query doesn't return one; the median BKB minute is weighted by games.
export function bkbTiming(rows, bkbId) {
  const games = new Map();
  for (const r of rows) games.set(r.itemId, (games.get(r.itemId) || 0) + r.matchCount);
  const bkb = rows.filter(r => r.itemId === bkbId).sort((a, b) => a.time - b.time);
  const total = games.get(bkbId) || 0;
  if (!total || total < 0.4 * Math.max(...games.values())) return null;
  let n = 0;
  for (const r of bkb) if ((n += r.matchCount) >= total / 2) return r.time;
  return null;
}
// heroes that skip BKB even as cores
export const BKB_SKIP = new Set(['juggernaut', 'life_stealer', 'pangolier', 'slark', 'phantom_lancer', 'spectre']);

export function bkbTip({ pos, minute, heroKey, heroName, median, owned }) {
  if (!pos || pos > 3 || median == null || BKB_SKIP.has(heroKey) || owned.has('item_black_king_bar')) return null;
  if (minute < median) return null;
  return `BKB is late: most ${heroName} players have it by ${median}:00.`;
}
