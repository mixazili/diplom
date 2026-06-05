const VerificationRequest = require('../models/VerificationRequest');
const VerificationReview = require('../models/VerificationReview');
const Auction = require('../models/Auction');
const AuctionReview = require('../models/AuctionReview');
const Counter = require('../models/Counter');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { formatReview, formatVerification } = require('../utils/staffFormatters');
const { formatAuction, formatAuctionReview } = require('../utils/auctionFormatters');
const { expirePendingAuctions, expirePendingVerifications, updateAuctionStatuses } = require('../services/statusAutomationService');

const populateVerification = (query) => query.populate('user').populate('reviewedBy');

const listPendingVerifications = asyncHandler(async (req, res) => {
  await expirePendingVerifications();
  const verifications = await populateVerification(
    VerificationRequest.find({ status: 'pending' }).sort({ submittedAt: 1 })
  );

  res.json({ verifications: verifications.map(formatVerification) });
});

const getVerificationDetails = asyncHandler(async (req, res) => {
  const verification = await populateVerification(VerificationRequest.findById(req.params.id));

  if (!verification) {
    res.status(404);
    return res.json({ message: 'Заявка на верификацию не найдена' });
  }

  res.json({ verification: formatVerification(verification) });
});

const createReview = async ({ verification, moderator, action, comment }) => {
  verification.status = action;
  verification.moderationComment = comment || '';
  verification.reviewedBy = moderator._id;
  verification.reviewedAt = new Date();
  await verification.save();

  const user = await User.findById(verification.user);
  user.verificationStatus = action;
  await user.save();

  return VerificationReview.create({
    verificationRequest: verification._id,
    user: user._id,
    moderator: moderator._id,
    action,
    comment: comment || ''
  });
};

const reviewVerification = (action) =>
  asyncHandler(async (req, res) => {
    const verification = await VerificationRequest.findById(req.params.id);

    if (!verification) {
      res.status(404);
      return res.json({ message: 'Заявка на верификацию не найдена' });
    }

    if (verification.status !== 'pending') {
      res.status(400);
      return res.json({ message: 'Заявка уже рассмотрена' });
    }

    const comment = String(req.body.comment || '').trim();

    if (action === 'rejected' && !comment) {
      res.status(400);
      return res.json({ message: 'При отклонении укажите причину' });
    }

    const review = await createReview({
      verification,
      moderator: req.user,
      action,
      comment
    });

    const populatedReview = await VerificationReview.findById(review._id)
      .populate('moderator')
      .populate('user')
      .populate({
        path: 'verificationRequest',
        populate: ['user', 'reviewedBy']
      });

    res.json({
      message: action === 'approved' ? 'Верификация одобрена' : 'Верификация отклонена',
      review: formatReview(populatedReview)
    });
  });

const listMyReviews = asyncHandler(async (req, res) => {
  const reviews = await VerificationReview.find({ moderator: req.user._id })
    .sort({ createdAt: -1 })
    .populate('moderator')
    .populate('user')
    .populate({
      path: 'verificationRequest',
      populate: ['user', 'reviewedBy']
    });

  res.json({ reviews: reviews.map(formatReview) });
});

const populateAuction = (query) => query.populate('owner').populate('reviewedBy');

const generateAuctionNumber = async () => {
  const year = new Date().getFullYear();
  const key = `auction-number:${year}`;
  const matcher = new RegExp(`^(?:LOT-)?${year}-(\\d+)$`);
  const existingNumbers = await Auction.find({
    auctionNumber: { $regex: matcher }
  }).select('auctionNumber').lean();
  const maxExisting = existingNumbers.reduce((max, auction) => {
    const match = String(auction.auctionNumber || '').match(matcher);
    const value = match ? Number(match[1]) : 0;
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  await Counter.findOneAndUpdate(
    { key },
    { $max: { value: maxExisting }, $setOnInsert: { key } },
    { upsert: true, returnDocument: 'after' }
  ).catch((error) => {
    if (error?.code !== 11000) {
      throw error;
    }
  });

  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 }, $setOnInsert: { key } },
    { upsert: true, returnDocument: 'after' }
  );

  return `${year}-${String(counter.value).padStart(6, '0')}`;
};

const listPendingAuctions = asyncHandler(async (req, res) => {
  await updateAuctionStatuses();
  await expirePendingAuctions();
  const auctions = await populateAuction(Auction.find({ status: 'pending' }).sort({ submittedAt: 1 }));

  res.json({ auctions: auctions.map(formatAuction) });
});

const getAuctionDetails = asyncHandler(async (req, res) => {
  const auction = await populateAuction(Auction.findById(req.params.id));

  if (!auction) {
    res.status(404);
    return res.json({ message: 'Аукцион не найден' });
  }

  res.json({ auction: formatAuction(auction) });
});

const createAuctionReview = async ({ auction, moderator, action, comment }) => {
  const snapshot = formatAuction(auction);

  auction.status = action === 'approved' ? 'application_waiting' : 'returned';
  auction.moderationComment = comment || '';
  auction.reviewedBy = moderator._id;
  auction.reviewedAt = new Date();

  if (action === 'approved') {
    let saved = false;

    for (let attempt = 0; attempt < 20 && !saved; attempt += 1) {
      auction.auctionNumber = await generateAuctionNumber();

      try {
        await auction.save();
        saved = true;
      } catch (error) {
        if (error?.code !== 11000 || !String(error.message || '').includes('auctionNumber')) {
          throw error;
        }

        auction.auctionNumber = undefined;
      }
    }

    if (!saved) {
      throw new Error('Не удалось выдать уникальный номер аукциона');
    }
  } else {
    auction.auctionNumber = undefined;
    await auction.save();
  }

  return AuctionReview.create({
    auction: auction._id,
    owner: auction.owner,
    moderator: moderator._id,
    action,
    comment: comment || '',
    auctionSnapshot: snapshot
  });
};

const reviewAuction = (action) =>
  asyncHandler(async (req, res) => {
    const auction = await Auction.findById(req.params.id).populate('owner').populate('reviewedBy');

    if (!auction) {
      res.status(404);
      return res.json({ message: 'Аукцион не найден' });
    }

    if (auction.status !== 'pending') {
      res.status(400);
      return res.json({ message: 'Аукцион уже рассмотрен или не ожидает проверки' });
    }

    const comment = String(req.body.comment || '').trim();

    if (action === 'returned' && !comment) {
      res.status(400);
      return res.json({ message: 'При возврате на доработку укажите причину' });
    }

    const review = await createAuctionReview({
      auction,
      moderator: req.user,
      action,
      comment
    });

    const populatedReview = await AuctionReview.findById(review._id)
      .populate('moderator')
      .populate('owner')
      .populate({
        path: 'auction',
        populate: ['owner', 'reviewedBy']
      });

    res.json({
      message: action === 'approved' ? 'Аукцион одобрен' : 'Аукцион возвращен на доработку',
      review: formatAuctionReview(populatedReview)
    });
  });

const listMyAuctionReviews = asyncHandler(async (req, res) => {
  await expirePendingAuctions();
  const reviews = await AuctionReview.find({ moderator: req.user._id })
    .sort({ createdAt: -1 })
    .populate('moderator')
    .populate('owner')
    .populate({
      path: 'auction',
      populate: ['owner', 'reviewedBy']
    });

  res.json({ reviews: reviews.map(formatAuctionReview) });
});

module.exports = {
  listPendingVerifications,
  getVerificationDetails,
  approveVerification: reviewVerification('approved'),
  rejectVerification: reviewVerification('rejected'),
  listMyReviews,
  listPendingAuctions,
  getAuctionDetails,
  approveAuction: reviewAuction('approved'),
  returnAuction: reviewAuction('returned'),
  listMyAuctionReviews
};
