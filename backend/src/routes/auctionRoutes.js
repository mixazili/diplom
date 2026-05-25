const { Router } = require('express');
const { createAuction, deleteAuction, listMyAuctions, returnAuctionToDraft, updateAuction } = require('../controllers/auctionController');
const { authenticate } = require('../middleware/authMiddleware');
const { uploadAuctionPhotos } = require('../middleware/uploadMiddleware');

const router = Router();

router.get('/my', authenticate, listMyAuctions);
router.post('/', authenticate, uploadAuctionPhotos, createAuction);
router.patch('/:id/draft', authenticate, returnAuctionToDraft);
router.put('/:id', authenticate, uploadAuctionPhotos, updateAuction);
router.delete('/:id', authenticate, deleteAuction);

module.exports = router;
