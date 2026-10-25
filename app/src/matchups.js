// Matchup item hints: which of RULES fit this game right now.
// enemies: Set of npc hero names we know are on the other team (draft popup entries, minimap sightings)
// owned: Set of our item names ("item_bkb"...). buys(item): our hero and role finish that item often
// enough to count (from STRATZ). Strongest rules first, so the panel can show just the top ones.
import { RULES } from './matchup-rules.js';

const SURE = { strong: 0, good: 1 };

export function matchupHints({ hero, pos, minute, enemies, owned, buys }, rules = RULES) {
  const out = [];
  for (const r of rules) {
    if (r.hero !== '*' && r.hero !== hero) continue;
    if (pos && !r.roles.includes('pos' + pos)) continue;
    if (minute < r.from || !r.say) continue;
    const enemy = r.enemy.find(e => enemies.has(e));
    if (!enemy || owned.has(r.item) || (r.also || []).some(i => owned.has(i))) continue;
    // "skip" only matters if you'd normally buy it; "buy" and "prefer" only for heroes that build it
    const fits = r.action === 'skip' ? buys(r.item)
      : !r.heroMustBuy || buys(r.item) || (r.instead && buys(r.instead));
    if (fits) out.push({ id: r.id, action: r.action, item: r.item, enemy, say: r.say, sure: r.sure, pro: r.pro || 0 });
  }
  return out.sort((a, b) => (SURE[a.sure] ?? 2) - (SURE[b.sure] ?? 2) || b.pro - a.pro);
}
