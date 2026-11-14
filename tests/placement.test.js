const test = require('node:test');
const assert = require('node:assert/strict');
const { exactPlacement, approximatePlacement } = require('../src/services/placement.service');

const ranking = Array.from({ length: 30 }, (_, i) => ({
  placement: i + 1,
  username: `Player${i + 1}`,
  points: 3000 - i * 100,
  timestamp: 1000000 + i
}));

test('exact timestamp finds player with 5 before and 4 after', () => {
  const answer = exactPlacement(ranking, 1000000 + 14);
  assert.equal(answer.found, true);
  assert.equal(answer.player.placement, 15);
  assert.deepEqual(answer.scores.map(x => x.placement), [10,11,12,13,14,15,16,17,18,19]);
});

test('ranking top does not add placeholder entries', () => {
  const result = exactPlacement(ranking.slice(0, 3), 1000000);
  assert.equal(result.scores.length, 3);
});

test('missing timestamp returns null', () => {
  assert.equal(exactPlacement(ranking, 999), null);
});

test('fallback uses points, with ties behind equal point entries', () => {
  const result = approximatePlacement(ranking, 2800);
  assert.equal(result.found, false);
  assert.equal(result.estimatedPlacement, 4);
  assert.equal(result.scores.length, 8);
});
