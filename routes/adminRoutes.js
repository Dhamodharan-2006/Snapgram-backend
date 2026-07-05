const express = require('express');
const router = express.Router();
const {
  getStats, getAllUsers, banUser, deleteUser,
  getAllPosts, getReportedPosts, adminDeletePost, dismissReport,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.put('/users/:id/ban', banUser);
router.delete('/users/:id', deleteUser);
router.get('/posts', getAllPosts);
router.get('/posts/reported', getReportedPosts);
router.delete('/posts/:id', adminDeletePost);
router.put('/posts/:id/dismiss', dismissReport);

module.exports = router;