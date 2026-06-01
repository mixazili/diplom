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

  const user = await User.findById(payload.sub).select(
    '-passwordHash -refreshTokenHash -emailVerificationCodeHash -loginCodeHash'
  );

  if (!user || !user.isActive) {
    res.status(401);
    throw new Error('Пользователь не найден или отключён');
  }

  user.lastSeenAt = new Date();
  await user.save();

  req.user = user;
  next();
});

const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(authHeader.split(' ')[1]);
    const user = await User.findById(payload.sub).select(
      '-passwordHash -refreshTokenHash -emailVerificationCodeHash -loginCodeHash'
    );

    if (user?.isActive) {
      req.user = user;
    }
  } catch (error) {
    // Public endpoints keep working for guests if an optional token is stale.
  }

  next();
});

const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403);
    next(new Error('Недостаточно прав'));
    return;
  }

  next();
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRoles
};
