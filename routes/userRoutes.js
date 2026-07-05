const express = require('express');
const router = express.Router();
const {
  getUserProfile, updateProfile, followUser,
  searchUsers, getSuggestedUsers,
  getFollowers, getFollowing, changePassword,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../config/multer');

router.get('/search', protect, searchUsers);
router.get('/suggested', protect, getSuggestedUsers);
router.put(
  '/update',
  protect,
  upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]),
  updateProfile
);
router.put('/change-password', protect, changePassword);
router.put('/follow/:id', protect, followUser);
router.get('/:username', protect, getUserProfile);
router.get('/:username/followers', protect, getFollowers);
router.get('/:username/following', protect, getFollowing);

module.exports = router;