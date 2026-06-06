const { Router } = require('express');
const {
  getMyCounters,
  listMyNotifications,
  markAllNotificationsRead,
  markPageNotificationsRead,
  markNotificationRead
} = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');

const router = Router();

router.use(authenticate);

router.get('/', listMyNotifications);
router.get('/summary', getMyCounters);
router.post('/read-page', markPageNotificationsRead);
router.post('/read-all', markAllNotificationsRead);
router.post('/:id/read', markNotificationRead);

module.exports = router;
