const Auction = require('../models/Auction');
const AuctionApplication = require('../models/AuctionApplication');
const Bid = require('../models/Bid');
const Deposit = require('../models/Deposit');
const asyncHandler = require('../utils/asyncHandler');
const { formatAuction } = require('../utils/auctionFormatters');
const { updateAuctionStatuses } = require('../services/statusAutomationService');
const { ensureAuctionProtocol } = require('../services/auctionProtocolService');
const { getCurrentTime } = require('../services/timeService');
const { emitAuctionUpdate } = require('../services/socketService');

const minParticipantNumber = 10000000;
const maxParticipantNumber = 99999999;
const extensionWindowMs = 10 * 60 * 1000;

const getCurrentDecreasePrice = (auction, now) => {
  const pricing = auction.pricing || {};
  const schedule = auction.schedule || {};
  const startPrice = Number(pricing.priceWithVat || 0);
  const minPrice = Number(pricing.minPriceWithVat || startPrice);
  const stepsCount = Math.max(Number(pricing.bidStepsCount || 0), 1);
  const step = Number(pricing.calculatedBidStep || ((startPrice - minPrice) / stepsCount));
  const start = new Date(schedule.biddingStartAt).getTime();
  const end = new Date(schedule.biddingEndAt).getTime();
  const current = now.getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || current <= start) {
    return startPrice;
  }

  if (current >= end) {
    return minPrice;
  }

  const stepDuration = (end - start) / stepsCount;
  const elapsedSteps = Math.floor((current - start) / stepDuration);
  return Math.max(minPrice, startPrice - elapsedSteps * step);
};

const formatBid = (bid) => ({
  id: bid._id.toString(),
  amount: bid.amount,
  increment: bid.increment,
  createdAt: bid.createdAt,
  participantNumber: bid.participantNumber,
  bidder: bid.bidder ? { id: bid.bidder.toString() } : null
});

const listBids = async (auctionId) => {
  const bids = await Bid.find({ auction: auctionId }).sort({ createdAt: 1 });
  return bids.map(formatBid);
};

const getAdmittedParticipantCount = (auctionId) =>
  AuctionApplication.countDocuments({
    auction: auctionId,
    status: 'approved',
    participantNumber: { $ne: null }
  });

const formatAuctionWithStats = async (auction) => ({
  ...formatAuction(auction),
  participantStats: {
    admittedCount: await getAdmittedParticipantCount(auction._id)
  }
});

const getAuctionForParticipation = async (auctionId) => {
  await updateAuctionStatuses();
  return Auction.findById(auctionId);
};

const ensureUserCanParticipate = (req, res, auction) => {
  if (!auction) {
    res.status(404);
    return 'Аукцион не найден';
  }

  if (req.user.role !== 'user' || req.user.verificationStatus !== 'approved') {
    res.status(403);
    return 'Участвовать в торгах могут только верифицированные пользователи';
  }

  if (auction.owner?.toString() === req.user._id.toString()) {
    res.status(403);
    return 'Продавец не может участвовать в собственном аукционе';
  }

  return '';
};

const generateParticipantNumber = async (auctionId) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const value = Math.floor(minParticipantNumber + Math.random() * (maxParticipantNumber - minParticipantNumber));
    const exists = await AuctionApplication.exists({ auction: auctionId, participantNumber: value });

    if (!exists) {
      return value;
    }
  }

  throw new Error('Не удалось выдать номер участника');
};

const getLatestBid = (auctionId) => Bid.findOne({ auction: auctionId }).sort({ createdAt: -1 });

const getCurrentPrice = async (auction, now = new Date()) => {
  if (auction.pricing?.auctionType === 'decrease') {
    return getCurrentDecreasePrice(auction, now);
  }

  const latestBid = await getLatestBid(auction._id);
  return latestBid?.amount || auction.pricing?.priceWithVat || 0;
};

const buildAuctionRealtimePayload = async (auctionId, userId = null) => {
  const [auction, bids, application, deposit] = await Promise.all([
    Auction.findById(auctionId),
    listBids(auctionId),
    userId ? AuctionApplication.findOne({ auction: auctionId, participant: userId }) : null,
    userId ? Deposit.findOne({ auction: auctionId, payer: userId }) : null
  ]);

  return {
    auction: await formatAuctionWithStats(auction),
    bids,
    viewer: {
      isOwner: Boolean(userId && auction.owner?.toString() === userId.toString()),
      participation: application
        ? {
            status: application.status,
            participantNumber: application.participantNumber || null,
            rejectionReason: application.rejectionReason || null,
            depositStatus: deposit?.status || null,
            depositPaidAt: deposit?.paidAt || null,
            lotPaymentStatus: application.lotPaymentStatus,
            lotPaidAt: application.lotPaidAt || null
          }
        : null
    }
  };
};

const broadcastAuction = async (auctionId) => {
  const auction = await Auction.findById(auctionId);
  const bids = await listBids(auctionId);

  emitAuctionUpdate(auctionId, {
    auction: await formatAuctionWithStats(auction),
    bids
  });
};

const applyForAuction = asyncHandler(async (req, res) => {
  const auction = await getAuctionForParticipation(req.params.id);
  const error = ensureUserCanParticipate(req, res, auction);

  if (error) {
    return res.json({ message: error });
  }

  if (auction.status !== 'applications_open') {
    res.status(400);
    return res.json({ message: 'Подача заявок сейчас закрыта' });
  }

  let application = await AuctionApplication.findOne({ auction: auction._id, participant: req.user._id });

  if (!application) {
    application = await AuctionApplication.create({
      auction: auction._id,
      participant: req.user._id,
      status: 'deposit_required'
    });
  }

  if (application.status === 'rejected') {
    application.status = 'deposit_required';
    application.rejectionReason = null;
    application.lotPaymentStatus = 'not_required';
    application.lotPaidAt = null;
    await application.save();
  }

  await Deposit.findOneAndUpdate(
    { auction: auction._id, payer: req.user._id },
    { $setOnInsert: { amount: auction.pricing.depositAmount || 0, status: 'pending' } },
    { upsert: true, new: true }
  );

  const payload = await buildAuctionRealtimePayload(auction._id, req.user._id);
  res.status(201).json({ message: 'Заявка подана. Необходимо оплатить задаток', ...payload });
});

const payDeposit = asyncHandler(async (req, res) => {
  const auction = await getAuctionForParticipation(req.params.id);
  const error = ensureUserCanParticipate(req, res, auction);

  if (error) {
    return res.json({ message: error });
  }

  if (auction.status !== 'applications_open') {
    res.status(400);
    return res.json({ message: 'Оплатить задаток можно только до окончания приема заявок' });
  }

  const application = await AuctionApplication.findOne({ auction: auction._id, participant: req.user._id });

  if (!application || !['deposit_required', 'approved'].includes(application.status)) {
    res.status(400);
    return res.json({ message: 'Сначала подайте заявку на участие' });
  }

  const cardNumber = String(req.body.cardNumber || '').replace(/\D/g, '');
  const cardHolder = String(req.body.cardHolder || '').trim();

  if (cardNumber.length < 12 || cardHolder.length < 2) {
    res.status(400);
    return res.json({ message: 'Укажите реквизиты банковской карты' });
  }

  if (!application.participantNumber) {
    application.participantNumber = await generateParticipantNumber(auction._id);
  }

  application.status = 'approved';
  application.rejectionReason = null;
  await application.save();

  await Deposit.findOneAndUpdate(
    { auction: auction._id, payer: req.user._id },
    {
      $set: {
        amount: auction.pricing.depositAmount || 0,
        status: 'paid',
        paidAt: await getCurrentTime()
      }
    },
    { upsert: true, new: true }
  );

  const payload = await buildAuctionRealtimePayload(auction._id, req.user._id);
  res.json({ message: 'Задаток успешно оплачен', ...payload });
});

const placeBid = asyncHandler(async (req, res) => {
  const auction = await getAuctionForParticipation(req.params.id);
  const error = ensureUserCanParticipate(req, res, auction);

  if (error) {
    return res.json({ message: error });
  }

  if (auction.status !== 'bidding_active') {
    res.status(400);
    return res.json({ message: 'Торги сейчас не идут' });
  }

  const application = await AuctionApplication.findOne({
    auction: auction._id,
    participant: req.user._id,
    status: 'approved',
    participantNumber: { $ne: null }
  });
  const deposit = await Deposit.findOne({ auction: auction._id, payer: req.user._id, status: 'paid' });

  if (!application || !deposit) {
    res.status(403);
    return res.json({ message: 'Для ставки нужно оплатить задаток и получить номер участника' });
  }

  const now = await getCurrentTime();
  const currentPrice = await getCurrentPrice(auction, now);
  const amount = Number(req.body.amount);
  const step = Number(auction.pricing?.minBidStep || 0);
  const isDecrease = auction.pricing?.auctionType === 'decrease';
  const minAcceptedAmount = Number(currentPrice) + Math.max(step, 0.01);

  if (!isDecrease && (!Number.isFinite(amount) || amount < minAcceptedAmount)) {
    res.status(400);
    return res.json({ message: `Ставка должна быть не меньше ${minAcceptedAmount.toFixed(2)} BYN` });
  }

  const latestBid = await getLatestBid(auction._id);

  if (isDecrease && latestBid) {
    res.status(400);
    return res.json({ message: 'Предмет торгов уже приобретен другим участником' });
  }

  if (latestBid?.bidder?.toString() === req.user._id.toString()) {
    res.status(400);
    return res.json({ message: 'Вы уже лидируете в торгах' });
  }

  const acceptedAmount = isDecrease ? Number(currentPrice) : amount;
  const bid = await Bid.create({
    auction: auction._id,
    bidder: req.user._id,
    participantNumber: application.participantNumber,
    amount: acceptedAmount,
    increment: isDecrease ? 0 : acceptedAmount - currentPrice,
    createdAt: now,
    updatedAt: now
  });

  const biddingEndAt = new Date(auction.schedule.biddingEndAt);
  if (isDecrease) {
    auction.status = 'finished_success';
    auction.resultReason = null;
    auction.winner = req.user._id;
    auction.winnerParticipantNumber = application.participantNumber;
    auction.winningBidAmount = acceptedAmount;
    auction.winningBidAt = now;
    auction.schedule.biddingEndAt = now;
    await auction.save();
    await ensureAuctionProtocol(auction);

    application.lotPaymentStatus = 'pending';
    await application.save();

    await Deposit.updateMany(
      { auction: auction._id, payer: { $ne: req.user._id }, status: 'paid' },
      { $set: { status: 'refunded' } }
    );
  } else if (biddingEndAt.getTime() - now.getTime() <= extensionWindowMs) {
    auction.schedule.biddingEndAt = new Date(now.getTime() + extensionWindowMs);
    auction.extendedAt = now;
    await auction.save();
  }

  await broadcastAuction(auction._id);
  const payload = await buildAuctionRealtimePayload(auction._id, req.user._id);
  res.status(201).json({ message: 'Ставка принята', bid: formatBid(bid), ...payload });
});

const payWonLot = asyncHandler(async (req, res) => {
  const auction = await getAuctionForParticipation(req.params.id);
  const error = ensureUserCanParticipate(req, res, auction);

  if (error) {
    return res.json({ message: error });
  }

  if (auction.status !== 'finished_success') {
    res.status(400);
    return res.json({ message: 'Оплата предмета торгов доступна только после успешного завершения торгов' });
  }

  const application = await AuctionApplication.findOne({
    auction: auction._id,
    participant: req.user._id,
    participantNumber: auction.winnerParticipantNumber
  });

  if (!application) {
    res.status(403);
    return res.json({ message: 'Оплатить предмет торгов может только победитель торгов' });
  }

  const cardNumber = String(req.body.cardNumber || '').replace(/\D/g, '');
  const cardHolder = String(req.body.cardHolder || '').trim();

  if (cardNumber.length < 12 || cardHolder.length < 2) {
    res.status(400);
    return res.json({ message: 'Укажите реквизиты банковской карты' });
  }

  application.lotPaymentStatus = 'paid';
  application.lotPaidAt = await getCurrentTime();
  await application.save();

  const payload = await buildAuctionRealtimePayload(auction._id, req.user._id);
  await broadcastAuction(auction._id);
  res.json({ message: 'Предмет торгов успешно оплачен', ...payload });
});

const listMyParticipations = asyncHandler(async (req, res) => {
  await updateAuctionStatuses();

  const applications = await AuctionApplication.find({ participant: req.user._id })
    .populate('auction')
    .sort({ updatedAt: -1 });
  const deposits = await Deposit.find({ payer: req.user._id });
  const depositByAuction = new Map(deposits.map((deposit) => [deposit.auction.toString(), deposit]));

  res.json({
    participations: applications
      .filter((application) => application.auction)
      .map((application) => {
        const auctionId = application.auction._id.toString();
        const deposit = depositByAuction.get(auctionId);
        const isWinner = application.auction.winnerParticipantNumber === application.participantNumber;

        return {
          auction: formatAuction(application.auction),
          status: application.status,
          participantNumber: application.participantNumber,
          depositStatus: deposit?.status || null,
          depositPaidAt: deposit?.paidAt || null,
          lotPaymentStatus: application.lotPaymentStatus,
          lotPaidAt: application.lotPaidAt || null,
          isWinner
        };
      })
  });
});

module.exports = {
  applyForAuction,
  listMyParticipations,
  payDeposit,
  payWonLot,
  placeBid
};
