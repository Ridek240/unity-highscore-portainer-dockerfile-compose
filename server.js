'use strict';

const express = require('express');
const helmet = require('helmet');
const Database = require('better-sqlite3');
const path = require('node:path');
const fs = require('node:fs');
const { Profanease } = require('profanease');
const pl = require('profanease/langs/pl');
const en = require('profanease/langs/en');

const profanityFilter = new Profanease({
  languages: [pl.default || pl, en.default || en],
  normalize: 'aggressive'
});

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'highscores.sqlite');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS high_scores (
    username TEXT PRIMARY KEY COLLATE NOCASE,
    points INTEGER NOT NULL CHECK (points >= 0),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    timestamp INTEGER
  );
`);
// Migrate existing databases without deleting any high scores.
if (!db.prepare('PRAGMA table_info(high_scores)').all().some(column => column.name === 'timestamp')) {
  db.exec('ALTER TABLE high_scores ADD COLUMN timestamp INTEGER');
}
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_high_scores_ranking
    ON high_scores(points DESC, username ASC);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_high_scores_timestamp
    ON high_scores(timestamp) WHERE timestamp IS NOT NULL;
`);

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '8kb' }));
app.get('/', (req, res) => res.json({ service: 'unity-highscore-api', status: 'ok' }));

const rankingQuery = `
  SELECT username, points, timestamp,
         ROW_NUMBER() OVER (ORDER BY points DESC, username COLLATE NOCASE ASC) AS placement
  FROM high_scores
`;
const allRanked = db.prepare(`${rankingQuery} ORDER BY placement`);
const topTen = db.prepare(`${rankingQuery} ORDER BY placement LIMIT 10`);
const findByTimestamp = db.prepare('SELECT username FROM high_scores WHERE timestamp = ?');
const findScore = db.prepare('SELECT username, points, timestamp FROM high_scores WHERE username = ? COLLATE NOCASE');
const upsert = db.prepare(`
  INSERT INTO high_scores (username, points, timestamp)
  VALUES (?, ?, ?)
  ON CONFLICT(username) DO UPDATE SET
    points = excluded.points,
    timestamp = excluded.timestamp,
    updated_at = datetime('now')
  WHERE excluded.points > high_scores.points
`);

const validPoints = value => Number.isSafeInteger(value) && value >= 0;
const validTimestamp = value => Number.isSafeInteger(value) && value > 0;
const parseIntegerParam = value => {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

// GET /api/high-scores -> Top 10 scores.
app.get('/api/high-scores', (req, res) => {
  res.json({ scores: topTen.all() });
});

// POST /api/high-scores { "username":"Ala", "points":1500, "timestamp":1794672000000 }
// One best result per username. Timestamp identifies the currently retained result.
app.post('/api/high-scores', (req, res) => {
  const { username, points, timestamp } = req.body || {};
  if (typeof username !== 'string' || username.trim().length < 1 || username.trim().length > 24) {
    return res.status(400).json({ error: 'INVALID_USERNAME', message: 'username must have 1-24 characters' });
  }
  if (!validPoints(points)) {
    return res.status(400).json({ error: 'INVALID_POINTS', message: 'points must be a non-negative integer' });
  }
  if (!validTimestamp(timestamp)) {
    return res.status(400).json({ error: 'INVALID_TIMESTAMP', message: 'timestamp must be a positive Unix time in milliseconds (integer)' });
  }
  const cleanUsername = username.trim();
  if (profanityFilter.check(cleanUsername)) {
    return res.status(422).json({
      error: 'INAPPROPRIATE_USERNAME',
      message: 'Nazwa użytkownika zawiera niedozwolone słowa.'
    });
  }

  // Duplicate timestamps from different players are ambiguous: require a new timestamp.
  const existingTimestamp = findByTimestamp.get(timestamp);
  if (existingTimestamp && existingTimestamp.username.toLowerCase() !== cleanUsername.toLowerCase()) {
    return res.status(409).json({ error: 'TIMESTAMP_CONFLICT', message: 'timestamp already belongs to a different player' });
  }
  try {
    const updated = upsert.run(cleanUsername, points, timestamp).changes > 0;
    res.status(updated ? 201 : 200).json({ updated, score: findScore.get(cleanUsername) });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'TIMESTAMP_CONFLICT' });
    }
    throw error;
  }
});

// GET /api/my-placement?timestamp=1794672000000&points=1500
// First locate the retained result by exact timestamp.
// If not found, derive a hypothetical ranking slot from points and show nearby real results.
app.get('/api/my-placement', (req, res) => {
  const timestamp = parseIntegerParam(req.query.timestamp);
  if (timestamp === null || timestamp <= 0) {
    return res.status(400).json({ error: 'INVALID_TIMESTAMP', message: 'timestamp query parameter is required (Unix milliseconds)' });
  }
  const ranked = allRanked.all();
  const index = ranked.findIndex(score => score.timestamp === timestamp);
  if (index >= 0) {
    return res.json({
      found: true,
      player: ranked[index],
      scores: ranked.slice(Math.max(0, index - 5), index + 5)
    });
  }

  const points = parseIntegerParam(req.query.points);
  if (points === null || !validPoints(points)) {
    return res.status(400).json({
      error: 'POINTS_REQUIRED_FOR_FALLBACK',
      message: 'No score with this timestamp; send points to display nearby ranks'
    });
  }
  // Deterministic tie-break: hypothetical player goes after existing players with equal points.
  const insertionIndex = ranked.findIndex(score => score.points < points);
  const slot = insertionIndex < 0 ? ranked.length : insertionIndex;
  res.json({
    found: false,
    player: null,
    estimatedPlacement: slot + 1,
    scores: ranked.slice(Math.max(0, slot - 5), slot + 5)
  });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'endpoint not found' }));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ error: 'invalid JSON' });
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Highscore API running on port ${PORT}`));
