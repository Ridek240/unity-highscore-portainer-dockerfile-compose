
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { createHighscoreRouter } = require('./routes/highscore.routes');

function createApp(db) {
  const app = express();

  app.disable('x-powered-by');

  // CORS dla Unity WebGL (itch.io)
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    optionsSuccessStatus: 204
  }));

  app.use(helmet());
  app.use(express.json({ limit: '8kb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', createHighscoreRouter(db));

  app.use((req, res) => {
    res.status(404).json({ error: 'NOT_FOUND' });
  });

  app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({
        error: 'INVALID_JSON'
      });
    }

    console.error('Unhandled error:', err);

    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR'
    });
  });

  return app;
}

module.exports = { createApp };
