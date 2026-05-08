const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

const signAccessToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );

const signRefreshToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      tokenType: 'refresh'
    },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

const createTokenPair = async (user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  return {
    accessToken,
    refreshToken,
    refreshTokenHash
  };
};

const verifyAccessToken = (token) => jwt.verify(token, config.jwt.accessSecret);
const verifyRefreshToken = (token) => jwt.verify(token, config.jwt.refreshSecret);
const compareRefreshToken = (token, hash) => bcrypt.compare(token, hash);

module.exports = {
  createTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  compareRefreshToken
};
