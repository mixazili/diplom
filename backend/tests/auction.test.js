const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config/env');
const Auction = require('../src/models/Auction');
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
});
