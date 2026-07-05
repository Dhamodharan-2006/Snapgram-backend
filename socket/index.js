const { Server } = require('socket.io');
const User = require('../models/User');

const onlineUsers = new Map();

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'https://snapgram-frontend-yfp0.onrender.com',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId && userId !== 'undefined') {
      onlineUsers.set(userId, socket.id);
      User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() }).catch(() => {});
      io.emit('online_users', Array.from(onlineUsers.keys()));
    }

    socket.on('send_message', async (data) => {
      const receiverSocket = onlineUsers.get(data.receiverId);
      if (receiverSocket) {
        io.to(receiverSocket).emit('receive_message', data);
      }
    });

    socket.on('typing', (data) => {
      const receiverSocket = onlineUsers.get(data.receiverId);
      if (receiverSocket) {
        io.to(receiverSocket).emit('typing', { senderId: data.senderId });
      }
    });

    socket.on('stop_typing', (data) => {
      const receiverSocket = onlineUsers.get(data.receiverId);
      if (receiverSocket) {
        io.to(receiverSocket).emit('stop_typing', { senderId: data.senderId });
      }
    });

    socket.on('new_notification', (data) => {
      const receiverSocket = onlineUsers.get(data.recipientId);
      if (receiverSocket) {
        io.to(receiverSocket).emit('notification', data);
      }
    });

    socket.on('disconnect', () => {
      if (userId) {
        onlineUsers.delete(userId);
        User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() }).catch(() => {});
        io.emit('online_users', Array.from(onlineUsers.keys()));
      }
    });
  });

  return io;
};

module.exports = { initSocket };