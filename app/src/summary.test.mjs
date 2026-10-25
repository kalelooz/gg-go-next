import assert from 'node:assert/strict';
import { newTracker, track, finish } from './summary.js';

// Shapes copied from logged payloads (match E): we're Dire slot 1, so our event id is 6
const pay = (state, clock, extra = {}) => ({
  map: { matchid: '1', game_state: state, clock_time: clock, game_time: clock + 100, radiant_score: 2, dire_score: 3, win_team: 'dire' },
  player: { team_name: 'dire', team_slot: 1, kills: 3, deaths: 1, assists: 2, last_hits: clock / 10, denies: 1,
    gold_from_hero_kills: 300, gold_from_creep_kills: 600, gold_from_income: 100, gold_from_shared: 0, gold_from_summon_kills: 0 },
  hero: { id: 90, level: 12, xp: 6000 },
  ...extra,
});
const ev = (clock, data) => ({ game_time: clock + 100, event_type: 'generic_event', data: JSON.stringify(data) });

const tr = newTracker('1');
const IP = 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS';
track(tr, pay(IP, 30));
const kill = ev(70, { type: 'CHAT_MESSAGE_HERO_KILL', playerid1: 2, playerid2: 6 });
// the same event repeats in later payloads and must count once
track(tr, pay(IP, 70, { events: [kill, ev(72, { type: 'CHAT_MESSAGE_HERO_KILL', playerid1: 6, playerid2: 1 })] }));
track(tr, pay(IP, 90, { events: [kill, ev(85, { type: 'CHAT_MESSAGE_TOWER_KILL', value: 2, value3: 1 })] }));
track(tr, pay(IP, 600, { events: [{ game_time: 690, event_type: 'roshan_killed', killed_by_team: 'dire' }] }));

const s = finish(tr, pay('DOTA_GAMERULES_STATE_POST_GAME', 1200, { items: { slot0: { name: 'item_blink' }, slot1: { name: 'empty' } } }));
assert.equal(s.win, true);
assert.deepEqual(s.score, { ours: 3, theirs: 2 });
assert.deepEqual(s.kills, [70]);
assert.deepEqual(s.deaths, [72]);
// first sample of each minute: minute 1 is the 1:10 payload, not 1:30
assert.equal(s.minutes[1].lh, 7);
assert.equal(s.lh10, 60);
assert.equal(s.gpm, 50);
assert.deepEqual(s.items, ['item_blink', null, null, null, null, null]);
assert.equal(s.neutral, null);
assert.deepEqual(s.events, [{ t: 85, ours: false, what: 'T1 tower' }, { t: 590, ours: true, what: 'Roshan' }]);
console.log('summary ok');
