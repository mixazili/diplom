const VerificationRequest = require('../models/VerificationRequest');
const VerificationReview = require('../models/VerificationReview');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { formatReview, formatVerification } = require('../utils/staffFormatters');

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

module.exports = {
  listPendingVerifications,
  getVerificationDetails,
  approveVerification: reviewVerification('approved'),
  rejectVerification: reviewVerification('rejected'),
  listMyReviews
};
