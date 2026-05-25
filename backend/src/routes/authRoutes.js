const { Router } = require('express');
const {
  register,
  verifyEmail,
  login,
  requestStaffLoginCode,
  verifyStaffLoginCode,
  requestPasswordReset,
  confirmPasswordReset,
  changePassword,
  refresh,
  me,
  logout,
  resendCode
} = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/staff-login', requestStaffLoginCode);
router.post('/staff-login/verify', verifyStaffLoginCode);
router.post('/password-reset/request', requestPasswordReset);
router.post('/password-reset/confirm', confirmPasswordReset);
router.post('/refresh', refresh);
router.post('/resend-code', resendCode);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);
router.post('/logout', authenticate, logout);

module.exports = router;
