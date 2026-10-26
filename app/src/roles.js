// What each role sees and hears, from docs/research/SUMMARY.md (role table). Positions 1-5.
export const ROLE_NAMES = { 1: 'Carry', 2: 'Mid', 3: 'Offlane', 4: 'Soft support', 5: 'Hard support' };

// One Show and one Voice switch per part per role, and the Customize window shows exactly these:
// no other rule quietly hides or mutes anything. Each string is the default for Carry, Mid, Offlane,
// Pos 4, Pos 5 (1 = on), from the role table in docs/research/SUMMARY.md; you change them in Customize.
// [id, label in Customize, can it talk]. Aegis goes with Roshan.
export const ROLE_PARTS = [
  ['water', 'Water runes', true], ['power', 'Power rune', true], ['bounty', 'Bounty runes', true],
  ['wisdom', 'Wisdom shrines', true], ['lotus', 'Lotus pools', true], ['stack', 'Stack camps', true],
  ['roshan', 'Roshan and Aegis', true], ['tormentor', 'Tormentor', false], ['glyphs', 'Glyphs', false],
  ['wards', 'Wards', false], ['items', 'Items now', false], ['hints', 'Against their heroes', true],
  ['levelup', 'Level up', true], ['tips', 'Tips', true],
];
const DEFAULTS = {
  show: { water: '01010', power: '01011', wisdom: '01111', lotus: '01111', stack: '00011', wards: '01011' },
  voice: { water: '01010', power: '01010', bounty: '00011', wisdom: '00111', lotus: '00110', stack: '00011', roshan: '11111' },
};
const talks = part => ROLE_PARTS.some(([id, , v]) => id === part && v);
export const roleKey = (pos, part, kind) => `role${pos}_${part}_${kind}`;
export function roleDefault(pos, part, kind) {
  if (kind === 'voice' && !talks(part)) return false;
  return (DEFAULTS[kind][part] ?? '11111')[pos - 1] === '1';
}
// What the overlay does right now. With no role known yet, everything shows and talks.
export function partOn(settings, pos, part, kind) {
  if (kind === 'voice' && !talks(part)) return false;
  if (!pos) return true;
  return settings[roleKey(pos, part, kind)] ?? roleDefault(pos, part, kind);
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
