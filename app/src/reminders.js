// Voice limits for advice lines (tips, level-up, matchup hints, farming), so they don't nag.
// Rune and Roshan calls don't go through this. The text stays on screen either way; only the voice is capped.
// A line speaks as soon as it applies, then at most `max` times a game: again only after `every` game seconds,
// or once `value` (deaths) has grown by `step`. Lines with neither speak once.
export const POLICY = {
  'tip-deaths': { max: 3, step: 3 },
  'tip-buyback': { max: 2, every: 600 },
  'tip-bkb': { max: 2, every: 480 },
  'farm-ready': { max: 1 },
  'farm-up': { max: 4, every: 300 },
  'farm-stack': { max: 5, every: 120 },
};
// no two advice lines within this many game seconds of each other; a held-back line tries again later
export const GAP = 45;

export const newReminders = () => ({ by: new Map(), last: -Infinity });

// true when the line may speak now, and records that it did
export function mayRemind(r, id, t, value = 0, p = POLICY[id] || { max: 1 }) {
  const s = r.by.get(id) || { n: 0, at: -Infinity, value: 0 };
  if (s.n >= p.max || t - r.last < GAP) return false;
  if (s.n && !(p.every && t - s.at >= p.every) && !(p.step && value - s.value >= p.step)) return false;
  r.by.set(id, { n: s.n + 1, at: t, value });
  r.last = t;
  return true;
}
