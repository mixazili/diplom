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

const wait = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const isRetryableConnectionError = (error) =>
  ['ECONNRESET', 'ETIMEOUT', 'ENOTFOUND', 'EAI_AGAIN'].includes(error.code) ||
  ['ECONNRESET', 'ETIMEOUT', 'ENOTFOUND', 'EAI_AGAIN'].includes(error.cause?.code) ||
  error.name === 'MongoNetworkError' ||
  error.name === 'MongooseServerSelectionError' ||
  error.reason?.type === 'ReplicaSetNoPrimary' ||
  error.cause?.type === 'ReplicaSetNoPrimary' ||
  error.code === 'ETIMEOUT';

const ensureAuctionIndexes = async () => {
  const collection = mongoose.connection.db.collection('auctions');
  await collection.updateMany({ lotNumber: null }, { $unset: { lotNumber: '' } }).catch(() => {});

  const indexes = await collection.indexes().catch(() => []);
  const lotNumberIndex = indexes.find((index) => index.name === 'lotNumber_1');
  const hasDesiredPartialIndex =
    lotNumberIndex?.unique &&
    lotNumberIndex.partialFilterExpression?.lotNumber?.$type === 'string';

  if (!hasDesiredPartialIndex) {
    if (lotNumberIndex) {
      await collection.dropIndex('lotNumber_1');
    }
    await collection.createIndex(
      { lotNumber: 1 },
      {
        unique: true,
        name: 'lotNumber_1',
        partialFilterExpression: { lotNumber: { $type: 'string' } }
      }
    );
  }
};

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

  const attempts = config.env === 'test' ? 1 : 8;
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 15000,
        maxPoolSize: config.env === 'test' ? 1 : 10
      });
      await ensureAuctionIndexes();
      return mongoose.connection;
    } catch (error) {
      lastError = error;

      if (!isRetryableConnectionError(error) || attempt === attempts) {
        throw error;
      }

      await mongoose.disconnect().catch(() => {});
      console.warn(`MongoDB connection failed (${error.message}). Retrying ${attempt}/${attempts - 1}...`);
      await wait(1500 * attempt);
    }
  }

  throw lastError;
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
