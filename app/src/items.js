// What players on your hero finish around this minute, from STRATZ heroStats.itemFullPurchase.
// Rows are { itemId, time (minute it was finished), matchCount, winCount }, one per item per minute.
// Used by index.html's items panel, which fetches the rows from STRATZ through main.rs.
export const WINDOW = 5;

// skip: item ids to leave out (ones you already own, lotus pickups)
export function itemsNow(rows, minute, skip, n = 3) {
  const by = new Map();
  for (const r of rows) {
    if (r.time < minute || r.time >= minute + WINDOW || skip.has(r.itemId)) continue;
    const s = by.get(r.itemId) || { id: r.itemId, games: 0, wins: 0 };
    s.games += r.matchCount; s.wins += r.winCount;
    by.set(r.itemId, s);
  }
  return [...by.values()].sort((a, b) => b.games - a.games).slice(0, n).map(s => ({ id: s.id, win: s.wins / s.games }));
}
