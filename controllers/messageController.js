const Message = require('../models/Message');
const User = require('../models/User');

const getConversations = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'username avatar fullName isOnline lastSeen')
      .populate('receiver', 'username avatar fullName isOnline lastSeen');

    const map = new Map();
    messages.forEach(msg => {
      const other = msg.sender._id.equals(req.user._id)
        ? msg.receiver
        : msg.sender;
      const key = other._id.toString();
      if (!map.has(key)) {
        map.set(key, {
          user: other,
          lastMessage: msg,
          unreadCount:
            !msg.isRead && msg.receiver._id.equals(req.user._id) ? 1 : 0,
        });
      } else {
        const c = map.get(key);
        if (!msg.isRead && msg.receiver._id.equals(req.user._id)) {
          c.unreadCount += 1;
        }
      }
    });

    res.json(Array.from(map.values()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 30;

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id },
      ],
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar');

    await Message.updateMany(
      { sender: req.params.userId, receiver: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const receiver = await User.findById(req.params.userId);
    if (!receiver) return res.status(404).json({ error: 'User not found' });

    const message = await Message.create({
      sender: req.user._id,
      receiver: req.params.userId,
      text,
    });

    await message.populate('sender', 'username avatar fullName');
    await message.populate('receiver', 'username avatar fullName');
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    if (!msg.sender.equals(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    msg.isDeleted = true;
    msg.text = 'This message was deleted';
    await msg.save();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      isRead: false,
      isDeleted: false,
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getConversations, getMessages, sendMessage,
  deleteMessage, getUnreadCount,
};