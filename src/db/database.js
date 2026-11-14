const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

function openDatabase(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS high_scores (
      username TEXT PRIMARY KEY COLLATE NOCASE,
      points INTEGER NOT NULL CHECK (points >= 0),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      timestamp INTEGER
    );
  `);
  // Non-destructive migration of older SQLite databases.
  const columns = db.prepare('PRAGMA table_info(high_scores)').all();
  if (!columns.some(col => col.name === 'timestamp')) {
    db.exec('ALTER TABLE high_scores ADD COLUMN timestamp INTEGER');
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_high_scores_ranking
      ON high_scores(points DESC, username COLLATE NOCASE ASC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_high_scores_timestamp
      ON high_scores(timestamp) WHERE timestamp IS NOT NULL;
  `);
  return db;
}

module.exports = { openDatabase };
