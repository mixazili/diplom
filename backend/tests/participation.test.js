const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config/env');
const Auction = require('../src/models/Auction');
const AuctionApplication = require('../src/models/AuctionApplication');
const AuctionReview = require('../src/models/AuctionReview');
const Bid = require('../src/models/Bid');
const Chat = require('../src/models/Chat');
const ChatMessage = require('../src/models/ChatMessage');
const Deposit = require('../src/models/Deposit');
const User = require('../src/models/User');
const { updateAuctionStatuses } = require('../src/services/statusAutomationService');

const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

const createAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role, email: user.email }, config.jwt.accessSecret, {
    expiresIn: '15m'
  });

const createUser = async (overrides = {}) =>
  User.create({
    email: overrides.email || `user-${Date.now()}@example.com`,
    passwordHash: await bcrypt.hash('Password123', 10),
    isEmailVerified: true,
    verificationStatus: overrides.verificationStatus || 'approved',
    accountType: overrides.accountType || 'individual',
    isResident: true,
    role: overrides.role || 'user'
  });

const createAuction = async ({ owner, status = 'applications_open', now = new Date(), overrides = {} } = {}) =>
  Auction.create({
    owner,
    auctionNumber: overrides.auctionNumber || `${now.getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`,
    status,
    pricing: {
      auctionType: 'increase',
      priceWithoutVat: 10000,
      priceWithVat: 10000,
      vatApplies: false,
      vatRate: 0,
      vatLabel: 'Не облагается налогом на добавочную стоимость',
      depositAmount: 1000,
      minBidStep: 500,
      organizationFeePercent: 1,
      ...(overrides.pricing || {})
    },
    schedule: {
      applicationStartAt: new Date(now.getTime() - dayMs),
      applicationEndAt: new Date(now.getTime() + dayMs),
      biddingStartAt: new Date(now.getTime() + dayMs + hourMs),
      biddingEndAt: new Date(now.getTime() + dayMs + 6 * hourMs),
      paymentDeadlineDays: 10,
      contractDeadlineDays: 10,
      ...(overrides.schedule || {})
    },
    item: {
      title: overrides.title || 'Тестовый предмет торгов',
      category: 'electronics',
      characteristics: [{ name: 'Состояние', value: 'новое' }],
      locationAddress: 'г. Минск, ул. Калиновского, 79',
      locationRegion: 'г. Минск',
      locationCity: 'Минск',
      geoLocation: { lat: 53.9, lng: 27.56 }
    },
    photos: [
      {
        fieldName: 'photos',
        originalName: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 5,
        path: 'uploads/test-photo.jpg',
        isMain: true,
        order: 0
      }
    ],
    inspection: {
      contactName: 'Иван Иванов',
      contactPhone: '+375291112233',
      contactEmail: 'seller@example.com'
    },
    seller: {
      accountType: 'individual',
      isResident: true,
      fullName: 'Иван Иванов',
      phone: '+375291112233'
    },
    reviewedAt: now
  });

describe('auction participation flow', () => {
  it('creates participation application and mocked deposit payment with confidential participant number', async () => {
    const owner = await createUser({ email: 'owner-apply@example.com' });
    const participant = await createUser({ email: 'participant-apply@example.com' });
    const auction = await createAuction({ owner: owner._id });
    const token = createAccessToken(participant);

    const applyResponse = await request(app)
      .post(`/api/auctions/${auction._id}/applications`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(applyResponse.status).toBe(201);
    expect(applyResponse.body.viewer.participation.status).toBe('deposit_required');
    expect(applyResponse.body.viewer.participation.participantNumber).toBe(null);

    const deposit = await Deposit.findOne({ auction: auction._id, payer: participant._id });
    expect(deposit.status).toBe('pending');
    expect(deposit.amount).toBe(1000);

    const payResponse = await request(app)
      .post(`/api/auctions/${auction._id}/deposit/pay`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cardNumber: '4111111111111111', cardHolder: 'IVAN IVANOV' });

    expect(payResponse.status).toBe(200);
    expect(payResponse.body.viewer.participation.status).toBe('approved');
    expect(String(payResponse.body.viewer.participation.participantNumber)).toMatch(/^\d{8}$/);

    const paidDeposit = await Deposit.findOne({ auction: auction._id, payer: participant._id });
    expect(paidDeposit.status).toBe('paid');
  });

  it('forbids owner and unverified user participation', async () => {
    const owner = await createUser({ email: 'owner-forbidden@example.com' });
    const unverified = await createUser({ email: 'unverified-forbidden@example.com', verificationStatus: 'draft' });
    const auction = await createAuction({ owner: owner._id });

    const ownerResponse = await request(app)
      .post(`/api/auctions/${auction._id}/applications`)
      .set('Authorization', `Bearer ${createAccessToken(owner)}`)
      .send({});
    const unverifiedResponse = await request(app)
      .post(`/api/auctions/${auction._id}/applications`)
      .set('Authorization', `Bearer ${createAccessToken(unverified)}`)
      .send({});

    expect(ownerResponse.status).toBe(403);
    expect(unverifiedResponse.status).toBe(403);
  });

  it('rejects unpaid applications when application period ends', async () => {
    const now = new Date();
    const owner = await createUser({ email: 'owner-expire@example.com' });
    const participant = await createUser({ email: 'participant-expire@example.com' });
    const auction = await createAuction({
      owner: owner._id,
      now,
      overrides: {
        schedule: {
          applicationEndAt: new Date(now.getTime() - hourMs),
          biddingStartAt: new Date(now.getTime() + hourMs),
          biddingEndAt: new Date(now.getTime() + 4 * hourMs)
        }
      }
    });

    await AuctionApplication.create({
      auction: auction._id,
      participant: participant._id,
      status: 'deposit_required'
    });

    await updateAuctionStatuses(now);

    const savedApplication = await AuctionApplication.findOne({ auction: auction._id, participant: participant._id });
    const savedAuction = await Auction.findById(auction._id);

    expect(savedAuction.status).toBe('bidding_waiting');
    expect(savedApplication.status).toBe('rejected');
    expect(savedApplication.rejectionReason).toBe('Задаток не оплачен до окончания приема заявок');
  });

  it('accepts bids only from paid participants and extends auction in final 10 minutes', async () => {
    const now = new Date();
    const owner = await createUser({ email: 'owner-bid@example.com' });
    const first = await createUser({ email: 'first-bid@example.com' });
    const second = await createUser({ email: 'second-bid@example.com' });
    const auction = await createAuction({
      owner: owner._id,
      status: 'bidding_active',
      now,
      overrides: {
        schedule: {
          applicationEndAt: new Date(now.getTime() - hourMs),
          biddingStartAt: new Date(now.getTime() - 2 * hourMs),
          biddingEndAt: new Date(now.getTime() + 5 * 60 * 1000)
        }
      }
    });

    await AuctionApplication.create({ auction: auction._id, participant: first._id, status: 'approved', participantNumber: 12345678 });
    await AuctionApplication.create({ auction: auction._id, participant: second._id, status: 'approved', participantNumber: 87654321 });
    await Deposit.create({ auction: auction._id, payer: first._id, amount: 1000, status: 'paid', paidAt: now });
    await Deposit.create({ auction: auction._id, payer: second._id, amount: 1000, status: 'paid', paidAt: now });

    const response = await request(app)
      .post(`/api/auctions/${auction._id}/bids`)
      .set('Authorization', `Bearer ${createAccessToken(first)}`)
      .send({ amount: 10500 });

    expect(response.status).toBe(201);
    expect(response.body.bid.participantNumber).toBe(12345678);
    expect(response.body.bid.increment).toBe(500);

    const savedAuction = await Auction.findById(auction._id);
    expect(savedAuction.schedule.biddingEndAt.getTime()).toBeGreaterThan(now.getTime() + 9 * 60 * 1000);
    expect(savedAuction.extendedAt).toBeTruthy();

    const secondResponse = await request(app)
      .post(`/api/auctions/${auction._id}/bids`)
      .set('Authorization', `Bearer ${createAccessToken(second)}`)
      .send({ amount: 11000 });

    expect(secondResponse.status).toBe(201);
    await expect(Bid.countDocuments({ auction: auction._id })).resolves.toBe(2);
  });

  it('finishes decrease auction for the first participant who accepts current price', async () => {
    const now = new Date();
    const owner = await createUser({ email: 'owner-decrease@example.com' });
    const participant = await createUser({ email: 'participant-decrease@example.com' });
    const auction = await createAuction({
      owner: owner._id,
      status: 'bidding_active',
      now,
      overrides: {
        pricing: {
          auctionType: 'decrease',
          priceWithVat: 10000,
          minPriceWithVat: 7000,
          minBidStep: null,
          bidStepsCount: 6,
          calculatedBidStep: 500
        },
        schedule: {
          applicationEndAt: new Date(now.getTime() - 4 * hourMs),
          biddingStartAt: new Date(now.getTime() - 2 * hourMs),
          biddingEndAt: new Date(now.getTime() + 5 * 60 * 1000)
        }
      }
    });

    await AuctionApplication.create({ auction: auction._id, participant: participant._id, status: 'approved', participantNumber: 22334455 });
    await Deposit.create({ auction: auction._id, payer: participant._id, amount: 1000, status: 'paid', paidAt: now });

    const acceptedResponse = await request(app)
      .post(`/api/auctions/${auction._id}/bids`)
      .set('Authorization', `Bearer ${createAccessToken(participant)}`)
      .send({});

    expect(acceptedResponse.status).toBe(201);
    expect(acceptedResponse.body.bid.amount).toBe(7500);

    const savedAuction = await Auction.findById(auction._id);
    const savedApplication = await AuctionApplication.findOne({ auction: auction._id, participant: participant._id });
    const dealChat = await Chat.findOne({ auction: auction._id });
    expect(savedAuction.status).toBe('finished_success');
    expect(savedAuction.winnerParticipantNumber).toBe(22334455);
    expect(savedAuction.winningBidAmount).toBe(7500);
    expect(savedAuction.schedule.biddingEndAt.getTime()).toBe(savedAuction.winningBidAt.getTime());
    expect(savedAuction.schedule.biddingEndAt.getTime()).toBeLessThan(auction.schedule.biddingEndAt.getTime());
    expect(savedAuction.extendedAt).toBe(null);
    expect(savedApplication.lotPaymentStatus).toBe('pending');
    expect(dealChat).toBeTruthy();
    expect(dealChat.seller.toString()).toBe(owner._id.toString());
    expect(dealChat.buyer.toString()).toBe(participant._id.toString());

    const secondResponse = await request(app)
      .post(`/api/auctions/${auction._id}/bids`)
      .set('Authorization', `Bearer ${createAccessToken(participant)}`)
      .send({});

    expect(secondResponse.status).toBe(400);
  });

  it('allows seller and winner to exchange deal chat messages', async () => {
    const now = new Date();
    const owner = await createUser({ email: 'owner-chat@example.com' });
    const winner = await createUser({ email: 'winner-chat@example.com' });
    const auction = await createAuction({
      owner: owner._id,
      status: 'bidding_active',
      now,
      overrides: {
        pricing: {
          auctionType: 'decrease',
          priceWithVat: 10000,
          minPriceWithVat: 7000,
          bidStepsCount: 6,
          calculatedBidStep: 500
        },
        schedule: {
          applicationEndAt: new Date(now.getTime() - 4 * hourMs),
          biddingStartAt: new Date(now.getTime() - 2 * hourMs),
          biddingEndAt: new Date(now.getTime() + 5 * 60 * 1000)
        }
      }
    });

    await AuctionApplication.create({ auction: auction._id, participant: winner._id, status: 'approved', participantNumber: 88776655 });
    await Deposit.create({ auction: auction._id, payer: winner._id, amount: 1000, status: 'paid', paidAt: now });

    await request(app)
      .post(`/api/auctions/${auction._id}/bids`)
      .set('Authorization', `Bearer ${createAccessToken(winner)}`)
      .send({});

    const chat = await Chat.findOne({ auction: auction._id });
    expect(chat).toBeTruthy();

    const listResponse = await request(app)
      .get('/api/chats')
      .set('Authorization', `Bearer ${createAccessToken(winner)}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.chats).toHaveLength(1);
    expect(listResponse.body.chats[0].auction.id).toBe(auction._id.toString());

    const sendResponse = await request(app)
      .post(`/api/chats/${chat._id}/messages`)
      .set('Authorization', `Bearer ${createAccessToken(winner)}`)
      .field('text', 'Готов согласовать передачу лота');

    expect(sendResponse.status).toBe(201);
    expect(sendResponse.body.message.status).toBe('sent');

    const sellerMessagesResponse = await request(app)
      .get(`/api/chats/${chat._id}/messages`)
      .set('Authorization', `Bearer ${createAccessToken(owner)}`);

    expect(sellerMessagesResponse.status).toBe(200);
    expect(sellerMessagesResponse.body.messages).toHaveLength(1);
    expect(sellerMessagesResponse.body.messages[0].text).toBe('Готов согласовать передачу лота');

    const savedMessage = await ChatMessage.findById(sendResponse.body.message.id);
    expect(savedMessage.readBy.some((receipt) => receipt.user.toString() === owner._id.toString())).toBe(true);
  });

  it('allows moderator to cancel unfinished auction and records cancellation journal', async () => {
    const now = new Date();
    const owner = await createUser({ email: 'owner-cancel@example.com' });
    const moderator = await createUser({ email: 'moderator-cancel@example.com', role: 'moderator' });
    const participant = await createUser({ email: 'participant-cancel@example.com' });
    const auction = await createAuction({
      owner: owner._id,
      status: 'bidding_active',
      now,
      overrides: {
        auctionNumber: '2026-200001',
        schedule: {
          applicationEndAt: new Date(now.getTime() - 4 * hourMs),
          biddingStartAt: new Date(now.getTime() - 2 * hourMs),
          biddingEndAt: new Date(now.getTime() + 2 * hourMs)
        }
      }
    });

    await AuctionApplication.create({ auction: auction._id, participant: participant._id, status: 'approved', participantNumber: 44445555 });
    await Deposit.create({ auction: auction._id, payer: participant._id, amount: 1000, status: 'paid', paidAt: now });

    const cancelResponse = await request(app)
      .post(`/api/moderation/auctions/${auction._id}/cancel`)
      .set('Authorization', `Bearer ${createAccessToken(moderator)}`)
      .send({ comment: 'РџСЂРѕРґР°РІРµС† СЃРЅСЏР» РёРјСѓС‰РµСЃС‚РІРѕ СЃ С‚РѕСЂРіРѕРІ' });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.auction.status).toBe('cancelled');
    expect(cancelResponse.body.review.action).toBe('cancelled');

    const savedAuction = await Auction.findById(auction._id);
    const savedApplication = await AuctionApplication.findOne({ auction: auction._id, participant: participant._id });
    const savedDeposit = await Deposit.findOne({ auction: auction._id, payer: participant._id });
    const savedReview = await AuctionReview.findOne({ auction: auction._id, action: 'cancelled' });

    expect(savedAuction.status).toBe('cancelled');
    expect(savedAuction.reviewedBy.toString()).toBe(moderator._id.toString());
    expect(savedApplication.status).toBe('rejected');
    expect(savedDeposit.status).toBe('refunded');
    expect(savedReview).toBeTruthy();

    const journalResponse = await request(app)
      .get('/api/moderation/auction-cancellations')
      .set('Authorization', `Bearer ${createAccessToken(moderator)}`);

    expect(journalResponse.status).toBe(200);
    expect(journalResponse.body.reviews).toHaveLength(1);
    expect(journalResponse.body.reviews[0].moderator.email).toBe('moderator-cancel@example.com');

    const secondCancelResponse = await request(app)
      .post(`/api/moderation/auctions/${auction._id}/cancel`)
      .set('Authorization', `Bearer ${createAccessToken(moderator)}`)
      .send({});

    expect(secondCancelResponse.status).toBe(400);
  });

  it('finishes failed auctions without bids and successful auctions with a winner payment flow', async () => {
    const now = new Date();
    const owner = await createUser({ email: 'owner-finish@example.com' });
    const winner = await createUser({ email: 'winner-finish@example.com' });
    const loser = await createUser({ email: 'loser-finish@example.com' });
    const failedAuction = await createAuction({
      owner: owner._id,
      status: 'bidding_active',
      now,
      overrides: {
        auctionNumber: '2026-100001',
        schedule: {
          applicationEndAt: new Date(now.getTime() - 4 * hourMs),
          biddingStartAt: new Date(now.getTime() - 3 * hourMs),
          biddingEndAt: new Date(now.getTime() - hourMs)
        }
      }
    });
    const successAuction = await createAuction({
      owner: owner._id,
      status: 'bidding_active',
      now,
      overrides: {
        auctionNumber: '2026-100002',
        schedule: {
          applicationEndAt: new Date(now.getTime() - 4 * hourMs),
          biddingStartAt: new Date(now.getTime() - 3 * hourMs),
          biddingEndAt: new Date(now.getTime() - hourMs)
        }
      }
    });

    await AuctionApplication.create({ auction: failedAuction._id, participant: loser._id, status: 'approved', participantNumber: 11112222 });
    await Deposit.create({ auction: failedAuction._id, payer: loser._id, amount: 1000, status: 'paid', paidAt: now });
    await AuctionApplication.create({ auction: successAuction._id, participant: winner._id, status: 'approved', participantNumber: 33334444 });
    await AuctionApplication.create({ auction: successAuction._id, participant: loser._id, status: 'approved', participantNumber: 55556666 });
    await Deposit.create({ auction: successAuction._id, payer: winner._id, amount: 1000, status: 'paid', paidAt: now });
    await Deposit.create({ auction: successAuction._id, payer: loser._id, amount: 1000, status: 'paid', paidAt: now });
    await Bid.create({
      auction: successAuction._id,
      bidder: winner._id,
      participantNumber: 33334444,
      amount: 10500,
      increment: 500,
      createdAt: new Date(now.getTime() - 2 * hourMs)
    });

    await updateAuctionStatuses(now);

    const savedFailedAuction = await Auction.findById(failedAuction._id);
    const savedSuccessAuction = await Auction.findById(successAuction._id);
    const winnerApplication = await AuctionApplication.findOne({ auction: successAuction._id, participant: winner._id });
    const loserDeposit = await Deposit.findOne({ auction: successAuction._id, payer: loser._id });

    expect(savedFailedAuction.status).toBe('finished_failed');
    expect(savedFailedAuction.resultReason).toBe('За время торгов не было сделано ни одной ставки');
    expect(savedSuccessAuction.status).toBe('finished_success');
    expect(savedSuccessAuction.winnerParticipantNumber).toBe(33334444);
    expect(savedSuccessAuction.winningBidAmount).toBe(10500);
    expect(winnerApplication.lotPaymentStatus).toBe('pending');
    expect(loserDeposit.status).toBe('refunded');

    const payResponse = await request(app)
      .post(`/api/auctions/${successAuction._id}/lot/pay`)
      .set('Authorization', `Bearer ${createAccessToken(winner)}`)
      .send({ cardNumber: '4111111111111111', cardHolder: 'WINNER USER' });

    expect(payResponse.status).toBe(200);
    expect(payResponse.body.viewer.participation.lotPaymentStatus).toBe('paid');
  });
});
