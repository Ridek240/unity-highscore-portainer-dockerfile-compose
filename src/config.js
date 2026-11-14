const path = require('node:path');

module.exports = {
  port: Number(process.env.PORT || 3000),
  dbPath: process.env.DB_PATH || path.join(process.cwd(), 'data', 'highscores.sqlite')
};
