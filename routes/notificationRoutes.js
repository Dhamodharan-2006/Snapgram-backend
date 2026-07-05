const express = require('express');
const router = express.Router();
const { getNotifications, markAllRead, getUnreadCount } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getNotifications);
router.get('/unread', protect, getUnreadCount);
router.put('/read', protect, markAllRead);

module.exports = router;