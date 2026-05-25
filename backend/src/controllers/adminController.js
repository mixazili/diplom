const bcrypt = require('bcryptjs');
const User = require('../models/User');
const VerificationRequest = require('../models/VerificationRequest');
const VerificationReview = require('../models/VerificationReview');
const AuctionReview = require('../models/AuctionReview');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config/env');
const { validateRegisterPayload } = require('../utils/authValidation');
const { formatModerator, formatReview, formatVerification } = require('../utils/staffFormatters');
const { formatAuctionReview } = require('../utils/auctionFormatters');
const { expirePendingAuctions, expirePendingVerifications, runStatusAutomation, updateAuctionStatuses } = require('../services/statusAutomationService');
const { advanceTimeByMs, getCurrentTime, getTimeOffsetMs, resetTimeOffset, setTimeOffsetMs } = require('../services/timeService');

const listModerators = asyncHandler(async (req, res) => {
  const moderators = await User.find({ role: 'moderator', isActive: true }).sort({ createdAt: -1 });

  res.json({ moderators: moderators.map(formatModerator) });
});

const createModerator = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const errors = validateRegisterPayload({ email: normalizedEmail, password });

  if (Object.keys(errors).length > 0) {
    res.status(400);
    return res.json({ message: 'Проверьте данные модератора', errors });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser && existingUser.isActive) {
    res.status(409);
    return res.json({ message: 'Пользователь с таким email уже существует' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const moderator =
    existingUser ||
    new User({
      email: normalizedEmail
    });

  moderator.passwordHash = passwordHash;
  moderator.role = 'moderator';
  moderator.isActive = true;
  moderator.isEmailVerified = true;
  moderator.emailVerifiedAt = moderator.emailVerifiedAt || new Date();
  moderator.verificationStatus = 'approved';
  moderator.createdBy = req.user._id;
  await moderator.save();

  res.status(201).json({
    message: 'Модератор создан',
    moderator: formatModerator(moderator)
  });
});

const deleteModerator = asyncHandler(async (req, res) => {
  const moderator = await User.findOne({ _id: req.params.id, role: 'moderator', isActive: true });

  if (!moderator) {
    res.status(404);
    return res.json({ message: 'Модератор не найден' });
  }

  moderator.isActive = false;
  moderator.refreshTokenHash = null;
  moderator.loginCodeHash = null;
  moderator.loginCodeExpiresAt = null;
  await moderator.save();

  res.json({ message: 'Модератор удалён' });
});

const listAllReviews = asyncHandler(async (req, res) => {
  await expirePendingVerifications();
  const reviews = await VerificationReview.find({})
    .sort({ createdAt: -1 })
    .populate('moderator')
    .populate('user')
    .populate({
      path: 'verificationRequest',
      populate: ['user', 'reviewedBy']
    });

  res.json({ reviews: reviews.map(formatReview) });
});

const getVerificationDetails = asyncHandler(async (req, res) => {
  const verification = await VerificationRequest.findById(req.params.id).populate('user').populate('reviewedBy');

  if (!verification) {
    res.status(404);
    return res.json({ message: 'Заявка на верификацию не найдена' });
  }

  res.json({ verification: formatVerification(verification) });
});

const listAllAuctionReviews = asyncHandler(async (req, res) => {
  await updateAuctionStatuses();
  await expirePendingAuctions();
  const reviews = await AuctionReview.find({})
    .sort({ createdAt: -1 })
    .populate('moderator')
    .populate('owner')
    .populate({
      path: 'auction',
      populate: ['owner', 'reviewedBy']
    });

  res.json({ reviews: reviews.map(formatAuctionReview) });
});

const ensureDevTimeEnabled = (res) => {
  if (config.env === 'production') {
    res.status(404);
    res.json({ message: 'Инструмент виртуального времени доступен только в dev-среде' });
    return false;
  }

  return true;
};

const formatVirtualTime = async () => {
  const offsetMs = await getTimeOffsetMs();
  const currentTime = await getCurrentTime();

  return {
    enabled: config.env !== 'production',
    environment: config.env,
    offsetMs,
    offsetHours: Number((offsetMs / 60 / 60 / 1000).toFixed(2)),
    realTime: new Date().toISOString(),
    currentTime: currentTime.toISOString()
  };
};

const getDevTime = asyncHandler(async (req, res) => {
  if (!ensureDevTimeEnabled(res)) {
    return;
  }

  res.json({ time: await formatVirtualTime() });
});

const advanceDevTime = asyncHandler(async (req, res) => {
  if (!ensureDevTimeEnabled(res)) {
    return;
  }

  const deltaMs = Number(req.body.deltaMs);

  if (!Number.isFinite(deltaMs)) {
    res.status(400);
    return res.json({ message: 'Передайте deltaMs числом' });
  }

  await advanceTimeByMs(deltaMs);
  await runStatusAutomation();

  res.json({ time: await formatVirtualTime() });
});

const setDevTime = asyncHandler(async (req, res) => {
  if (!ensureDevTimeEnabled(res)) {
    return;
  }

  const targetTime = new Date(req.body.currentTime);

  if (Number.isNaN(targetTime.getTime())) {
    res.status(400);
    return res.json({ message: 'Передайте currentTime в формате даты и времени' });
  }

  await setTimeOffsetMs(targetTime.getTime() - Date.now());
  await runStatusAutomation();

  res.json({ time: await formatVirtualTime() });
});

const resetDevTime = asyncHandler(async (req, res) => {
  if (!ensureDevTimeEnabled(res)) {
    return;
  }

  await resetTimeOffset();
  await runStatusAutomation();

  res.json({ time: await formatVirtualTime() });
});

module.exports = {
  listModerators,
  createModerator,
  deleteModerator,
  listAllReviews,
  getVerificationDetails,
  listAllAuctionReviews,
  getDevTime,
  advanceDevTime,
  setDevTime,
  resetDevTime
};
