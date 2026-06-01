const { Router } = require('express');
const {
  createAuction,
  deleteAuction,
  getPublicAuction,
  listMyAuctions,
  listPublicAuctions,
  listSimilarAuctions,
  returnAuctionToDraft,
  updateAuction
} = require('../controllers/auctionController');
const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { uploadAuctionPhotos } = require('../middleware/uploadMiddleware');

const router = Router();

router.get('/', optionalAuthenticate, listPublicAuctions);
router.get('/public/:id', optionalAuthenticate, getPublicAuction);
router.get('/public/:id/similar', listSimilarAuctions);
router.get('/my', authenticate, listMyAuctions);
router.post('/', authenticate, uploadAuctionPhotos, createAuction);
router.patch('/:id/draft', authenticate, returnAuctionToDraft);
router.put('/:id', authenticate, uploadAuctionPhotos, updateAuction);
router.delete('/:id', authenticate, deleteAuction);

module.exports = router;
