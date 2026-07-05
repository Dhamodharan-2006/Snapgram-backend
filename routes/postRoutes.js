const express = require('express');
const router = express.Router();
const {
  createPost, getFeed, getExplorePosts, getPost,
  likePost, addComment, deleteComment, deletePost,
  savePost, getSavedPosts, reportPost, updatePost,
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');
const upload = require('../config/multer');

router.post('/', protect, upload.fields([{ name: 'media', maxCount: 10 }]), createPost);
router.get('/feed', protect, getFeed);
router.get('/explore', protect, getExplorePosts);
router.get('/saved', protect, getSavedPosts);
router.get('/:id', protect, getPost);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);
router.put('/:id/like', protect, likePost);
router.post('/:id/comment', protect, addComment);
router.delete('/:postId/comment/:commentId', protect, deleteComment);
router.put('/:id/save', protect, savePost);
router.post('/:id/report', protect, reportPost);

module.exports = router;