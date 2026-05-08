const { Router } = require('express');
const healthRoutes = require('./healthRoutes');

const router = Router();

router.use('/health', healthRoutes);

module.exports = router;
