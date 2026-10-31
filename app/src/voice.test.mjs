import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SCHEDULES, JOKES } from './timers.js';

// Every clip the overlay can ask for (see the say() calls in index.html), for every voice in settings.
// There's no robotic backup voice any more, so a gap here would be a silent alert.
const ORDER = ['water', 'power', 'bounty', 'wisdom', 'lotus'];   // the overlay's loop order, which names the clip
const GAME = 2 * 60 * 60;
const spawnsAt = new Map();
for (const id of ORDER) {
  const { start, every, last = Infinity } = SCHEDULES[id];
  for (let t = start; t <= Math.min(last, GAME); t += every) spawnsAt.set(t, [...(spawnsAt.get(t) || []), id]);
}
// a role hears only some runes, so any of the runes spawning together can be asked for, in that order
const subsets = xs => xs.flatMap((x, i) => [[x], ...subsets(xs.slice(i + 1)).map(s => [x, ...s])]);
const need = new Set(['stack', 'aegis', 'levelup-skill', 'levelup-ult', 'levelup-talent', 'tip-deaths', 'tip-buyback', 'tip-bkb', 'hint-invis', 'hint-vessel', 'farm-ready', 'farm-up', 'farm-stack', 'neutral-craft', 'neutral-behind']);
for (const ids of spawnsAt.values()) for (const s of subsets(ids.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)))) need.add('runes-' + s.join('-'));
// one spoken joke per line on screen (joke() in index.html)
for (const [id, lines] of Object.entries(JOKES)) lines.forEach((_, n) => need.add(`joke-${id}-${n}`));
for (const what of ['move', 'maybe', 'up']) for (const pit of ['top', 'bottom']) need.add(`rosh-${what}-${pit}`);

const dir = new URL('./voice/', import.meta.url);
const voices = fs.readdirSync(dir);
assert.ok(voices.length > 0);
for (const v of voices) {
  const have = new Set(fs.readdirSync(new URL(v + '/', dir)).map(f => f.replace(/\.ogg$/, '')));
  const missing = [...need].filter(c => !have.has(c));
  assert.deepEqual(missing, [], `voice ${v} has no clip for: ${missing.join(', ')}`);
}
// water runes are over after 4:00, so the clips that broke before (water with the 6:00 power rune) aren't needed
assert.ok(!need.has('runes-water-power'));
console.log(`voice ok (${need.size} clips x ${voices.length} voices)`);
