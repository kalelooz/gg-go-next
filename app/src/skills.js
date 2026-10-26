// Level-up hints: which ability to put the free point in, and which talent most players take.
// Rules and the feed/STRATZ quirks behind them: docs/research/skill-builds.md.

// Since 7.40 talents have their own points; one ability point per level up to 22
const TALENT_AT = [10, 15, 20, 25, 27, 28, 29, 30];
const TIERS = [10, 15, 20, 25];

// best: Map of ability name -> highest level seen this game (Tiny's Tree Grab drops out of the feed while he
// holds a tree). learnable: names that take points, so innates, grants and cosmetics don't count.
export function freePoints(hero, best, learnable) {
  let skills = 0;
  for (const n of learnable) skills += best.get(n) || 0;
  // Scepter gives Invoker's orbs a free level each (Valve's npc_dota_hero_invoker scepter_bonus_levels)
  // shortcut: assumes the feed counts that level in; check once in a game with Scepter on Invoker
  if (hero.aghanims_scepter) for (const n of learnable) if (ORB.test(n) && best.get(n)) skills--;
  const level = hero.level || 0;
  const taken = [1, 2, 3, 4, 5, 6, 7, 8].filter(i => hero['talent_' + i]).length;
  return {
    skills,
    // clamp: a grant STRATZ doesn't flag would push this negative
    // Invoke gives Invoker an extra point at hero levels 6, 12 and 18 (7.41b)
    skill: Math.max(0, Math.min(level, 22) + ([...learnable].some(n => ORB.test(n)) ? [6, 12, 18].filter(l => l <= level).length : 0)
      - (hero.attributes_level || 0) - skills),
    talent: Math.max(0, TALENT_AT.filter(l => l <= level).length - taken),
  };
}

// Invoker's orbs take up to 8 points (Valve's game files, 7.41f); everything else 4, ultimates 3
const ORB = /^invoker_(quas|wex|exort)$/;
const maxPoints = (name, ult) => name === ult ? 3 : ORB.test(name) ? 8 : 4;

// guide games from STRATZ: their ability ids in learn order. Talents go; attribute points (0, 730) stay as
// 'attr' so the n-th entry is still the n-th point. Tiny's games file Tree Grab as Toss, so drop any game
// with more points in one ability than it can take.
export function guideOrders(games, names, ultName) {
  const out = [];
  for (const ids of games) {
    const order = ids.map(id => (id === 0 || id === 730 ? 'attr' : names.get(id))).filter(Boolean);
    const count = new Map();
    for (const n of order) count.set(n, (count.get(n) || 0) + 1);
    if ([...count].some(([n, c]) => n !== 'attr' && c > maxPoints(n, ultName))) continue;
    out.push(order);
  }
  return out;
}

// what can take the next point: basic abilities need hero level 1/3/5/7 (Invoker's orbs on to 15), the ultimate 6/12/18
const canLearn = (name, lv, level, ult) =>
  name === ult ? lv < 3 && level >= 6 * (lv + 1) : lv < maxPoints(name, ult) && level >= 2 * lv + 1;

export function nextSkill({ level, attr = 0, best, learnable, ult, orders }) {
  // the ultimate goes in as soon as it can: 97-100% of games
  if (ult && canLearn(ult, best.get(ult) || 0, level, ult)) return { name: ult, votes: null, of: null };
  // points spent so far, attribute bonus included, is where we are in each game's order
  const used = [...learnable].reduce((s, n) => s + (best.get(n) || 0), 0) + attr;
  const votes = new Map();
  let of = 0;
  for (const o of orders) {
    if (o.length <= used) continue;
    // from this point on, the first thing this game took that we can still take
    const pick = o.slice(used).find(n => n !== 'attr' && learnable.has(n) && canLearn(n, best.get(n) || 0, level, ult));
    if (!pick) continue;
    of++;
    votes.set(pick, (votes.get(pick) || 0) + 1);
  }
  const [name, n] = [...votes].sort((a, b) => b[1] - a[1])[0] || [];
  return name ? { name, votes: n, of } : null;
}

// rows: heroStats.talent { abilityId, matchCount, winCount }; slots: constants talents { slot, abilityId },
// slot 0-1 is level 10, 2-3 level 15 and so on. Returns the open tier and what most players take there.
export function talentPick({ hero, free, rows, slots }) {
  if (!free) return null;
  const level = hero.level || 0;
  const taken = i => hero['talent_' + i];
  for (let t = 0; t < TIERS.length; t++) {
    const a = taken(2 * t + 1), b = taken(2 * t + 2);
    // levels 27-30 unlock the other side of a tier you already picked
    if (level >= 27 && a !== b) return { tier: TIERS[t], spare: true };
    if (level < TIERS[t] || a || b) continue;
    const pair = [2 * t, 2 * t + 1].map(s => {
      const id = slots.find(x => x.slot === s)?.abilityId, r = rows.find(x => x.abilityId === id);
      return { id, games: r?.matchCount || 0, win: r ? r.winCount / r.matchCount : 0 };
    });
    const total = pair[0].games + pair[1].games;
    if (!total) return { tier: TIERS[t] };
    const [top, other] = pair[0].games >= pair[1].games ? pair : [pair[1], pair[0]];
    const gap = Math.round(100 * (other.win - top.win));
    return { tier: TIERS[t], top: top.id, pct: Math.round(100 * top.games / total),
      // only worth saying with enough games on both sides
      better: gap >= 2 && other.games >= 1000 && top.games >= 1000 ? { id: other.id, gap } : null };
  }
  return null;
}

// talentName: abilityId -> text
export function talentTip(o) {
  const p = talentPick(o);
  if (!p) return null;
  if (p.spare) return `Spare talent: you can take the other level ${p.tier} talent.`;
  if (!p.top) return `Level ${p.tier} talent is free.`;
  let say = `Level ${p.tier} talent: most take ${o.talentName(p.top)} (${p.pct}%).`;
  if (p.better) say += ` ${o.talentName(p.better.id)} wins ${p.better.gap} points more.`;
  return say;
}

// Dota's ability buttons, left to right: the feed's abilities in order, minus cosmetics, innates and hidden slots
export function buttonSlots(abilities, innate) {
  return Object.values(abilities || {}).map(a => a?.name)
    .filter(n => n && !/^(plus_|seasonal_)/.test(n) && !n.includes('hidden') && (!innate.has(n) || n === 'invoker_invoke'));
}
