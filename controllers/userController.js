const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { uploadToCloudinary } = require('../config/cloudinary');

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password -otp -otpExpiry -resetOtp -resetOtpExpiry')
      .populate('followers', 'username avatar fullName isOnline')
      .populate('following', 'username avatar fullName isOnline');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const posts = await Post.find({ user: user._id, isArchived: false })
      .sort({ createdAt: -1 })
      .populate('user', 'username avatar fullName');

    res.json({ user, posts, totalPosts: posts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, bio, website, gender, isPrivate } = req.body;
    const user = await User.findById(req.user._id);

    if (fullName !== undefined) user.fullName = fullName;
    if (bio !== undefined) user.bio = bio;
    if (website !== undefined) user.website = website;
    if (gender !== undefined) user.gender = gender;
    if (isPrivate !== undefined) user.isPrivate = isPrivate === 'true' || isPrivate === true;

    if (req.files?.avatar) {
      const result = await uploadToCloudinary(
        req.files.avatar[0].buffer, 'snapgram/avatars', 'image'
      );
      user.avatar = result.secure_url;
    }

    if (req.files?.coverPhoto) {
      const result = await uploadToCloudinary(
        req.files.coverPhoto[0].buffer, 'snapgram/covers', 'image'
      );
      user.coverPhoto = result.secure_url;
    }

    await user.save();
    const updated = await User.findById(user._id).select('-password');
    res.json({ message: 'Profile updated!', user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const followUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    const current = await User.findById(req.user._id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target._id.equals(current._id)) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const isFollowing = current.following.includes(target._id);

    if (isFollowing) {
      current.following.pull(target._id);
      target.followers.pull(current._id);
      await current.save();
      await target.save();
      res.json({ message: 'Unfollowed', isFollowing: false, followerCount: target.followers.length });
    } else {
      current.following.push(target._id);
      target.followers.push(current._id);
      await current.save();
      await target.save();

      await Notification.create({
        recipient: target._id,
        sender: current._id,
        type: 'follow',
        text: `${current.username} started following you`,
      });

      res.json({ message: 'Followed', isFollowing: true, followerCount: target.followers.length });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { fullName: { $regex: q, $options: 'i' } },
      ],
      isVerified: true,
      isBanned: false,
    })
      .select('username fullName avatar followers isVerified isOnline')
      .limit(15);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getSuggestedUsers = async (req, res) => {
  try {
    const current = await User.findById(req.user._id);
    const users = await User.find({
      _id: { $nin: [...current.following, current._id] },
      isVerified: true,
      isBanned: false,
    })
      .select('username fullName avatar followers isOnline')
      .limit(6);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getFollowers = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('followers', 'username fullName avatar isOnline');
    res.json(user?.followers || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getFollowing = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('following', 'username fullName avatar isOnline');
    res.json(user?.following || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const ok = await require('bcryptjs').compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ error: 'Current password wrong' });
    user.password = await require('bcryptjs').hash(newPassword, 12);
    await user.save();
    res.json({ message: 'Password changed!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getUserProfile, updateProfile, followUser,
  searchUsers, getSuggestedUsers,
  getFollowers, getFollowing, changePassword,
};