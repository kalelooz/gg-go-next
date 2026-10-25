import { HEROES } from './heroes.js';
import { ALIASES } from './aliases.js';

// hyphens split words ("Anti-Mage" gives "am"), apostrophes don't ("Nature's" stays one word)
const norm = s => s.toLowerCase().normalize('NFKD').replace(/[-_]/g, ' ').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
const initials = s => norm(s).split(' ').map(w => w[0]).join('');

// Every name a hero answers to, built once at load
const INDEX = HEROES.map(h => {
  const names = new Set([norm(h.name), norm(h.key.replace(/_/g, ' ')), ...(ALIASES[h.key] || []).map(norm)]);
  const inits = norm(h.name).includes(' ') ? initials(h.name) : null;
  return { hero: h, names: [...names], inits };
});

// Higher is better: exact name > exact initials ("pa" is Phantom Assassin, not Pangolier)
// > starts with > a word starts with > partial initials > anywhere in the name
function score(q, e) {
  let best = 0, via = null;
  const hit = (s, n) => { if (s > best) { best = s; via = n; } };
  if (e.inits === q) hit(95, norm(e.hero.name));
  for (const n of e.names) {
    if (n === q) hit(100, n);
    else if (n.startsWith(q)) hit(90 - n.length / 100, n);
    else if (n.split(' ').some(w => w.startsWith(q))) hit(70, n);
    else if (q.length >= 3 && n.includes(q)) hit(50, n);
  }
  if (e.inits && q.length >= 2 && e.inits.startsWith(q)) hit(60, norm(e.hero.name));
  return { best, via };
}

// via is the name that matched, so the list can show "Furion" under Nature's Prophet
export function search(query, exclude = new Set(), limit = 6) {
  const q = norm(query);
  if (!q) return [];
  return INDEX.map(e => ({ hero: e.hero, ...score(q, e) }))
    .filter(r => r.best > 0 && !exclude.has(r.hero.id))
    .sort((a, b) => b.best - a.best || a.hero.name.localeCompare(b.hero.name))
    .slice(0, limit)
    .map(({ hero, via }) => ({ hero, via: via !== norm(hero.name) ? via : null }));
}

export const heroById = Object.fromEntries(HEROES.map(h => [h.id, h]));
