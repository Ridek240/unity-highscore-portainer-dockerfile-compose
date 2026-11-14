const { hasProfanity } = require('../services/profanity.service');
const { exactPlacement, approximatePlacement } = require('../services/placement.service');
const { validPoints, validTimestamp, validUsername, parseUnsignedInteger } = require('../utils/validation');

function createHighscoreController(repo) {
  return {
    getTop(req, res) {
      res.json({ scores: repo.topTen() });
    },
    add(req, res) {
      const { username, points, timestamp } = req.body || {};
      if (!validUsername(username)) {
        return res.status(400).json({ error: 'INVALID_USERNAME', message: 'username must have 1-24 characters' });
      }
      if (!validPoints(points)) {
        return res.status(400).json({ error: 'INVALID_POINTS', message: 'points must be a non-negative integer' });
      }
      if (!validTimestamp(timestamp)) {
        return res.status(400).json({ error: 'INVALID_TIMESTAMP', message: 'timestamp must be a positive Unix time in milliseconds' });
      }
      const cleanUsername = username.trim();
      if (hasProfanity(cleanUsername)) {
        return res.status(422).json({ error: 'INAPPROPRIATE_USERNAME', message: 'Nazwa użytkownika zawiera niedozwolone słowa.' });
      }
      const occupied = repo.byTimestamp(timestamp);
      if (occupied && occupied.username.toLowerCase() !== cleanUsername.toLowerCase()) {
        return res.status(409).json({ error: 'TIMESTAMP_CONFLICT' });
      }
      try {
        const updated = repo.saveBest(cleanUsername, points, timestamp);
        return res.status(updated ? 201 : 200).json({ updated, score: repo.byUsername(cleanUsername) });
      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(409).json({ error: 'TIMESTAMP_CONFLICT' });
        }
        throw error;
      }
    },
    getPlacement(req, res) {
      const timestamp = parseUnsignedInteger(req.query.timestamp);
      if (!validTimestamp(timestamp)) {
        return res.status(400).json({ error: 'INVALID_TIMESTAMP', message: 'timestamp query parameter is required' });
      }
      const ranked = repo.allRanked();
      const exact = exactPlacement(ranked, timestamp);
      if (exact) return res.json(exact);
      const points = parseUnsignedInteger(req.query.points);
      if (!validPoints(points)) {
        return res.status(400).json({ error: 'POINTS_REQUIRED_FOR_FALLBACK', message: 'Pass points when timestamp is not found' });
      }
      return res.json(approximatePlacement(ranked, points));
    }
  };
}

module.exports = { createHighscoreController };
