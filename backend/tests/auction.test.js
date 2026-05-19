const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config/env');
const Auction = require('../src/models/Auction');
const AuctionReview = require('../src/models/AuctionReview');
const User = require('../src/models/User');
const VerificationRequest = require('../src/models/VerificationRequest');

const dayMs = 24 * 60 * 60 * 1000;

const createAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role, email: user.email }, config.jwt.accessSecret, {
    expiresIn: '15m'
  });

const createApprovedUser = async (overrides = {}) => {
  const user = await User.create({
    email: overrides.email || 'seller@example.com',
    passwordHash: await bcrypt.hash('Password123', 10),
    isEmailVerified: true,
    verificationStatus: 'approved',
    accountType: overrides.accountType || 'individual',
    isResident: true
  });

  await VerificationRequest.create({
    user: user._id,
    accountType: user.accountType,
    isResident: true,
    status: 'approved',
    reviewedAt: new Date(),
    personalData: {
      firstName: 'Иван',
      lastName: 'Иванов',
      middleName: 'Иванович',
      fullName: 'Иванов Иван Иванович',
      phone: '+375291112233'
    },
    organizationData: {
      fullName: 'Иванов Иван Иванович',
      unp: '123456789',
      contactPhone: '+375291112233'
    },
    addressData: {
      locality: 'Минск',
      street: 'Калиновского',
      house: '79'
    }
  });

  return user;
};

const createModerator = async (overrides = {}) =>
  User.create({
    email: overrides.email || 'moderator@example.com',
    passwordHash: await bcrypt.hash('Password123', 10),
    isEmailVerified: true,
    verificationStatus: 'approved',
    role: 'moderator'
  });

const createValidPayload = () => {
  const applicationStartAt = new Date(Date.now() + dayMs);
  const applicationEndAt = new Date(applicationStartAt.getTime() + 4 * dayMs);
  const biddingStartAt = new Date(applicationEndAt);
  biddingStartAt.setDate(biddingStartAt.getDate() + 1);
  biddingStartAt.setHours(9, 0, 0, 0);
  const biddingEndAt = new Date(biddingStartAt);
  biddingEndAt.setHours(14, 0, 0, 0);

  return {
    pricing: {
      priceWithoutVat: 10000,
      priceWithVat: 10000,
      depositAmount: 1000,
      minBidStep: 500
    },
    schedule: {
      applicationStartAt: applicationStartAt.toISOString(),
      applicationEndAt: applicationEndAt.toISOString(),
      biddingStartAt: biddingStartAt.toISOString(),
      biddingEndAt: biddingEndAt.toISOString(),
      paymentDeadlineDays: 10,
      contractDeadlineDays: 10
    },
    item: {
      title: 'Легковой автомобиль',
      category: 'passenger_cars',
      characteristics: [
        { name: 'Год выпуска', value: '2020' },
        { name: 'Пустая строка', value: '' }
      ],
      description: '',
      locationAddress: 'г. Минск, ул. Калиновского, 79',
      geoLocation: { lat: 53.9, lng: 27.56 }
    },
    inspection: {
      contactName: 'Иванов Иван Иванович',
      contactPhone: '+375291112233',
      contactEmail: ''
    },
    mainPhotoIndex: 0
  };
};

describe('auction creation API', () => {
  it('allows verified user to submit auction lot with photo', async () => {
    const user = await createApprovedUser();
    const token = createAccessToken(user);

    const response = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${token}`)
      .field('payload', JSON.stringify(createValidPayload()))
      .attach('photos', Buffer.from('photo'), {
        filename: 'car.jpg',
        contentType: 'image/jpeg'
      });

    expect(response.status).toBe(201);
    expect(response.body.auction.status).toBe('pending');
    expect(response.body.auction.lotNumber).toMatch(/^LOT-/);
    expect(response.body.auction.photos).toHaveLength(1);
    expect(response.body.auction.photos[0].isMain).toBe(true);

    const savedAuction = await Auction.findById(response.body.auction.id);
    expect(savedAuction.item.characteristics).toHaveLength(1);
  });

  it('rejects auction creation for unverified user', async () => {
    const user = await User.create({
      email: 'draft-seller@example.com',
      passwordHash: await bcrypt.hash('Password123', 10),
      isEmailVerified: true,
      verificationStatus: 'draft',
      accountType: 'individual'
    });
    const token = createAccessToken(user);

    const response = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${token}`)
      .field('payload', JSON.stringify(createValidPayload()))
      .attach('photos', Buffer.from('photo'), {
        filename: 'car.jpg',
        contentType: 'image/jpeg'
      });

    expect(response.status).toBe(403);
  });

  it('validates deposit and bid step percentages', async () => {
    const user = await createApprovedUser({ email: 'invalid-price@example.com' });
    const token = createAccessToken(user);
    const payload = createValidPayload();
    payload.pricing.depositAmount = 9000;
    payload.pricing.minBidStep = 2000;

    const response = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${token}`)
      .field('payload', JSON.stringify(payload))
      .attach('photos', Buffer.from('photo'), {
        filename: 'car.jpg',
        contentType: 'image/jpeg'
      });

    expect(response.status).toBe(400);
    expect(response.body.errors['pricing.depositAmount']).toBeTruthy();
    expect(response.body.errors['pricing.minBidStep']).toBeTruthy();
  });

  it('allows moderator to approve pending auction and writes snapshot review', async () => {
    const user = await createApprovedUser({ email: 'seller-approve@example.com' });
    const sellerToken = createAccessToken(user);
    const moderator = await createModerator();
    const moderatorToken = createAccessToken(moderator);

    const createResponse = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${sellerToken}`)
      .field('payload', JSON.stringify(createValidPayload()))
      .attach('photos', Buffer.from('photo'), {
        filename: 'car.jpg',
        contentType: 'image/jpeg'
      });

    const response = await request(app)
      .post(`/api/moderation/auctions/${createResponse.body.auction.id}/approve`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.review.action).toBe('approved');
    expect(response.body.review.auctionSnapshot.status).toBe('pending');

    const savedAuction = await Auction.findById(createResponse.body.auction.id);
    expect(savedAuction.status).toBe('active');

    const savedReview = await AuctionReview.findOne({ auction: savedAuction._id });
    expect(savedReview.auctionSnapshot.item.title).toBe(createValidPayload().item.title);
  });

  it('returns auction for revision and allows owner to resubmit the same lot', async () => {
    const user = await createApprovedUser({ email: 'seller-return@example.com' });
    const sellerToken = createAccessToken(user);
    const moderator = await createModerator({ email: 'moderator-return@example.com' });
    const moderatorToken = createAccessToken(moderator);
    const payload = createValidPayload();

    const createResponse = await request(app)
      .post('/api/auctions')
      .set('Authorization', `Bearer ${sellerToken}`)
      .field('payload', JSON.stringify(payload))
      .attach('photos', Buffer.from('photo'), {
        filename: 'car.jpg',
        contentType: 'image/jpeg'
      });

    const returnResponse = await request(app)
      .post(`/api/moderation/auctions/${createResponse.body.auction.id}/return`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .send({ comment: 'Нужно уточнить описание' });

    expect(returnResponse.status).toBe(200);
    expect(returnResponse.body.review.action).toBe('returned');

    const returnedAuction = await Auction.findById(createResponse.body.auction.id);
    expect(returnedAuction.status).toBe('returned');
    expect(returnedAuction.moderationComment).toBe('Нужно уточнить описание');

    const updatedPayload = {
      ...payload,
      existingPhotoPaths: createResponse.body.auction.photos.map((photo) => photo.path),
      item: {
        ...payload.item,
        title: 'Исправленный легковой автомобиль',
        description: 'Описание уточнено'
      }
    };

    const updateResponse = await request(app)
      .put(`/api/auctions/${createResponse.body.auction.id}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .field('payload', JSON.stringify(updatedPayload));

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.auction.id).toBe(createResponse.body.auction.id);
    expect(updateResponse.body.auction.status).toBe('pending');
    expect(updateResponse.body.auction.item.title).toBe('Исправленный легковой автомобиль');
    expect(updateResponse.body.auction.photos).toHaveLength(1);

    const reviews = await AuctionReview.find({ auction: createResponse.body.auction.id });
    expect(reviews).toHaveLength(1);
    expect(reviews[0].auctionSnapshot.item.title).toBe(payload.item.title);
  });
});
