// Post-match summary: collects what the game feed sends during a match and turns the
// POST_GAME payload into one object the summary window draws. See docs/game-rules.md for the feed.
const FEED_TEAM = { 2: 'radiant', 3: 'dire' };
const SOURCES = ['hero_kills', 'creep_kills', 'summon_kills', 'income', 'shared'];
const earned = p => SOURCES.reduce((s, k) => s + (p['gold_from_' + k] || 0), 0);

export const newTracker = matchId => ({ matchId, from: null, minutes: [], kills: [], deaths: [], events: [], seen: new Set() });

// Event player ids run 0-4 Radiant, 5-9 Dire, in top-bar order
export const myId = p => (p?.team_name === 'dire' ? 5 : 0) + (p?.team_slot ?? 0);

// One in-game payload. Keeps the first sample of each game minute and every new event.
export function track(tr, d) {
  const t = d.map.clock_time, p = d.player;
  if (!p || p.team_name == null) return;
  if (tr.from == null) tr.from = t;
  const m = Math.floor(t / 60);
  if (m >= 0 && !tr.minutes[m]) {
    tr.minutes[m] = { lh: p.last_hits, dn: p.denies, gold: earned(p), xp: d.hero?.xp ?? null,
      ours: d.map[p.team_name + '_score'], theirs: d.map[(p.team_name === 'radiant' ? 'dire' : 'radiant') + '_score'] };
  }
  const offset = d.map.game_time - t, me = myId(p);
  for (const e of d.events || []) {
    // Dota repeats recent events in several payloads, so each one is handled once
    const key = JSON.stringify(e);
    if (tr.seen.has(key)) continue;
    tr.seen.add(key);
    const at = e.game_time - offset;
    if (e.event_type === 'roshan_killed') tr.events.push({ t: at, ours: e.killed_by_team === p.team_name, what: 'Roshan' });
    if (e.event_type !== 'generic_event') continue;
    let g; try { g = JSON.parse(e.data); } catch { continue; }
    if (g.type === 'CHAT_MESSAGE_HERO_KILL') {
      if (g.playerid2 === me) tr.kills.push(at);
      if (g.playerid1 === me) tr.deaths.push(at);
    }
    const by = FEED_TEAM[g.value];
    if (g.type === 'CHAT_MESSAGE_TOWER_KILL' && by) tr.events.push({ t: at, ours: by === p.team_name, what: 'T' + g.value3 + ' tower' });
    if (g.type === 'CHAT_MESSAGE_BARRACKS_KILL' && by) tr.events.push({ t: at, ours: by === p.team_name, what: (g.value2 === 155 ? 'Melee' : 'Ranged') + ' barracks' });
  }
}

// The finished match, from the first POST_GAME payload. Totals come from the player block, not from
// counting events: the kill events' assist list missed one of ours in a test lobby.
export function finish(tr, d) {
  const p = d.player, dur = d.map.clock_time, min = Math.max(dur / 60, 1);
  const item = s => { const n = d.items?.[s]?.name; return n && n !== 'empty' ? n : null; };
  return {
    matchId: tr.matchId, endedAt: Date.now(), duration: dur, from: tr.from,
    team: p.team_name, win: d.map.win_team === p.team_name,
    score: { ours: d.map[p.team_name + '_score'], theirs: d.map[(p.team_name === 'radiant' ? 'dire' : 'radiant') + '_score'] },
    // six inventory slots in order (null = empty, so the row keeps Dota's layout), and the neutral item apart
    hero: { id: d.hero?.id, level: d.hero?.level },
    items: ['slot0', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5'].map(item), neutral: item('neutral0'),
    k: p.kills, d: p.deaths, a: p.assists, lh: p.last_hits, dn: p.denies,
    lh10: tr.minutes[10]?.lh ?? null, dn10: tr.minutes[10]?.dn ?? null,
    gpm: Math.round(earned(p) / min), xpm: d.hero?.xp != null ? Math.round(d.hero.xp / min) : null,
    sources: Object.fromEntries(SOURCES.map(k => [k, p['gold_from_' + k] || 0])),
    minutes: tr.minutes, kills: tr.kills, deaths: tr.deaths, events: tr.events.sort((x, y) => x.t - y.t),
  };
}
