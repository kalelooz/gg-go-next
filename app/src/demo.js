// A made-up game for the Customize window's preview (index.html?demo). It stands in for Tauri:
// sends a game-feed payload every half second and passes the window's switches on as settings.
// The clock starts at 5:38 so runes and the stack turn gold within the first half minute.
const START = 338, started = Date.now();
const handlers = {};
const clock = () => START + (Date.now() - started) / 1000;
const ward = (kind, x) => ({ unitname: `npc_dota_${kind}_wards`, team: 2, xpos: x, ypos: 100 });
const generic = (t, data) => ({ event_type: 'generic_event', game_time: t + 90, data: JSON.stringify(data) });

function payload() {
  const t = Math.floor(clock());
  return {
    map: { matchid: 'demo', clock_time: t, game_time: t + 90, daytime: Math.floor(t / 300) % 2 === 0,
      nightstalker_night: false, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS', paused: false },
    player: { team_name: 'radiant', team_slot: 0, gold: 1450, deaths: 4 },
    hero: { id: 32, name: 'npc_dota_hero_riki', alive: true, buyback_cost: 1900, buyback_cooldown: 0, level: 7, attributes_level: 0 },
    // level 7 with one point free, so the Level up line shows
    abilities: { ability0: { name: 'riki_smoke_screen', level: 1 }, ability1: { name: 'riki_blink_strike', level: 3 },
      ability2: { name: 'riki_backstab', level: 1 }, ability3: { name: 'riki_tricks_of_the_trade', level: 1, ultimate: true } },
    items: { slot0: { name: 'item_power_treads' }, slot1: { name: 'item_aegis' }, teleport0: { name: 'item_tpscroll', cooldown: 0 } },
    minimap: { a: ward('observer', 1), b: ward('observer', 2), c: ward('sentry', 3),
      e: { unitname: 'npc_dota_hero_pudge', image: 'minimap_enemyicon', team: 3, xpos: 2000, ypos: 1500 } },
    // the courier dies for 15s out of every minute, so its chip comes and goes
    couriers: { courier0: { owner: 0, alive: t % 60 >= 15, respawn_time_remaining: 15 - (t % 60) } },
    events: [
      { event_type: 'roshan_killed', game_time: 320 + 90 },
      { event_type: 'aegis_picked_up', game_time: 322 + 90 },
      generic(300, { type: 'CHAT_MESSAGE_GLYPH_USED', playerid1: 3 }),
    ],
  };
}

// Riki's real numbers from STRATZ, trimmed to what the first few minutes show
const ITEMS = [
  { id: 174, shortName: 'diffusal_blade', displayName: 'Diffusal Blade' },
  { id: 36, shortName: 'magic_wand', displayName: 'Magic Wand' },
  { id: 569, shortName: 'orb_of_corrosion', displayName: 'Orb of Corrosion' },
  { id: 116, shortName: 'black_king_bar', displayName: 'Black King Bar' },
];
const ROWS = [
  { itemId: 174, time: 7, matchCount: 2000, winCount: 1300 },
  { itemId: 36, time: 7, matchCount: 1900, winCount: 1010 },
  { itemId: 569, time: 7, matchCount: 1700, winCount: 960 },
  { itemId: 116, time: 24, matchCount: 900, winCount: 500 },
];

// made-up skill orders: Blink Strike first, then Smoke Screen
const SKILLS = { heroStats: { talent: [], guide: [{ guides: [1, 2, 3].map(matchId => ({ matchId })) }] },
  constants: { hero: { talents: [], abilities: [[1, 'riki_smoke_screen', 'Smoke Screen'], [2, 'riki_blink_strike', 'Blink Strike'],
    [3, 'riki_tricks_of_the_trade', 'Tricks of the Trade']].map(([abilityId, name, displayName]) => ({ abilityId, ability: { name, language: { displayName }, stat: {} } })) } } };
const ORDER = [2, 1, 2, 1, 2, 3, 1, 1];
const MATCH = Object.fromEntries([1, 2, 3].map(m => ['m' + m, { players: [{ heroId: 32, abilities: ORDER.map(abilityId => ({ abilityId, isTalent: false })) }] }]));

async function invoke(cmd, args) {
  if (cmd === 'load_token') return 'demo';
  if (cmd === 'stratz' && args.query.includes('guide(')) return JSON.stringify({ data: SKILLS });
  if (cmd === 'stratz' && args.query.includes('match(id')) return JSON.stringify({ data: { ...MATCH, constants: {} } });
  if (cmd === 'stratz') return JSON.stringify({ data: args.query.includes('constants') ? { constants: { items: ITEMS } }
    : args.query.includes('winWeek') ? { heroStats: { p1: [{ matchCount: 30 }], p2: [{ matchCount: 90 }], p3: [{ matchCount: 10 }], p4: [{ matchCount: 40 }], p5: [{ matchCount: 5 }] } }
    : { heroStats: { itemFullPurchase: ROWS } } });
  return {};
}

// the Customize window posts [id, value]; the overlay handles it like a setting from the tray
addEventListener('message', e => Array.isArray(e.data) && handlers.settings?.({ payload: e.data }));
setInterval(() => handlers.gsi?.({ payload: JSON.stringify(payload()) }), 500);

export const tauri = { core: { invoke }, event: { listen: async (name, fn) => { handlers[name] = fn; } } };
