const bcrypt = require('bcryptjs');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { validateRegisterPayload, validateVerificationCodePayload } = require('../utils/authValidation');
const { sendEmailVerificationCode, sendStaffLoginCode } = require('../services/emailService');
const { createTokenPair, verifyRefreshToken, compareRefreshToken } = require('../services/tokenService');
const {
  createEmailVerificationCode,
  hashValue,
  compareValue,
  sanitizeUser
} = require('../services/authService');

const codeLifetimeMs = 15 * 60 * 1000;

const createEmailResponse = ({ message, user, emailInfo }) => ({
  message,
  email: user.email,
  developmentEmailPreviewUrl: emailInfo.previewUrl || null,
  developmentEmailCode: emailInfo.developmentCode || null,
  emailDeliveryError: emailInfo.deliveryError || null
});

const issueTokens = async (user) => {
  const tokens = await createTokenPair(user);
  user.refreshTokenHash = tokens.refreshTokenHash;
  user.lastSeenAt = new Date();
  await user.save();

  return {
    user: sanitizeUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken
  };
};

const setCode = async (user, fields) => {
  const code = createEmailVerificationCode();
  user[fields.hash] = await hashValue(code);
  user[fields.expiresAt] = new Date(Date.now() + codeLifetimeMs);
  await user.save();

  return code;
};

const sendCodeForUser = async (user) => {
  const code = await setCode(user, {
    hash: 'emailVerificationCodeHash',
    expiresAt: 'emailVerificationCodeExpiresAt'
  });

  return sendEmailVerificationCode({ email: user.email, code });
};

const sendLoginCodeForStaff = async (user) => {
  const code = await setCode(user, {
    hash: 'loginCodeHash',
    expiresAt: 'loginCodeExpiresAt'
  });

  return sendStaffLoginCode({ email: user.email, code });
};

const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const errors = validateRegisterPayload({ email: normalizedEmail, password });

  if (Object.keys(errors).length > 0) {
    res.status(400);
    return res.json({ message: 'Проверьте данные регистрации', errors });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser && existingUser.isEmailVerified) {
    res.status(409);
    return res.json({ message: 'Пользователь с таким email уже зарегистрирован' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user =
    existingUser ||
    new User({
      email: normalizedEmail,
      passwordHash,
      role: 'user'
    });

  if (existingUser) {
    user.passwordHash = passwordHash;
  }

  const emailInfo = await sendCodeForUser(user);

  res.status(existingUser ? 200 : 201).json(
    createEmailResponse({
      message: emailInfo.deliveryError
        ? 'Код создан. Почтовый сервис разработки недоступен, используйте dev-код ниже.'
        : 'Код подтверждения отправлен на email',
      user,
      emailInfo
    })
  );
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const errors = validateVerificationCodePayload({ email: normalizedEmail, code });

  if (Object.keys(errors).length > 0) {
    res.status(400);
    return res.json({ message: 'Проверьте код подтверждения', errors });
  }

  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !user.emailVerificationCodeHash) {
    res.status(400);
    return res.json({ message: 'Код подтверждения не найден' });
  }

  if (user.emailVerificationCodeExpiresAt < new Date()) {
    res.status(400);
    return res.json({ message: 'Код подтверждения истёк' });
  }

  const isValidCode = await compareValue(code, user.emailVerificationCodeHash);

  if (!isValidCode) {
    res.status(400);
    return res.json({ message: 'Неверный код подтверждения' });
  }

  user.isEmailVerified = true;
  user.emailVerifiedAt = new Date();
  user.emailVerificationCodeHash = null;
  user.emailVerificationCodeExpiresAt = null;

  const session = await issueTokens(user);

  res.json({
    message: 'Email подтверждён',
    ...session
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !user.isActive || !(await bcrypt.compare(String(password || ''), user.passwordHash))) {
    res.status(401);
    return res.json({ message: 'Неверный email или пароль' });
  }

  if (user.role !== 'user') {
    res.status(403);
    return res.json({ message: 'Для админа и модератора используйте вход с кодом подтверждения' });
  }

  if (!user.isEmailVerified) {
    res.status(403);
    return res.json({ message: 'Сначала подтвердите email' });
  }

  const session = await issueTokens(user);

  res.json({
    message: 'Вход выполнен',
    ...session
  });
});

const requestStaffLoginCode = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });

  if (
    !user ||
    !user.isActive ||
    !['admin', 'moderator'].includes(user.role) ||
    !(await bcrypt.compare(String(password || ''), user.passwordHash))
  ) {
    res.status(401);
    return res.json({ message: 'Неверный email или пароль сотрудника' });
  }

  const emailInfo = await sendLoginCodeForStaff(user);

  res.json(
    createEmailResponse({
      message: emailInfo.deliveryError
        ? 'Код входа создан. Почтовый сервис разработки недоступен, используйте dev-код ниже.'
        : 'Код входа отправлен на email',
      user,
      emailInfo
    })
  );
});

const verifyStaffLoginCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const errors = validateVerificationCodePayload({ email: normalizedEmail, code });

  if (Object.keys(errors).length > 0) {
    res.status(400);
    return res.json({ message: 'Проверьте код входа', errors });
  }

  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !user.isActive || !['admin', 'moderator'].includes(user.role) || !user.loginCodeHash) {
    res.status(400);
    return res.json({ message: 'Код входа не найден' });
  }

  if (user.loginCodeExpiresAt < new Date()) {
    res.status(400);
    return res.json({ message: 'Код входа истёк' });
  }

  const isValidCode = await compareValue(code, user.loginCodeHash);

  if (!isValidCode) {
    res.status(400);
    return res.json({ message: 'Неверный код входа' });
  }

  user.loginCodeHash = null;
  user.loginCodeExpiresAt = null;

  const session = await issueTokens(user);

  res.json({
    message: 'Вход выполнен',
    ...session
  });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400);
    return res.json({ message: 'Refresh token обязателен' });
  }

  const payload = verifyRefreshToken(refreshToken);
  const user = await User.findById(payload.sub);

  if (!user || !user.isActive || !user.refreshTokenHash || !(await compareRefreshToken(refreshToken, user.refreshTokenHash))) {
    res.status(401);
    return res.json({ message: 'Refresh token недействителен' });
  }

  const session = await issueTokens(user);

  res.json(session);
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

const logout = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.refreshTokenHash = null;
    user.lastSeenAt = new Date();
    await user.save();
  }

  res.json({ message: 'Выход выполнен' });
});

const resendCode = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    res.status(404);
    return res.json({ message: 'Пользователь не найден' });
  }

  if (user.isEmailVerified) {
    res.status(400);
    return res.json({ message: 'Email уже подтверждён' });
  }

  const emailInfo = await sendCodeForUser(user);

  res.json(
    createEmailResponse({
      message: emailInfo.deliveryError
        ? 'Новый код создан. Почтовый сервис разработки недоступен, используйте dev-код ниже.'
        : 'Новый код отправлен на email',
      user,
      emailInfo
    })
  );
});

module.exports = {
  register,
  verifyEmail,
  login,
  requestStaffLoginCode,
  verifyStaffLoginCode,
  refresh,
  me,
  logout,
  resendCode
};
