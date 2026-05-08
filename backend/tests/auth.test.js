jest.mock('../src/services/emailService', () => ({
  sendEmailVerificationCode: jest.fn().mockResolvedValue({
    messageId: 'test-message',
    previewUrl: 'https://ethereal.email/message/test'
  })
}));

const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../src/app');
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
  });
});
