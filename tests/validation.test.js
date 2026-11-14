const test = require('node:test');
const assert = require('node:assert/strict');
const { validPoints, validTimestamp, validUsername, parseUnsignedInteger } = require('../src/utils/validation');

test('points require nonnegative integer', () => {
  assert.equal(validPoints(0), true);
  assert.equal(validPoints(-1), false);
  assert.equal(validPoints(1.5), false);
});

test('timestamps require positive safe integer', () => {
  assert.equal(validTimestamp(1794672000000), true);
  assert.equal(validTimestamp(0), false);
});

test('nick length 1-24 characters', () => {
  assert.equal(validUsername('  Adam  '), true);
  assert.equal(validUsername(''), false);
  assert.equal(validUsername('X'.repeat(25)), false);
});

test('query values are validated without coercion of invalid strings', () => {
  assert.equal(parseUnsignedInteger('1794672000000'), 1794672000000);
  assert.equal(parseUnsignedInteger('1e5'), null);
  assert.equal(parseUnsignedInteger('-1'), null);
});
