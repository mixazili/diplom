const { Router } = require('express');
const { getMyVerification, submitVerification } = require('../controllers/verificationController');
const { authenticate } = require('../middleware/authMiddleware');
const { uploadVerificationDocuments } = require('../middleware/uploadMiddleware');

const router = Router();

router.get('/me', authenticate, getMyVerification);
router.post('/', authenticate, uploadVerificationDocuments, submitVerification);

module.exports = router;
