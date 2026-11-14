function createHighscoreRepository(db) {
  const rankedSql = `
    SELECT username, points, timestamp,
      ROW_NUMBER() OVER (ORDER BY points DESC, username COLLATE NOCASE ASC) AS placement
    FROM high_scores
  `;
  const topTenStmt = db.prepare(`${rankedSql} ORDER BY placement LIMIT 10`);
  const allRankedStmt = db.prepare(`${rankedSql} ORDER BY placement`);
  const findByTimestampStmt = db.prepare('SELECT username FROM high_scores WHERE timestamp = ?');
  const byUsernameStmt = db.prepare('SELECT username, points, timestamp FROM high_scores WHERE username = ? COLLATE NOCASE');
  const upsertStmt = db.prepare(`
    INSERT INTO high_scores(username, points, timestamp)
    VALUES (?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
      points=excluded.points,
      timestamp=excluded.timestamp,
      updated_at=datetime('now')
    WHERE excluded.points > high_scores.points
  `);
  return {
    topTen: () => topTenStmt.all(),
    allRanked: () => allRankedStmt.all(),
    byTimestamp: timestamp => findByTimestampStmt.get(timestamp),
    byUsername: username => byUsernameStmt.get(username),
    saveBest: (username, points, timestamp) => upsertStmt.run(username, points, timestamp).changes > 0
  };
}

module.exports = { createHighscoreRepository };
