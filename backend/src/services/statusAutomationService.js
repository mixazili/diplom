const Auction = require('../models/Auction');
const AuctionApplication = require('../models/AuctionApplication');
const AuctionReview = require('../models/AuctionReview');
const Bid = require('../models/Bid');
const Deposit = require('../models/Deposit');
const User = require('../models/User');
const VerificationRequest = require('../models/VerificationRequest');
const VerificationReview = require('../models/VerificationReview');
const { formatAuction } = require('../utils/auctionFormatters');
const { ensureAuctionProtocol } = require('./auctionProtocolService');
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

  const auctionsWithClosedApplications = await Auction.find({
    status: 'applications_open',
    'schedule.applicationEndAt': { $lte: currentTime }
  });

  await Promise.all(
    auctionsWithClosedApplications.map(async (auction) => {
      await AuctionApplication.updateMany(
        { auction: auction._id, status: 'deposit_required' },
        {
          $set: {
            status: 'rejected',
            rejectionReason: 'Задаток не оплачен до окончания приема заявок'
          }
        }
      );

      auction.status = 'bidding_waiting';
      await auction.save();
    })
  );

  await Auction.updateMany(
    { status: 'bidding_waiting', 'schedule.biddingStartAt': { $lte: currentTime } },
    { $set: { status: 'bidding_active' } }
  );

  const finishedAuctions = await Auction.find({
    status: 'bidding_active',
    'schedule.biddingEndAt': { $lte: currentTime }
  });

  await Promise.all(
    finishedAuctions.map(async (auction) => {
      const [participantsCount, latestBid] = await Promise.all([
        AuctionApplication.countDocuments({
          auction: auction._id,
          status: 'approved',
          participantNumber: { $ne: null }
        }),
        Bid.findOne({ auction: auction._id }).sort({ createdAt: -1 })
      ]);

      if (participantsCount === 0) {
        auction.status = 'finished_failed';
        auction.resultReason = 'Нет участников с оплаченным задатком';
        await auction.save();
        await ensureAuctionProtocol(auction);
        return;
      }

      if (!latestBid) {
        auction.status = 'finished_failed';
        auction.resultReason = 'За время торгов не было сделано ни одной ставки';
        await auction.save();
        await ensureAuctionProtocol(auction);
        await Deposit.updateMany({ auction: auction._id, status: 'paid' }, { $set: { status: 'refunded' } });
        return;
      }

      auction.status = 'finished_success';
      auction.resultReason = null;
      auction.winner = latestBid.bidder;
      auction.winnerParticipantNumber = latestBid.participantNumber;
      auction.winningBidAmount = latestBid.amount;
      auction.winningBidAt = latestBid.createdAt;
      await auction.save();
      await ensureAuctionProtocol(auction);

      await AuctionApplication.updateOne(
        {
          auction: auction._id,
          participant: latestBid.bidder,
          participantNumber: latestBid.participantNumber
        },
        { $set: { lotPaymentStatus: 'pending' } }
      );

      await Deposit.updateMany(
        { auction: auction._id, payer: { $ne: latestBid.bidder }, status: 'paid' },
        { $set: { status: 'refunded' } }
      );
    })
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
      auction.auctionNumber = undefined;
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
