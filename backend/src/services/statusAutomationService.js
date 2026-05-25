const Auction = require('../models/Auction');
const AuctionReview = require('../models/AuctionReview');
const User = require('../models/User');
const VerificationRequest = require('../models/VerificationRequest');
const VerificationReview = require('../models/VerificationReview');
const { formatAuction } = require('../utils/auctionFormatters');
const { getCurrentTime } = require('./timeService');

const dayMs = 24 * 60 * 60 * 1000;
const staleVerificationComment = 'Модератор не рассмотрел заявку в течение суток';
const staleAuctionComment = 'Модератор не рассмотрел заявку в течение суток';

const resolveNow = async (now) => now || getCurrentTime();

const updateAuctionStatuses = async (now = null) => {
  const currentTime = await resolveNow(now);

  await Auction.updateMany(
    { status: 'application_waiting', 'schedule.applicationStartAt': { $lte: currentTime } },
    { $set: { status: 'applications_open' } }
  );

  await Auction.updateMany(
    { status: 'applications_open', 'schedule.applicationEndAt': { $lte: currentTime } },
    { $set: { status: 'bidding_waiting' } }
  );

  await Auction.updateMany(
    { status: 'bidding_waiting', 'schedule.biddingStartAt': { $lte: currentTime } },
    { $set: { status: 'bidding_active' } }
  );

  await Auction.updateMany(
    { status: 'bidding_active', 'schedule.biddingEndAt': { $lte: currentTime } },
    { $set: { status: 'finished_failed' } }
  );
};

const expirePendingVerifications = async (now = null) => {
  const currentTime = await resolveNow(now);
  const deadline = new Date(currentTime.getTime() - dayMs);
  const requests = await VerificationRequest.find({
    status: 'pending',
    submittedAt: { $lte: deadline }
  });

  if (requests.length === 0) {
    return;
  }

  await Promise.all(
    requests.map(async (request) => {
      request.status = 'rejected';
      request.moderationComment = staleVerificationComment;
      request.reviewedBy = null;
      request.reviewedAt = currentTime;
      await request.save();

      await User.findByIdAndUpdate(request.user, { verificationStatus: 'rejected' });

      await VerificationReview.create({
        verificationRequest: request._id,
        user: request.user,
        moderator: null,
        action: 'rejected',
        comment: staleVerificationComment
      });
    })
  );
};

const expirePendingAuctions = async (now = null) => {
  const currentTime = await resolveNow(now);
  const deadline = new Date(currentTime.getTime() - dayMs);
  const auctions = await Auction.find({
    status: 'pending',
    submittedAt: { $lte: deadline }
  });

  if (auctions.length === 0) {
    return;
  }

  await Promise.all(
    auctions.map(async (auction) => {
      const snapshot = formatAuction(auction);

      auction.status = 'returned';
      auction.moderationComment = staleAuctionComment;
      auction.reviewedBy = null;
      auction.reviewedAt = currentTime;
      auction.lotNumber = undefined;
      await auction.save();

      await AuctionReview.create({
        auction: auction._id,
        owner: auction.owner,
        moderator: null,
        action: 'returned',
        comment: staleAuctionComment,
        auctionSnapshot: snapshot
      });
    })
  );
};

const runStatusAutomation = async (now = null) => {
  const currentTime = await resolveNow(now);
  await updateAuctionStatuses(currentTime);
  await expirePendingVerifications(currentTime);
  await expirePendingAuctions(currentTime);
};

const startStatusAutomation = () => {
  runStatusAutomation().catch((error) => {
    console.error('Status automation failed', error);
  });

  return setInterval(() => {
    runStatusAutomation().catch((error) => {
      console.error('Status automation failed', error);
    });
  }, 60 * 1000);
};

module.exports = {
  expirePendingAuctions,
  expirePendingVerifications,
  runStatusAutomation,
  startStatusAutomation,
  updateAuctionStatuses
};
