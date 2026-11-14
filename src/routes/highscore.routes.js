const { Router } = require('express');
const { createHighscoreRepository } = require('../repositories/highscore.repository');
const { createHighscoreController } = require('../controllers/highscore.controller');

function createHighscoreRouter(db) {
  const router = Router();
  const controller = createHighscoreController(createHighscoreRepository(db));
  router.get('/high-scores', controller.getTop);
  router.post('/high-scores', controller.add);
  router.get('/my-placement', controller.getPlacement);
  return router;
}

module.exports = { createHighscoreRouter };
