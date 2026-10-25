// Spawn schedules in game-clock seconds, from docs/game-rules.md (patch 7.41f)
export const SCHEDULES = {
  power: { label: 'Power rune', start: 360, every: 120 },
  bounty: { label: 'Bounty', start: 0, every: 240 },
  wisdom: { label: 'Wisdom', start: 420, every: 420 },
  lotus: { label: 'Lotus', start: 180, every: 180 },
  // water runes spawn only at 2:00 and 4:00; the overlay hides the row after that
  water: { label: 'Water runes', start: 120, every: 120 },
};

// Seconds until the next spawn strictly after t
export function untilNext(t, { start, every }) {
  if (t < start) return start - t;
  return every - ((t - start) % every);
}

// Neutral camps respawn on the minute; a pull around :53 stacks them
export function untilStack(t) {
  const s = ((t % 60) + 60) % 60;
  return s < 53 ? 53 - s : 113 - s;
}

export function fmt(s) {
  s = Math.max(0, Math.ceil(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// Roshan respawns 8 to 11 minutes after he dies; the Aegis lasts 5 minutes
export const ROSHAN_MIN = 480, ROSHAN_MAX = 660, AEGIS = 300, GLYPH = 300;

const enemyOf = team => (team === 'radiant' ? 'dire' : 'radiant');

// The glyph comes back about 1s after a team loses its first T1, its first T2 and its first melee
// barracks (7.36 swapped first T3 for first melee barracks). See docs/game-rules.md
export const GLYPH_RESET_DELAY = 1;
const RESETS = ['t1', 't2', 'melee'];
const FEED_TEAM = { 2: 'radiant', 3: 'dire' };
// barracks kills carry one bit per barracks in value3: melee 1/4/16, ranged 2/8/32 (logs show 4, 16, 8, 32)
const MELEE_BITS = 1 | 4 | 16;

// A tower or barracks kill from the event feed. `value` is the team that got the kill, so the loser is the other.
// A deny's `value` is the team that denied its own tower (match A: Dire player 8, value 3).
export function buildingLost(g) {
  const killer = FEED_TEAM[g.value];
  if (!killer) return null;
  if (g.type === 'CHAT_MESSAGE_TOWER_DENY') return { team: killer, kind: 't' + g.value3 };
  if (g.type === 'CHAT_MESSAGE_TOWER_KILL') return { team: enemyOf(killer), kind: 't' + g.value3 };
  if (g.type === 'CHAT_MESSAGE_BARRACKS_KILL') return { team: enemyOf(killer), kind: g.value3 & MELEE_BITS ? 'melee' : 'ranged' };
  return null;
}

export const newGlyphs = () => ({ radiant: { readyAt: -Infinity, lost: new Set() }, dire: { readyAt: -Infinity, lost: new Set() } });

export function glyphLoss(glyphs, team, kind, t) {
  const g = glyphs[team];
  if (!RESETS.includes(kind) || g.lost.has(kind)) return;
  g.lost.add(kind);
  g.readyAt = Math.min(g.readyAt, t + GLYPH_RESET_DELAY);
}

// The glyph event's playerid1 is the team number, not a player (our test lobby: our glyph came as 2, Dire's as 3)
export function glyphUsed(glyphs, g, t) {
  const team = FEED_TEAM[g.playerid1];
  if (team) glyphs[team].readyAt = t + GLYPH;
  return team || null;
}

export const glyphIn = (glyphs, team, t) => Math.max(0, glyphs[team].readyAt - t);

// t and killedAt are game-clock seconds; killedAt is null if he hasn't died
export function roshan(t, killedAt) {
  const since = killedAt == null ? Infinity : t - killedAt;
  if (since >= ROSHAN_MAX) return { text: 'alive', phase: 'up' };
  if (since >= ROSHAN_MIN) return { text: 'may be up, sure in ' + fmt(ROSHAN_MAX - since), phase: 'maybe' };
  return { text: 'back in ' + fmt(ROSHAN_MIN - since) + '-' + fmt(ROSHAN_MAX - since), phase: 'dead' };
}

// Night before 0:00, then day and night swap every 5:00 of game clock (matches every payload in our logs).
// daytime is the feed's live flag, so a mismatch with the schedule means something forced it.
// nsNight is the feed's own flag for Night Stalker's ultimate; other causes stay unnamed.
const scheduledDay = t => t >= 0 && Math.floor(t / CYCLE) % 2 === 0;
export function dayNight(t, daytime, nsNight) {
  // the flag lags the swap by a moment, so only call it forced if it fits neither now nor 2s ago
  if (nsNight || (daytime !== scheduledDay(t) && daytime !== scheduledDay(t - 2))) {
    return { day: daytime, forced: true, by: nsNight ? 'night_stalker' : null, next: null, in: null };
  }
  if (t < 0) return { day: false, forced: false, by: null, next: 'day', in: -t };
  return { day: daytime, forced: false, by: null, next: daytime ? 'night' : 'day', in: CYCLE - (t % CYCLE) };
}

// teleport0 from the feed's items: missing, on cooldown, or ready
export function tpStatus(item) {
  if (!item || item.name === 'empty') return { state: 'none' };
  return item.cooldown > 0 ? { state: 'cd', cd: item.cooldown } : { state: 'ok' };
}

// cooldown first: with buyback on cooldown, gold doesn't matter.
// buyback_cooldown is the game time (not clock time) when it's ready again, and it stays set after that:
// match A bought back at game time 2445 and the field read 2925 from then on.
export function buybackStatus(hero, gold, gameTime) {
  if (!hero || hero.buyback_cost == null) return null;
  const left = hero.buyback_cooldown - gameTime;
  if (left > 0) return { state: 'cd', cd: left };
  return gold >= hero.buyback_cost ? { state: 'ok' } : { state: 'short', short: hero.buyback_cost - gold };
}

// See docs/game-rules.md: Roshan begins top and from 15:00 is top by day, bottom by night.
// The Tormentor (its own corner spot, not a pit) is always on the opposite side, first at 20:00.
export const PITS_FREE_AT = 900, TORMENTOR_AT = 1200, DAY_PIT = 'top', CYCLE = 300;
const other = pit => (pit === 'top' ? 'bottom' : 'top');

const pitAt = (t, day) => (t < PITS_FREE_AT ? 'top' : day ? DAY_PIT : other(DAY_PIT));

export function pits(t, daytime) {
  const rosh = pitAt(t, daytime);
  // day and night swap every 5 minutes, so check where he'll be after the next swap
  const swapIn = CYCLE - (((t % CYCLE) + CYCLE) % CYCLE);
  const next = pitAt(t + swapIn, !daytime);
  return { rosh, tormentor: other(rosh), swapIn, moves: next !== rosh };
}

// Kill streaks for all 10 players (ids 0-9 = top bar order), from one payload's chat events.
// HERO_KILL: playerid1 died, playerid2 got the kill. STREAK_KILL: playerid1 is now on playerid2, playerid4 lost theirs.
// STREAK_KILL is Dota's own count, so it goes last and corrects the +1s (a double kill sends two HERO_KILLs).
export const newStreaks = () => Array(10).fill(0);
const isPlayer = id => id >= 0 && id <= 9;
export function applyKills(s, gs) {
  for (const g of gs) if (g.type === 'CHAT_MESSAGE_HERO_KILL') {
    if (isPlayer(g.playerid1)) s[g.playerid1] = 0;
    if (isPlayer(g.playerid2)) s[g.playerid2]++;
  }
  // a multi-kill's STREAK_KILLs can arrive highest first, so within one payload keep the highest
  const set = new Set();
  for (const g of gs) if (g.type === 'CHAT_MESSAGE_STREAK_KILL') {
    const k = g.playerid1;
    if (isPlayer(k)) { s[k] = set.has(k) ? Math.max(s[k], g.playerid2) : g.playerid2; set.add(k); }
    if (isPlayer(g.playerid4)) s[g.playerid4] = 0;
  }
}

// From the feed's "couriers" section (courier0..9, each with owner = player id). Field names follow
// the Dota2GSI library; shortcut: not yet seen in our own logs, check them after the first game.
export function courierStatus(couriers, playerId) {
  const c = Object.values(couriers || {}).find(c => c?.owner === playerId);
  if (!c) return null;
  return c.alive === false ? { state: 'dead', in: c.respawn_time_remaining } : { state: 'alive' };
}

// Our wards, from the minimap feed. Its unit keys change every payload, but a ward never moves, so it's
// tracked by kind + position. Lifetimes as measured in our logs (every full-length ward lasted this long).
// shortcut: a ward already up when the helper starts counts from then, so it shows more time than it has.
export const WARD_LIFE = { observer: 370, sentry: 430 };
const WARD_UNIT = { npc_dota_observer_wards: 'observer', npc_dota_sentry_wards: 'sentry' };
const TEAM_NUM = { radiant: 2, dire: 3 };
export const newWards = () => new Map();
export function trackWards(wards, minimap, team, t) {
  for (const u of Object.values(minimap || {})) {
    const kind = WARD_UNIT[u?.unitname];
    if (!kind || u.team !== TEAM_NUM[team]) continue;
    const key = kind + u.xpos + ',' + u.ypos;
    const w = wards.get(key);
    if (w) w.seen = t; else wards.set(key, { kind, at: t, seen: t });
  }
  // gone from a few payloads in a row: dewarded or expired
  for (const [k, w] of wards) if (t - w.seen > 3) wards.delete(k);
}
export const wardsLeft = (wards, t) =>
  [...wards.values()].map(w => ({ kind: w.kind, left: WARD_LIFE[w.kind] - (t - w.at) })).filter(w => w.left > 0).sort((a, b) => a.left - b.left);

// The ward line: a count and the next one to expire per kind, so 20 wards still fit on one line.
// With no observers it shows a joke instead, changing every 3 minutes so it doesn't flicker.
export const DARK_MAP = [
  'Dark map. Bring a flashlight.',
  'Dark map. They see you, you see trees.',
  'Dark map. A ward costs less than a buyback.',
  'Dark map. Playing on hard mode today?',
  'Dark map. Even the creeps look nervous.',
];
export const NO_OBSERVERS = [
  'No observers. Sentries spot invis, not ganks.',
  'No observers. Vision is a team sport.',
];
// one joke per 3 minutes of game clock, so a line doesn't flicker between jokes
export const pickQuip = (lines, t) => lines[Math.floor(Math.max(0, t) / 180) % lines.length];
export const NO_TP = ['No TP, enjoy the walk', 'No TP. Walking it is', 'No TP, legs only'];
export const BUYBACK_SHORT = [n => `Buyback: ${n} short, don't die`, n => `Buyback: ${n} short, play safe`];
// Roshan alive and never killed after 20:00
export const ROSH_LONELY = ['alive and lonely', 'alive, nobody visits', 'alive and bored'];
export function wardLine(left, t) {
  const kinds = ['observer', 'sentry'].map(kind => {
    const ws = left.filter(w => w.kind === kind);
    return ws.length ? { kind, count: ws.length, next: Math.min(...ws.map(w => w.left)) } : null;
  }).filter(Boolean);
  const quip = !kinds.length ? pickQuip(DARK_MAP, t) : kinds[0].kind !== 'observer' ? pickQuip(NO_OBSERVERS, t) : null;
  return { kinds, quip };
}
