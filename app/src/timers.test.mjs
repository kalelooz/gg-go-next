import assert from 'node:assert/strict';
import { SCHEDULES, untilNext, untilStack, fmt, roshan, pits, buildingLost, newGlyphs, glyphLoss, glyphUsed, glyphIn,
  dayNight, tpStatus, buybackStatus, newStreaks, applyKills, courierStatus, newWards, trackWards, wardsLeft, wardLine, DARK_MAP, NO_OBSERVERS, pickQuip, BUYBACK_SHORT } from './timers.js';

assert.equal(untilNext(0, SCHEDULES.power), 360);
assert.equal(untilNext(359, SCHEDULES.power), 1);
assert.equal(untilNext(360, SCHEDULES.power), 120);
assert.equal(untilNext(14 * 60 + 52, SCHEDULES.power), 68);
assert.equal(untilNext(-60, SCHEDULES.bounty), 60);
assert.equal(untilNext(239, SCHEDULES.bounty), 1);
assert.equal(untilNext(240, SCHEDULES.bounty), 240);
assert.equal(untilNext(500, SCHEDULES.wisdom), 340);
assert.equal(untilStack(50), 3);
assert.equal(untilStack(53), 60);
assert.equal(untilStack(-10), 3);
assert.equal(fmt(68), '1:08');
assert.equal(fmt(-3), '0:00');
assert.deepEqual(roshan(600, null), { text: 'alive', phase: 'up' });
assert.deepEqual(roshan(1000, 1000), { text: 'back in 8:00-11:00', phase: 'dead' });
assert.deepEqual(roshan(1500, 1000), { text: 'may be up, sure in 2:40', phase: 'maybe' });
assert.deepEqual(roshan(1660, 1000), { text: 'alive', phase: 'up' });
// clock: day 10-15, night 15-20, day 20-25
assert.deepEqual(pits(400, false), { rosh: 'top', tormentor: 'bottom', swapIn: 200, moves: false });
// 15:00 starts a night, so his first move is down at 15:00
assert.deepEqual(pits(880, true), { rosh: 'top', tormentor: 'bottom', swapIn: 20, moves: true });
assert.deepEqual(pits(1000, false), { rosh: 'bottom', tormentor: 'top', swapIn: 200, moves: true });
assert.deepEqual(pits(1210, true), { rosh: 'top', tormentor: 'bottom', swapIn: 290, moves: true });
assert.equal(untilNext(170, SCHEDULES.lotus), 10);
// water: 2:00 and 4:00 only
assert.equal(untilNext(-30, SCHEDULES.water), 150);
assert.equal(untilNext(110, SCHEDULES.water), 10);
assert.equal(untilNext(230, SCHEDULES.water), 10);
assert.equal(untilNext(240, SCHEDULES.water), Infinity);
assert.equal(untilNext(345, SCHEDULES.water), Infinity);        // no water call next to the 6:00 power rune
assert.equal(untilNext(345, SCHEDULES.power), 15);
// the overlay's clock has fractions; every one of these must still see the 4:00 water rune (it blinked before)
for (let t = 120.001; t < 240; t += 0.137) assert.notEqual(untilNext(t, SCHEDULES.water), Infinity, `water hidden at ${t}`);
assert.equal(untilNext(136.37, SCHEDULES.water), 240 - 136.37);

// events as they appear in our logs (Radiant pushing Dire)
assert.deepEqual(buildingLost({ type: 'CHAT_MESSAGE_TOWER_KILL', value: 2, value3: 1 }), { team: 'dire', kind: 't1' });
assert.deepEqual(buildingLost({ type: 'CHAT_MESSAGE_TOWER_KILL', value: 3, value3: 2 }), { team: 'radiant', kind: 't2' });
assert.deepEqual(buildingLost({ type: 'CHAT_MESSAGE_BARRACKS_KILL', value: 2, value2: 155, value3: 16 }), { team: 'dire', kind: 'melee' });
assert.deepEqual(buildingLost({ type: 'CHAT_MESSAGE_BARRACKS_KILL', value: 2, value2: 90, value3: 32 }), { team: 'dire', kind: 'ranged' });
assert.equal(buildingLost({ type: 'CHAT_MESSAGE_HERO_KILL', value: 268 }), null);
// match A at 1:07: Dire player 8 denied a Dire T1
assert.deepEqual(buildingLost({ type: 'CHAT_MESSAGE_TOWER_DENY', value: 3, playerid1: 8, value2: 90, value3: 1 }), { team: 'dire', kind: 't1' });

// test lobby B: our glyph 3:04 came as playerid1 2, Dire's 3:20 as 3
{
  const g = newGlyphs();
  assert.equal(glyphUsed(g, { playerid1: 2 }, 184), 'radiant');
  assert.equal(glyphUsed(g, { playerid1: 3 }, 200), 'dire');
  assert.equal(glyphIn(g, 'radiant', 200), 284);
  assert.equal(glyphIn(g, 'dire', 200), 300);
  assert.equal(glyphUsed(g, { playerid1: 0 }, 210), null);   // anything else isn't a team
}
// resets: first T1, first T2 and first melee barracks only
{
  const g = newGlyphs();
  glyphUsed(g, { playerid1: 3 }, 75);
  glyphLoss(g, 'dire', 't2', 107);
  assert.equal(glyphIn(g, 'dire', 107), 1);                   // back 1s after the loss
  assert.equal(glyphIn(g, 'dire', 120), 0);
  glyphUsed(g, { playerid1: 3 }, 408);
  glyphLoss(g, 'dire', 't2', 420);                            // a second T2 doesn't refresh again
  glyphLoss(g, 'dire', 't3', 421);                            // T3 no longer refreshes
  glyphLoss(g, 'dire', 'ranged', 430);                        // nor ranged barracks
  assert.equal(glyphIn(g, 'dire', 440), 268);
  glyphLoss(g, 'dire', 'melee', 446);
  assert.equal(glyphIn(g, 'dire', 447), 0);
  assert.equal(glyphIn(g, 'radiant', 447), 0);                // the other team is untouched
}
// day/night
assert.deepEqual(dayNight(-60, false, false), { day: false, forced: false, by: null, next: 'day', in: 60 });
assert.deepEqual(dayNight(100, true, false), { day: true, forced: false, by: null, next: 'night', in: 200 });
assert.deepEqual(dayNight(400, false, false), { day: false, forced: false, by: null, next: 'day', in: 200 });
assert.equal(dayNight(0, false, false).forced, false);          // flag still says night for a moment at 0:00
assert.equal(dayNight(300.5, true, false).forced, false);       // and still says day just after 5:00
assert.deepEqual(dayNight(700, false, true), { day: false, forced: true, by: 'night_stalker', next: null, in: null });
assert.deepEqual(dayNight(700, false, false), { day: false, forced: true, by: null, next: null, in: null });
// TP and buyback
assert.deepEqual(tpStatus({ name: 'empty' }), { state: 'none' });
assert.deepEqual(tpStatus({ name: 'item_tpscroll', cooldown: 0 }), { state: 'ok' });
assert.deepEqual(tpStatus({ name: 'item_tpscroll', cooldown: 45 }), { state: 'cd', cd: 45 });
assert.deepEqual(buybackStatus({ buyback_cost: 316, buyback_cooldown: 0 }, 1515, 900), { state: 'ok' });
assert.deepEqual(buybackStatus({ buyback_cost: 900, buyback_cooldown: 0 }, 588, 900), { state: 'short', short: 312 });
assert.deepEqual(buybackStatus({ buyback_cost: 900, buyback_cooldown: 2925 }, 5000, 2675), { state: 'cd', cd: 250 });
assert.deepEqual(buybackStatus({ buyback_cost: 900, buyback_cooldown: 2925 }, 5000, 3000), { state: 'ok' });   // stays 2925 after it's ready
// double kill from match A at 9:24: the two STREAK_KILLs arrive highest first
const ks = newStreaks(); ks[0] = 9; ks[8] = 1;
applyKills(ks, [
  { type: 'CHAT_MESSAGE_STREAK_KILL', playerid1: 0, playerid2: 11, playerid4: 8 },
  { type: 'CHAT_MESSAGE_HERO_KILL', playerid1: 8, playerid2: 0 },
  { type: 'CHAT_MESSAGE_STREAK_KILL', playerid1: 0, playerid2: 10, playerid4: 9 },
  { type: 'CHAT_MESSAGE_HERO_KILL', playerid1: 9, playerid2: 0 },
]);
assert.equal(ks[0], 11);
assert.equal(ks[8], 0);
applyKills(ks, [{ type: 'CHAT_MESSAGE_HERO_KILL', playerid1: 0, playerid2: -1 }]);
assert.equal(ks[0], 0);
const cs = { courier0: { owner: 0, alive: true }, courier1: { owner: 3, alive: false, respawn_time_remaining: 42 } };
assert.deepEqual(courierStatus(cs, 0), { state: 'alive' });
assert.deepEqual(courierStatus(cs, 3), { state: 'dead', in: 42 });
assert.equal(courierStatus(cs, 7), null);
// wards: minimap keys change every payload, so position is what ties them together
{
  const w = newWards();
  const obs = (key, x) => ({ [key]: { unitname: 'npc_dota_observer_wards', team: 2, xpos: x, ypos: 5 } });
  trackWards(w, { ...obs('o1', 100), o2: { unitname: 'npc_dota_sentry_wards', team: 2, xpos: 7, ypos: 7 },
    o3: { unitname: 'npc_dota_observer_wards', team: 3, xpos: 1, ypos: 1 } }, 'radiant', 600);
  trackWards(w, { ...obs('o9', 100), o4: { unitname: 'npc_dota_sentry_wards', team: 2, xpos: 7, ypos: 7 } }, 'radiant', 700);
  assert.deepEqual(wardsLeft(w, 700), [{ kind: 'observer', left: 270 }, { kind: 'sentry', left: 330 }]);
  trackWards(w, obs('o5', 100), 'radiant', 705);              // the sentry got dewarded
  assert.deepEqual(wardsLeft(w, 705), [{ kind: 'observer', left: 265 }]);
  assert.deepEqual(wardsLeft(w, 980), []);
}
{
  const many = [...Array(12)].map((_, i) => ({ kind: i % 3 ? 'sentry' : 'observer', left: 100 + i }));
  assert.deepEqual(wardLine(many, 600), { kinds: [{ kind: 'observer', count: 4, next: 100 }, { kind: 'sentry', count: 8, next: 101 }], quip: null });
  assert.equal(wardLine([], 0).quip, DARK_MAP[0]);
  assert.equal(wardLine([], 179).quip, DARK_MAP[0]);                 // same joke for 3 minutes
  assert.equal(wardLine([], 180).quip, DARK_MAP[1]);
  assert.equal(wardLine([{ kind: 'sentry', left: 50 }], 0).quip, NO_OBSERVERS[0]);
}
assert.equal(pickQuip(BUYBACK_SHORT, 200)(312), 'Buyback: 312 short, play safe');
console.log('timers ok');
