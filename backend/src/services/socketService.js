const jwt = require('jsonwebtoken');
const config = require('../config/env');

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
  });

  return ioInstance;
};

const emitAuctionUpdate = (auctionId, payload) => {
  if (!ioInstance || !auctionId) {
    return;
  }

  ioInstance.to(`auction:${auctionId.toString()}`).emit('auction:update', payload);
};

module.exports = {
  emitAuctionUpdate,
  initSocketServer
};
