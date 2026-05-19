const { Router } = require('express');
const {
  listPendingVerifications,
  getVerificationDetails,
  approveVerification,
  rejectVerification,
  listMyReviews,
  listPendingAuctions,
  getAuctionDetails,
  approveAuction,
  returnAuction,
  listMyAuctionReviews
} = require('../controllers/moderationController');
const { authenticate, requireRoles } = require('../middleware/authMiddleware');

const router = Router();

router.use(authenticate, requireRoles('moderator', 'admin'));

router.get('/verifications', listPendingVerifications);
router.get('/verifications/:id', getVerificationDetails);
router.post('/verifications/:id/approve', approveVerification);
router.post('/verifications/:id/reject', rejectVerification);
router.get('/reviews', listMyReviews);
router.get('/auctions', listPendingAuctions);
router.get('/auctions/:id', getAuctionDetails);
router.post('/auctions/:id/approve', approveAuction);
router.post('/auctions/:id/return', returnAuction);
router.get('/auction-reviews', listMyAuctionReviews);

module.exports = router;
