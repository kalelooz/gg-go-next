// Tests for roles.js. npm test runs every test file with plain node; a failed assert stops the run.
import assert from 'node:assert/strict';
import { partOn, roleDefault, roleKey, ROLE_PARTS, laneAt, guessRole } from './roles.js';

// defaults from the role table
assert.equal(roleDefault(1, 'power', 'show'), false);       // carries don't get the power rune
assert.equal(roleDefault(2, 'power', 'show'), true);
assert.equal(roleDefault(2, 'power', 'voice'), true);
assert.equal(roleDefault(2, 'bounty', 'voice'), false);     // mids don't hear bounties unless they switch it on
assert.equal(roleDefault(4, 'bounty', 'voice'), true);
assert.equal(roleDefault(1, 'roshan', 'show'), true);       // parts not in the table show for everyone
assert.equal(roleDefault(5, 'stack', 'voice'), true);
assert.equal(roleDefault(2, 'stack', 'show'), false);
assert.equal(roleDefault(3, 'wards', 'voice'), false);      // wards never talk
// a mid sees every rune row (asked for 2026-10-26)
for (const r of ['water', 'power', 'bounty', 'wisdom', 'lotus']) assert.equal(roleDefault(2, r, 'show'), true, r);

// what you set in Customize wins, and only for that role
const s = { [roleKey(2, 'bounty', 'voice')]: true, [roleKey(1, 'power', 'show')]: true };
assert.equal(partOn(s, 2, 'bounty', 'voice'), true);
assert.equal(partOn(s, 4, 'bounty', 'voice'), true);
assert.equal(partOn(s, 3, 'bounty', 'voice'), false);
assert.equal(partOn(s, 1, 'power', 'show'), true);
assert.equal(partOn({}, 1, 'power', 'show'), false);
// no role known yet: everything shows and talks, except parts that never talk
assert.equal(partOn({}, null, 'stack', 'voice'), true);
assert.equal(partOn({}, null, 'water', 'show'), true);
assert.equal(partOn({}, null, 'glyphs', 'voice'), false);
assert.equal(new Set(ROLE_PARTS.map(p => p[0])).size, ROLE_PARTS.length);

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
