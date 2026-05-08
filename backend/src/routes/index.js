const { Router } = require('express');
const adminRoutes = require('./adminRoutes');
const authRoutes = require('./authRoutes');
const healthRoutes = require('./healthRoutes');
const moderationRoutes = require('./moderationRoutes');
const verificationRoutes = require('./verificationRoutes');

const router = Router();

router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/moderation', moderationRoutes);
router.use('/verification', verificationRoutes);

module.exports = router;
