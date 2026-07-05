const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  image: { type: String, default: '' },
  video: { type: String, default: '' },
  text: { type: String, default: '' },
  textColor: { type: String, default: '#ffffff' },
  bgColor: { type: String, default: '#7c3aed' },
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: { expires: 0 },
  },
}, { timestamps: true });

module.exports = mongoose.model('Story', storySchema);