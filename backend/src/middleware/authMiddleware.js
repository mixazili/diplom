const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../services/tokenService');

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Необходима авторизация');
  }

  const token = authHeader.split(' ')[1];
  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    res.status(401);
    throw new Error('Токен авторизации недействителен');
  }
  const user = await User.findById(payload.sub).select('-passwordHash -refreshTokenHash');

  if (!user) {
    res.status(401);
    throw new Error('Пользователь не найден');
  }

  req.user = user;
  next();
});

module.exports = {
  authenticate
};
