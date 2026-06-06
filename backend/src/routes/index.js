const { Router } = require('express');
const adminRoutes = require('./adminRoutes');
const auctionRoutes = require('./auctionRoutes');
const authRoutes = require('./authRoutes');
const chatRoutes = require('./chatRoutes');
const healthRoutes = require('./healthRoutes');
const moderationRoutes = require('./moderationRoutes');
const systemRoutes = require('./systemRoutes');
const verificationRoutes = require('./verificationRoutes');

const router = Router();

router.use('/admin', adminRoutes);
router.use('/auctions', auctionRoutes);
router.use('/auth', authRoutes);
router.use('/chats', chatRoutes);
router.use('/health', healthRoutes);
router.use('/moderation', moderationRoutes);
router.use('/system', systemRoutes);
router.use('/verification', verificationRoutes);

module.exports = router;
