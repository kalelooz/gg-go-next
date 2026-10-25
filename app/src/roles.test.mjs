import assert from 'node:assert/strict';
import { roleView, voiced, laneAt, guessRole } from './roles.js';

assert.equal(roleView('power', 1), 'hide');
assert.equal(roleView('power', 2), 'show');
assert.equal(roleView('roshan', 1), 'show');          // parts not in the table always show
assert.equal(roleView('stack', null), 'show');        // no role: everything shows

assert.equal(voiced('power', 2, 600), true);
assert.equal(voiced('power', 2, 900), false);
assert.equal(voiced('power', 2, 900, true), true);    // a Bottle keeps runes worth it for mid
assert.equal(voiced('power', 1, 360), false);
assert.equal(voiced('bounty', 1, -20), true);         // horn bounties for everyone
assert.equal(voiced('bounty', 1, 240), false);
assert.equal(voiced('stack', 5, 600), true);
assert.equal(voiced('stack', 2, 600), false);
assert.equal(voiced('stack', null, 600), true);

// Roshan's bottom pit from our logs sits in the lower-right half; fountains count as no lane
assert.equal(laneAt(2574, -2663), 'bot');
assert.equal(laneAt(-6500, 1500), 'top');
assert.equal(laneAt(300, -200), 'mid');
assert.equal(laneAt(-7000, -6500), null);

const riki = { 1: 142681, 2: 91873, 3: 53236, 4: 56134, 5: 39906 };
assert.equal(guessRole(riki, [], 'radiant'), 1);                         // no lane yet: most played
assert.equal(guessRole(riki, ['mid', 'mid', 'top'], 'radiant'), 2);
assert.equal(guessRole(riki, ['bot', 'bot'], 'radiant'), 1);             // Radiant safe lane is bottom
assert.equal(guessRole(riki, ['top', 'top'], 'radiant'), 4);             // offlane: 4 beats 3 for Riki
assert.equal(guessRole(riki, ['top', 'top'], 'dire'), 1);                // Dire safe lane is top
assert.equal(guessRole(null, ['top'], 'radiant'), 3);
assert.equal(guessRole(null, [], 'radiant'), null);
console.log('roles ok');
