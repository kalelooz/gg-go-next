// What each role sees and hears, from docs/research/SUMMARY.md (role table). Positions 1-5.
export const ROLE_NAMES = { 1: 'Carry', 2: 'Mid', 3: 'Offlane', 4: 'Soft support', 5: 'Hard support' };

// show, dim (faint, never gold-loud) or hide, per position 1..5. Parts not listed always show.
const VIEW = {
  water:  ['hide', 'show', 'hide', 'show', 'hide'],
  power:  ['hide', 'show', 'dim', 'show', 'show'],
  wisdom: ['dim', 'dim', 'show', 'show', 'show'],
  lotus:  ['dim', 'show', 'show', 'show', 'show'],
  stack:  ['hide', 'dim', 'dim', 'show', 'show'],
  wards:  ['hide', 'show', 'dim', 'show', 'show'],
};
export const roleView = (part, pos) => (pos ? VIEW[part]?.[pos - 1] : null) ?? 'show';

// Who gets a voice call. With no role known, everything talks, as before roles existed.
// Power runes matter to mids until 12:00 (all game with a Bottle) and to pos 4 until 12:00.
export function voiced(kind, pos, t, hasBottle = false) {
  if (!pos) return true;
  switch (kind) {
    case 'power': return (pos === 2 && (t < 720 || hasBottle)) || (pos === 4 && t < 720);
    case 'water': return pos === 2 || pos === 4;
    case 'bounty': return t < 60 || pos === 4 || pos === 5;   // everyone grabs one at the horn
    case 'wisdom': return pos >= 3;
    case 'lotus': return pos === 3 || pos === 4;
    case 'stack': return pos >= 4;
    default: return true;
  }
}

// Which lane a map spot is in. Mid runs corner to corner; top lane is the upper-left half, bottom the
// lower-right. Spots deep in either base count as no lane.
export function laneAt(x, y) {
  if ((x < -4500 && y < -4500) || (x > 4500 && y > 4500)) return null;
  const d = y - x;
  return Math.abs(d) < 2200 ? 'mid' : d > 0 ? 'top' : 'bot';
}

// Auto role: the lane we stood in most between 1:30 and 3:30, then STRATZ's split of the hero's games
// (counts by position) breaks the tie between the two roles that share it. Before a lane is known, the
// hero's most played position.
// shortcut: roaming supports can be read as the wrong lane; the tray's Role menu overrides it.
export function guessRole(split, lanes, team) {
  const best = ps => (split ? ps.reduce((a, b) => ((split[b] || 0) > (split[a] || 0) ? b : a)) : null);
  const counts = {};
  for (const l of lanes) if (l) counts[l] = (counts[l] || 0) + 1;
  const lane = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  if (!lane) return best([1, 2, 3, 4, 5]);
  if (lane === 'mid') return 2;
  const safe = (team === 'radiant') === (lane === 'bot');
  return (safe ? best([1, 5]) : best([3, 4])) ?? (safe ? 1 : 3);
}
