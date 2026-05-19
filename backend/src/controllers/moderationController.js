const VerificationRequest = require('../models/VerificationRequest');
const VerificationReview = require('../models/VerificationReview');
const Auction = require('../models/Auction');
const AuctionReview = require('../models/AuctionReview');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { formatReview, formatVerification } = require('../utils/staffFormatters');
const { formatAuction, formatAuctionReview } = require('../utils/auctionFormatters');

const populateVerification = (query) => query.populate('user').populate('reviewedBy');

const listPendingVerifications = asyncHandler(async (req, res) => {
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

const listPendingAuctions = asyncHandler(async (req, res) => {
  const auctions = await populateAuction(Auction.find({ status: 'pending' }).sort({ submittedAt: 1 }));

  res.json({ auctions: auctions.map(formatAuction) });
});

const getAuctionDetails = asyncHandler(async (req, res) => {
  const auction = await populateAuction(Auction.findById(req.params.id));

  if (!auction) {
    res.status(404);
    return res.json({ message: 'Лот не найден' });
  }

  res.json({ auction: formatAuction(auction) });
});

const createAuctionReview = async ({ auction, moderator, action, comment }) => {
  const snapshot = formatAuction(auction);

  auction.status = action === 'approved' ? 'active' : 'returned';
  auction.moderationComment = comment || '';
  auction.reviewedBy = moderator._id;
  auction.reviewedAt = new Date();
  await auction.save();

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
      return res.json({ message: 'Лот не найден' });
    }

    if (auction.status !== 'pending') {
      res.status(400);
      return res.json({ message: 'Лот уже рассмотрен или не ожидает проверки' });
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
      message: action === 'approved' ? 'Лот одобрен' : 'Лот возвращен на доработку',
      review: formatAuctionReview(populatedReview)
    });
  });

const listMyAuctionReviews = asyncHandler(async (req, res) => {
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
