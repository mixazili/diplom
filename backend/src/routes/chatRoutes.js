const { Router } = require('express');
const { getChatMessages, listMyChats, markChatRead, sendMessage } = require('../controllers/chatController');
const { authenticate } = require('../middleware/authMiddleware');
const { uploadChatAttachments } = require('../middleware/uploadMiddleware');

const router = Router();

router.use(authenticate);
router.get('/', listMyChats);
router.get('/:id/messages', getChatMessages);
router.post('/:id/read', markChatRead);
router.post('/:id/messages', uploadChatAttachments, sendMessage);

module.exports = router;
