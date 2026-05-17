jest.mock('../src/services/emailService', () => ({
  sendEmailVerificationCode: jest.fn().mockResolvedValue({
    messageId: 'test-message',
    previewUrl: 'https://ethereal.email/message/test'
  }),
  sendStaffLoginCode: jest.fn().mockResolvedValue({
    messageId: 'staff-message',
    previewUrl: 'https://ethereal.email/message/staff-test'
  })
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config/env');
const User = require('../src/models/User');

describe('auth API', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('registers user and requires email verification before login', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      email: 'user@example.com',
      password: 'Password123'
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.message).toBe('Код подтверждения отправлен на email');

    const user = await User.findOne({ email: 'user@example.com' });
    expect(user).toBeTruthy();
    expect(user.isEmailVerified).toBe(false);
    expect(user.accountType).toBeNull();

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'user@example.com',
      password: 'Password123'
    });

    expect(loginResponse.status).toBe(403);
    expect(loginResponse.body.message).toBe('Сначала подтвердите email');
  });

  it('verifies email and returns JWT tokens', async () => {
    const code = '123456';
    const user = await User.create({
      email: 'verified@example.com',
      passwordHash: await bcrypt.hash('Password123', 10),
      emailVerificationCodeHash: await bcrypt.hash(code, 10),
      emailVerificationCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    const response = await request(app).post('/api/auth/verify-email').send({
      email: user.email,
      code
    });

    expect(response.status).toBe(200);
    expect(response.body.user.isEmailVerified).toBe(true);
    expect(response.body.user.role).toBe('user');
    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.refreshToken).toBeTruthy();
  });

  it('logs in verified user', async () => {
    await User.create({
      email: 'login@example.com',
      passwordHash: await bcrypt.hash('Password123', 10),
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'Password123'
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Вход выполнен');
    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.user.verificationStatus).toBe('draft');

    const decodedAccessToken = jwt.verify(response.body.accessToken, config.jwt.accessSecret);
    expect(decodedAccessToken.exp - decodedAccessToken.iat).toBe(24 * 60 * 60);
  });

  it('refreshes a saved session with refresh token', async () => {
    await User.create({
      email: 'refresh@example.com',
      passwordHash: await bcrypt.hash('Password123', 10),
      isEmailVerified: true,
      emailVerifiedAt: new Date()
    });

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'refresh@example.com',
      password: 'Password123'
    });

    const refreshResponse = await request(app).post('/api/auth/refresh').send({
      refreshToken: loginResponse.body.refreshToken
    });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.user.email).toBe('refresh@example.com');
    expect(refreshResponse.body.accessToken).toBeTruthy();
    expect(refreshResponse.body.refreshToken).toBeTruthy();
  });

  it('requires login code for staff accounts', async () => {
    await User.create({
      email: 'moderator@example.com',
      passwordHash: await bcrypt.hash('Password123', 10),
      role: 'moderator',
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      verificationStatus: 'approved'
    });

    const normalLogin = await request(app).post('/api/auth/login').send({
      email: 'moderator@example.com',
      password: 'Password123'
    });

    expect(normalLogin.status).toBe(403);

    const codeResponse = await request(app).post('/api/auth/staff-login').send({
      email: 'moderator@example.com',
      password: 'Password123'
    });

    expect(codeResponse.status).toBe(200);
    expect(codeResponse.body.message).toBe('Код входа отправлен на email');

    const user = await User.findOne({ email: 'moderator@example.com' });
    user.loginCodeHash = await bcrypt.hash('123456', 10);
    user.loginCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const verifyResponse = await request(app).post('/api/auth/staff-login/verify').send({
      email: 'moderator@example.com',
      code: '123456'
    });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.user.role).toBe('moderator');
    expect(verifyResponse.body.accessToken).toBeTruthy();
  });
});
