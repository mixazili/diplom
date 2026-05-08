const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config/env');
const User = require('../src/models/User');
const VerificationRequest = require('../src/models/VerificationRequest');

const createAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role, email: user.email }, config.jwt.accessSecret, {
    expiresIn: '15m'
  });

describe('verification API', () => {
  beforeEach(async () => {
    await VerificationRequest.deleteMany({});
    await User.deleteMany({});
  });

  it('submits individual resident verification with uploaded documents', async () => {
    const user = await User.create({
      email: 'person@example.com',
      passwordHash: await bcrypt.hash('Password123', 10),
      isEmailVerified: true
    });
    const token = createAccessToken(user);

    const payload = {
      accountType: 'individual',
      isResident: true,
      personalData: {
        firstName: 'Иван',
        lastName: 'Иванов',
        middleName: 'Иванович',
        phone: '+375291112233'
      },
      addressData: {
        region: 'Минская область',
        district: 'Минский район',
        locality: 'Минск',
        postalCode: '220000',
        street: 'Независимости',
        house: '1',
        sameAsRegistration: true
      },
      documentData: {
        documentType: 'passport',
        documentNumber: 'KH1234567',
        issuedBy: 'МВД',
        issuedAt: '2020-01-01',
        expiresAt: '2030-01-01'
      },
      bankData: {
        bankDetails: 'BY00TEST00000000000000000000'
      }
    };

    const response = await request(app)
      .post('/api/verification')
      .set('Authorization', `Bearer ${token}`)
      .field('payload', JSON.stringify(payload))
      .attach('documentMain', Buffer.from('passport'), {
        filename: 'passport.pdf',
        contentType: 'application/pdf'
      })
      .attach('documentRegistration', Buffer.from('registration'), {
        filename: 'registration.png',
        contentType: 'image/png'
      });

    expect(response.status).toBe(201);
    expect(response.body.user.accountType).toBe('individual');
    expect(response.body.user.verificationStatus).toBe('pending');
    expect(response.body.verification.documents).toHaveLength(2);
  });

  it('validates required verification fields', async () => {
    const user = await User.create({
      email: 'invalid@example.com',
      passwordHash: await bcrypt.hash('Password123', 10),
      isEmailVerified: true
    });
    const token = createAccessToken(user);

    const response = await request(app)
      .post('/api/verification')
      .set('Authorization', `Bearer ${token}`)
      .field(
        'payload',
        JSON.stringify({
          accountType: 'individual',
          isResident: false,
          personalData: {},
          addressData: {},
          documentData: {},
          bankData: {}
        })
      );

    expect(response.status).toBe(400);
    expect(response.body.errors['personalData.firstName']).toBe('Поле обязательно для заполнения');
    expect(response.body.errors.documentMain).toBe('Загрузите документ');
  });
});
