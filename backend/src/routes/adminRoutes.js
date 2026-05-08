const { Router } = require('express');
const {
  listModerators,
  createModerator,
  deleteModerator,
  listAllReviews,
  getVerificationDetails
} = require('../controllers/adminController');
const { authenticate, requireRoles } = require('../middleware/authMiddleware');

const router = Router();

router.use(authenticate, requireRoles('admin'));

router.get('/moderators', listModerators);
router.post('/moderators', createModerator);
router.delete('/moderators/:id', deleteModerator);
router.get('/reviews', listAllReviews);
router.get('/verifications/:id', getVerificationDetails);

module.exports = router;
