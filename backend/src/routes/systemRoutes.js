const { Router } = require('express');
const { getSystemTime } = require('../controllers/systemController');

const router = Router();

router.get('/time', getSystemTime);

module.exports = router;
