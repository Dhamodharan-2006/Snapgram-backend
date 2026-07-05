const express = require('express');
const router = express.Router();
const {
  getConversations, getMessages, sendMessage,
  deleteMessage, getUnreadCount,
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

router.get('/conversations', protect, getConversations);
router.get('/unread', protect, getUnreadCount);
router.get('/:userId', protect, getMessages);
router.post('/:userId', protect, sendMessage);
router.delete('/:id', protect, deleteMessage);

module.exports = router;