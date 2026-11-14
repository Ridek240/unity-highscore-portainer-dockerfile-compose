
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

function openDatabase(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });

  const db = new Database(filename);

  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  // Sprawdź, czy tabela już istnieje.
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = 'high_scores'
  `).get();

  if (!tableExists) {
    // Nowa baza danych
    db.exec(`
      CREATE TABLE high_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL COLLATE NOCASE,
        points INTEGER NOT NULL CHECK (points >= 0),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        timestamp INTEGER
      );
    `);
  } else {
    const columns = db.prepare(
      'PRAGMA table_info(high_scores)'
    ).all();

    const hasId = columns.some(col => col.name === 'id');
    const hasTimestamp = columns.some(
      col => col.name === 'timestamp'
    );

    if (!hasId) {
      // Migracja starej tabeli z username PRIMARY KEY.
      // Zachowujemy wszystkie dotychczasowe wyniki.
      const migrate = db.transaction(() => {
        db.exec(`
          CREATE TABLE high_scores_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL COLLATE NOCASE,
            points INTEGER NOT NULL CHECK (points >= 0),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            timestamp INTEGER
          );
        `);

        if (hasTimestamp) {
          db.exec(`
            INSERT INTO high_scores_new
              (username, points, updated_at, timestamp)
            SELECT username, points, updated_at, timestamp
            FROM high_scores;
          `);
        } else {
          db.exec(`
            INSERT INTO high_scores_new
              (username, points, updated_at)
            SELECT username, points, updated_at
            FROM high_scores;
          `);
        }

        db.exec(`
          DROP TABLE high_scores;
          ALTER TABLE high_scores_new
            RENAME TO high_scores;
        `);
      });

      migrate();
    } else if (!hasTimestamp) {
      db.exec(`
        ALTER TABLE high_scores
        ADD COLUMN timestamp INTEGER;
      `);
    }
  }

  // Indeksy dla rankingu i timestampów
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_high_scores_ranking
      ON high_scores(
        points DESC,
        timestamp ASC,
        id ASC
      );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_high_scores_timestamp
      ON high_scores(timestamp)
      WHERE timestamp IS NOT NULL;
  `);

  return db;
}

module.exports = { openDatabase };
