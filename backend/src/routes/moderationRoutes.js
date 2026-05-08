const { Router } = require('express');
const {
  listPendingVerifications,
  getVerificationDetails,
  approveVerification,
  rejectVerification,
  listMyReviews
} = require('../controllers/moderationController');
const { authenticate, requireRoles } = require('../middleware/authMiddleware');

const router = Router();

router.use(authenticate, requireRoles('moderator', 'admin'));

router.get('/verifications', listPendingVerifications);
router.get('/verifications/:id', getVerificationDetails);
router.post('/verifications/:id/approve', approveVerification);
router.post('/verifications/:id/reject', rejectVerification);
router.get('/reviews', listMyReviews);

module.exports = router;
