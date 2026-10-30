// Tests for reminders.js. npm test runs every test file with plain node; a failed assert stops the run.
import assert from 'node:assert/strict';
import { newReminders, mayRemind } from './reminders.js';

// BKB late from 24:00 to the end of a 50-minute game: twice, 8 minutes apart (it used to be every 5 minutes)
let r = newReminders(), said = [];
for (let t = 24 * 60; t < 50 * 60; t++) if (mayRemind(r, 'tip-bkb', t)) said.push(t / 60);
assert.deepEqual(said, [24, 32]);

// deaths: at the first warning, then only after 3 more deaths, 3 times at most
r = newReminders(); said = [];
for (const [t, d] of [[600, 4], [700, 5], [800, 6], [900, 7], [1000, 9], [1100, 10], [1200, 13], [1300, 16]])
  if (mayRemind(r, 'tip-deaths', t, d)) said.push(d);
assert.deepEqual(said, [4, 7, 10]);

// two lines due together: the second waits 45 seconds, then gets its turn
r = newReminders();
assert.ok(mayRemind(r, 'tip-bkb', 1500));
assert.ok(!mayRemind(r, 'tip-buyback', 1510));
assert.ok(mayRemind(r, 'tip-buyback', 1545));
// one-off lines (level-up, hints) speak once a game
r = newReminders();
assert.ok(mayRemind(r, 'lvl7skill', 400));
assert.ok(!mayRemind(r, 'lvl7skill', 2000));
console.log('reminders ok');
