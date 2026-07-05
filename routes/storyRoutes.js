const express = require('express');
const router = express.Router();
const { createStory, getStories, viewStory, likeStory, deleteStory } = require('../controllers/storyController');
const { protect } = require('../middleware/auth');
const upload = require('../config/multer');

router.post('/', protect, upload.single('media'), createStory);
router.get('/', protect, getStories);
router.put('/:id/view', protect, viewStory);
router.put('/:id/like', protect, likeStory);
router.delete('/:id', protect, deleteStory);

module.exports = router;