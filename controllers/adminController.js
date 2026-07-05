const User = require('../models/User');
const Post = require('../models/Post');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      verifiedUsers,
      totalPosts,
      reportedPosts,
      bannedUsers,
      totalMessages,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      Post.countDocuments(),
      Post.countDocuments({ isReported: true }),
      User.countDocuments({ isBanned: true }),
      Message.countDocuments(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = await User.countDocuments({
      createdAt: { $gte: today },
    });
    const newPostsToday = await Post.countDocuments({
      createdAt: { $gte: today },
    });

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username fullName avatar email createdAt isVerified');

    const recentPosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'username avatar');

    res.json({
      stats: {
        totalUsers,
        verifiedUsers,
        totalPosts,
        reportedPosts,
        bannedUsers,
        totalMessages,
        newUsersToday,
        newPostsToday,
      },
      recentUsers,
      recentPosts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const search = req.query.search || '';

    const query = search
      ? {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { fullName: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const users = await User.find(query)
      .select('-password -otp -otpExpiry -resetOtp -resetOtpExpiry')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(query);
    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const banUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (user.isAdmin) return res.status(400).json({ error: 'Cannot ban admin' });
    user.isBanned = !user.isBanned;
    await user.save();
    res.json({ message: user.isBanned ? 'Banned' : 'Unbanned', isBanned: user.isBanned });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (user.isAdmin) return res.status(400).json({ error: 'Cannot delete admin' });
    await Post.deleteMany({ user: user._id });
    await Notification.deleteMany({ $or: [{ recipient: user._id }, { sender: user._id }] });
    await Message.deleteMany({ $or: [{ sender: user._id }, { receiver: user._id }] });
    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'username avatar fullName');
    const total = await Post.countDocuments();
    res.json({ posts, total, page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getReportedPosts = async (req, res) => {
  try {
    const posts = await Post.find({ isReported: true })
      .populate('user', 'username avatar fullName')
      .populate('reports.user', 'username');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const adminDeletePost = async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const dismissReport = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Not found' });
    post.isReported = false;
    post.reports = [];
    post.reportCount = 0;
    await post.save();
    res.json({ message: 'Report dismissed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getStats, getAllUsers, banUser, deleteUser,
  getAllPosts, getReportedPosts, adminDeletePost, dismissReport,
};