const jwt = require('jsonwebtoken');
const config = require('../config/env');
const Chat = require('../models/Chat');

let ioInstance = null;

const initSocketServer = (server) => {
  const { Server } = require('socket.io');

  ioInstance = new Server(server, {
    cors: {
      origin: config.clientUrl,
      credentials: true
    }
  });

  ioInstance.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (token) {
      try {
        socket.user = jwt.verify(token, config.jwt.accessSecret);
      } catch (error) {
        // Public auction rooms remain available if a stale token is passed.
      }
    }

    next();
  });

  ioInstance.on('connection', (socket) => {
    if (socket.user?.sub) {
      socket.join(`user:${socket.user.sub}`);
    }

    socket.on('auction:join', (auctionId) => {
      if (auctionId) {
        socket.join(`auction:${auctionId}`);
      }
    });

    socket.on('auction:leave', (auctionId) => {
      if (auctionId) {
        socket.leave(`auction:${auctionId}`);
      }
    });

    socket.on('chat:join', async (chatId) => {
      if (!chatId || !socket.user?.sub) {
        return;
      }

      let hasAccess = null;

      try {
        hasAccess = await Chat.exists({ _id: chatId, participants: socket.user.sub });
      } catch (error) {
        return;
      }

      if (hasAccess) {
        socket.join(`chat:${chatId}`);
      }
    });

    socket.on('chat:leave', (chatId) => {
      if (chatId) {
        socket.leave(`chat:${chatId}`);
      }
    });
  });

  return ioInstance;
};

const emitAuctionUpdate = (auctionId, payload) => {
  if (!ioInstance || !auctionId) {
    return;
  }

  ioInstance.to(`auction:${auctionId.toString()}`).emit('auction:update', payload);
};

const emitChatMessage = (chatId, payload) => {
  if (!ioInstance || !chatId) {
    return;
  }

  ioInstance.to(`chat:${chatId.toString()}`).emit('chat:message', payload);
};

const emitChatRead = (chatId, payload) => {
  if (!ioInstance || !chatId) {
    return;
  }

  ioInstance.to(`chat:${chatId.toString()}`).emit('chat:read', payload);
};

const emitUserNotification = (userId, payload) => {
  if (!ioInstance || !userId) {
    return;
  }

  ioInstance.to(`user:${userId.toString()}`).emit('notification:new', payload);
};

const emitUserCounters = (userId, payload) => {
  if (!ioInstance || !userId) {
    return;
  }

  ioInstance.to(`user:${userId.toString()}`).emit('user:counters', payload);
};

const emitUserChatIncoming = (userId, payload) => {
  if (!ioInstance || !userId) {
    return;
  }

  ioInstance.to(`user:${userId.toString()}`).emit('chat:incoming', payload);
};

module.exports = {
  emitAuctionUpdate,
  emitChatMessage,
  emitChatRead,
  emitUserCounters,
  emitUserChatIncoming,
  emitUserNotification,
  initSocketServer
};
