const mongoose = require('mongoose');
const config = require('./env');

const connectionStateByCode = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

const getConnectionState = () => ({
  code: mongoose.connection.readyState,
  status: connectionStateByCode[mongoose.connection.readyState] || 'unknown',
  name: mongoose.connection.name || null,
  host: mongoose.connection.host || null
});

const connectDatabase = async () => {
  if (!config.mongoUri) {
    throw new Error(`MongoDB URI is not configured for NODE_ENV=${config.env}`);
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return mongoose.connection;
  }

  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 15000,
    maxPoolSize: config.env === 'test' ? 1 : 10
  });
  return mongoose.connection;
};

const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(true);
  }
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getConnectionState
};
