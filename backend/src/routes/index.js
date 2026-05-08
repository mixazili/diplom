const { Router } = require('express');
const authRoutes = require('./authRoutes');
const healthRoutes = require('./healthRoutes');
const verificationRoutes = require('./verificationRoutes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/verification', verificationRoutes);

module.exports = router;
