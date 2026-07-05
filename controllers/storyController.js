const Story = require('../models/Story');
const User = require('../models/User');
const { uploadToCloudinary } = require('../config/cloudinary');

const createStory = async (req, res) => {
  try {
    const { text, textColor, bgColor } = req.body;
    let image = '';
    let video = '';

    if (req.file) {
      const isVideo = req.file.mimetype.startsWith('video/');
      const result = await uploadToCloudinary(
        req.file.buffer,
        'snapgram/stories',
        isVideo ? 'video' : 'image'
      );
      if (isVideo) video = result.secure_url;
      else image = result.secure_url;
    }

    const story = await Story.create({
      user: req.user._id,
      image,
      video,
      text: text || '',
      textColor: textColor || '#ffffff',
      bgColor: bgColor || '#7c3aed',
    });

    await story.populate('user', 'username avatar fullName');
    res.status(201).json(story);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getStories = async (req, res) => {
  try {
    const current = await User.findById(req.user._id);
    const following = [...current.following, current._id];

    const stories = await Story.find({
      user: { $in: following },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .populate('user', 'username avatar fullName');

    const grouped = [];
    const seen = new Set();
    stories.forEach(s => {
      const uid = s.user._id.toString();
      if (!seen.has(uid)) {
        seen.add(uid);
        grouped.push({
          user: s.user,
          stories: stories.filter(st => st.user._id.toString() === uid),
          hasUnseen: stories
            .filter(st => st.user._id.toString() === uid)
            .some(st => !st.viewers.includes(req.user._id)),
        });
      }
    });

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const viewStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Not found' });
    if (!story.viewers.includes(req.user._id)) {
      story.viewers.push(req.user._id);
      await story.save();
    }
    res.json({ message: 'Viewed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const likeStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Not found' });
    const liked = story.likes.includes(req.user._id);
    if (liked) story.likes.pull(req.user._id);
    else story.likes.push(req.user._id);
    await story.save();
    res.json({ isLiked: !liked, likes: story.likes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Not found' });
    if (!story.user.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await story.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createStory, getStories, viewStory, likeStory, deleteStory };