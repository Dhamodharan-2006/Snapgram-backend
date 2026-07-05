const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { uploadToCloudinary } = require('../config/cloudinary');

const createPost = async (req, res) => {
  try {
    const { caption, location, tags } = req.body;
    const images = [];
    let video = '';
    let mediaType = 'text';

    if (req.files?.media) {
      for (const file of req.files.media) {
        const isVideo = file.mimetype.startsWith('video/');
        const result = await uploadToCloudinary(
          file.buffer,
          'snapgram/posts',
          isVideo ? 'video' : 'image'
        );
        if (isVideo) {
          video = result.secure_url;
          mediaType = 'video';
        } else {
          images.push(result.secure_url);
          mediaType = 'image';
        }
      }
    }

    const post = await Post.create({
      user: req.user._id,
      caption,
      images,
      video,
      mediaType: images.length > 0 ? 'image' : mediaType,
      location: location || '',
      tags: tags ? tags.split(',').map(t => t.trim().replace('#', '')) : [],
    });

    await post.populate('user', 'username avatar fullName');
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const current = await User.findById(req.user._id);

    const posts = await Post.find({
      user: { $in: [...current.following, current._id] },
      isArchived: false,
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'username avatar fullName isVerified')
      .populate('comments.user', 'username avatar');

    res.json({ posts, page, hasMore: posts.length === limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getExplorePosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 18;
    const posts = await Post.find({ isArchived: false })
      .sort({ likes: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'username avatar fullName');
    res.json({ posts, page, hasMore: posts.length === limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username avatar fullName isVerified')
      .populate('comments.user', 'username avatar fullName')
      .populate('comments.replies.user', 'username avatar');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    post.views += 1;
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const isLiked = post.likes.includes(req.user._id);
    if (isLiked) {
      post.likes.pull(req.user._id);
    } else {
      post.likes.push(req.user._id);
      if (!post.user.equals(req.user._id)) {
        await Notification.create({
          recipient: post.user,
          sender: req.user._id,
          type: 'like',
          post: post._id,
          text: `${req.user.username} liked your post`,
        });
      }
    }
    await post.save();
    res.json({ likes: post.likes.length, isLiked: !isLiked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    post.comments.push({ user: req.user._id, text });
    await post.save();
    await post.populate('comments.user', 'username avatar fullName');

    const newComment = post.comments[post.comments.length - 1];

    if (!post.user.equals(req.user._id)) {
      await Notification.create({
        recipient: post.user,
        sender: req.user._id,
        type: 'comment',
        post: post._id,
        text: `${req.user.username} commented: ${text.substring(0, 50)}`,
      });
    }

    res.json(newComment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (
      !comment.user.equals(req.user._id) &&
      !post.user.equals(req.user._id)
    ) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    comment.deleteOne();
    await post.save();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!post.user.equals(req.user._id) && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const savePost = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const isSaved = user.savedPosts.includes(req.params.id);
    if (isSaved) {
      user.savedPosts.pull(req.params.id);
    } else {
      user.savedPosts.push(req.params.id);
    }
    await user.save();
    res.json({ isSaved: !isSaved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedPosts',
      populate: { path: 'user', select: 'username avatar fullName' },
    });
    res.json(user.savedPosts.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const reportPost = async (req, res) => {
  try {
    const { reason } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });

    const already = post.reports.find(r => r.user?.equals(req.user._id));
    if (already) return res.status(400).json({ error: 'Already reported' });

    post.reports.push({ user: req.user._id, reason });
    post.reportCount += 1;
    if (post.reportCount >= 3) post.isReported = true;
    await post.save();
    res.json({ message: 'Reported' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    if (!post.user.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    post.caption = req.body.caption ?? post.caption;
    post.location = req.body.location ?? post.location;
    await post.save();
    await post.populate('user', 'username avatar fullName');
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createPost, getFeed, getExplorePosts, getPost,
  likePost, addComment, deleteComment, deletePost,
  savePost, getSavedPosts, reportPost, updatePost,
};