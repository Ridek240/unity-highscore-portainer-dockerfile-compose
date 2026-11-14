
function createHighscoreRepository(db) {

  // Ranking wszystkich wyników.
  // Przy takich samych punktach decyduje timestamp,
  // a następnie unikalne ID.
  const rankedSql = `
    SELECT
      id,
      username,
      points,
      timestamp,
      ROW_NUMBER() OVER (
        ORDER BY
          points DESC,
          timestamp ASC,
          id ASC
      ) AS placement
    FROM high_scores
  `;

  const topTenStmt = db.prepare(`
    SELECT * FROM (${rankedSql})
    ORDER BY placement
    LIMIT 10
  `);

  const allRankedStmt = db.prepare(`
    SELECT * FROM (${rankedSql})
    ORDER BY placement
  `);

  // Wyszukiwanie konkretnego wyniku po timestampie.
  const findByTimestampStmt = db.prepare(`
    SELECT id, username, points, timestamp
    FROM high_scores
    WHERE timestamp = ?
  `);

  // Wyszukiwanie po nazwie (może zwrócić wiele wyników).
  const byUsernameStmt = db.prepare(`
    SELECT id, username, points, timestamp
    FROM high_scores
    WHERE username = ? COLLATE NOCASE
    ORDER BY points DESC, timestamp ASC, id ASC
  `);

  // Każdy wynik tworzy nowy rekord.
  const insertStmt = db.prepare(`
    INSERT INTO high_scores (
      username,
      points,
      timestamp
    )
    VALUES (?, ?, ?)
  `);

  return {
    // TOP 10
    topTen: () => topTenStmt.all(),

    // Cały ranking
    allRanked: () => allRankedStmt.all(),

    // Jeden konkretny wynik
    byTimestamp: timestamp =>
      findByTimestampStmt.get(timestamp),

    // Wszystkie wyniki o podanej nazwie
    byUsername: username =>
      byUsernameStmt.all(username),

    // Zapis nowego wyniku
    saveBest: (username, points, timestamp) => {
      const result = insertStmt.run(
        username,
        points,
        timestamp
      );

      return result.changes > 0;
    }
  };
}

module.exports = { createHighscoreRepository };
