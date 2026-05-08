const dotenv = require('dotenv');

dotenv.config({ quiet: true });

const NODE_ENV = process.env.NODE_ENV || 'development';

const getMongoUri = () => {
  if (NODE_ENV === 'test') {
    return process.env.MONGODB_URI_TEST;
  }

  if (NODE_ENV === 'production') {
    return process.env.MONGODB_URI_PRODUCTION;
  }

  return process.env.MONGODB_URI_DEVELOPMENT || process.env.MONGODB_URI_TEST;
};

const config = {
  env: NODE_ENV,
  port: Number(process.env.PORT) || 5055,
  clientUrl: process.env.CLIENT_URL || 'http://127.0.0.1:5173',
  mongoUri: getMongoUri(),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  }
};

module.exports = config;
