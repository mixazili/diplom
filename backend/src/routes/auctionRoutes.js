const { Router } = require('express');
const { createAuction, listMyAuctions } = require('../controllers/auctionController');
const { authenticate } = require('../middleware/authMiddleware');
const { uploadAuctionPhotos } = require('../middleware/uploadMiddleware');

const router = Router();

router.get('/my', authenticate, listMyAuctions);
router.post('/', authenticate, uploadAuctionPhotos, createAuction);

module.exports = router;
