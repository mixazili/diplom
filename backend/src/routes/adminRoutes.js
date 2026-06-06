const { Router } = require('express');
const {
  listModerators,
  createModerator,
  deleteModerator,
  listAllReviews,
  getVerificationDetails,
  listAllAuctionReviews,
  listAllAuctionCancellations,
  getDevTime,
  advanceDevTime,
  setDevTime,
  resetDevTime
} = require('../controllers/adminController');
const { authenticate, requireRoles } = require('../middleware/authMiddleware');

const router = Router();

router.use(authenticate, requireRoles('admin'));

router.get('/moderators', listModerators);
router.post('/moderators', createModerator);
router.delete('/moderators/:id', deleteModerator);
router.get('/reviews', listAllReviews);
router.get('/auction-reviews', listAllAuctionReviews);
router.get('/auction-cancellations', listAllAuctionCancellations);
router.get('/verifications/:id', getVerificationDetails);
router.get('/dev-time', getDevTime);
router.post('/dev-time/advance', advanceDevTime);
router.post('/dev-time/set', setDevTime);
router.post('/dev-time/reset', resetDevTime);

module.exports = router;
