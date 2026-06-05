const { Router } = require('express');
const {
  createAuction,
  deleteAuction,
  downloadAuctionProtocol,
  getAuctionProtocol,
  getPublicAuction,
  listFavoriteAuctions,
  listMyAuctions,
  listPublicAuctions,
  listSimilarAuctions,
  returnAuctionToDraft,
  toggleFavoriteAuction,
  updateAuction
} = require('../controllers/auctionController');
const {
  applyForAuction,
  listMyParticipations,
  payDeposit,
  payWonLot,
  placeBid
} = require('../controllers/participationController');
const { authenticate, optionalAuthenticate } = require('../middleware/authMiddleware');
const { uploadAuctionPhotos } = require('../middleware/uploadMiddleware');

const router = Router();

router.get('/', optionalAuthenticate, listPublicAuctions);
router.get('/public/:id/protocol', getAuctionProtocol);
router.get('/public/:id/protocol/download', downloadAuctionProtocol);
router.get('/public/:id', optionalAuthenticate, getPublicAuction);
router.get('/public/:id/similar', optionalAuthenticate, listSimilarAuctions);
router.get('/my', authenticate, listMyAuctions);
router.get('/favorites/my', authenticate, listFavoriteAuctions);
router.get('/participations/my', authenticate, listMyParticipations);
router.post('/', authenticate, uploadAuctionPhotos, createAuction);
router.post('/:id/applications', authenticate, applyForAuction);
router.post('/:id/deposit/pay', authenticate, payDeposit);
router.post('/:id/bids', authenticate, placeBid);
router.post('/:id/favorite', authenticate, toggleFavoriteAuction);
router.post('/:id/lot/pay', authenticate, payWonLot);
router.patch('/:id/draft', authenticate, returnAuctionToDraft);
router.put('/:id', authenticate, uploadAuctionPhotos, updateAuction);
router.delete('/:id', authenticate, deleteAuction);

module.exports = router;
