const { createApp } = require('./app');
const { openDatabase } = require('./db/database');
const { port, dbPath } = require('./config');

const db = openDatabase(dbPath);
const app = createApp(db);
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Unity Highscore API listening on port ${port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
