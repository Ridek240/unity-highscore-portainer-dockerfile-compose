const { Profanease } = require('profanease');
const pl = require('profanease/langs/pl');
const en = require('profanease/langs/en');

const filter = new Profanease({
  languages: [pl.default || pl, en.default || en],
  normalize: 'aggressive'
});

function hasProfanity(username) {
  return filter.check(username);
}

module.exports = { hasProfanity };
