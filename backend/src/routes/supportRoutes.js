const { Router } = require('express');
const { submitSupportRequest } = require('../controllers/supportController');

const router = Router();

router.post('/contact', submitSupportRequest);

module.exports = router;
