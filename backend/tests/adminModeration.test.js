const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config/env');
const User = require('../src/models/User');
const VerificationRequest = require('../src/models/VerificationRequest');
const VerificationReview = require('../src/models/VerificationReview');
const { ensureAdminAccount } = require('../src/services/adminSeedService');

const createAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role, email: user.email }, config.jwt.accessSecret, {
    expiresIn: '15m'
  });

const createUser = async (overrides = {}) =>
  User.create({
    email: overrides.email || `user-${Date.now()}@example.com`,
    passwordHash: await bcrypt.hash('Password123', 10),
    role: overrides.role || 'user',
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
    verificationStatus: overrides.verificationStatus || 'pending',
    ...overrides
  });

const createVerification = async (user) =>
  VerificationRequest.create({
    user: user._id,
    accountType: 'individual',
    isResident: true,
    status: 'pending',
    personalData: { firstName: 'Иван', lastName: 'Иванов' },
    documents: []
  });

describe('admin and moderation API', () => {
  it('seeds the single admin account', async () => {
    const admin = await ensureAdminAccount();

    expect(admin.role).toBe('admin');
    expect(admin.email).toBe(config.admin.email);

    await ensureAdminAccount();
    const adminsCount = await User.countDocuments({ role: 'admin' });
    expect(adminsCount).toBe(1);
  });

  it('allows admin to create and deactivate moderators', async () => {
    const admin = await ensureAdminAccount();
    const token = createAccessToken(admin);

    const createResponse = await request(app)
      .post('/api/admin/moderators')
      .set('Authorization', `Bearer ${token}`)
      .send({
        email: 'moderator@example.com',
        password: 'Password123'
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.moderator.role).toBe('moderator');

    const listResponse = await request(app)
      .get('/api/admin/moderators')
      .set('Authorization', `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.moderators).toHaveLength(1);
    expect(listResponse.body.moderators[0]).toHaveProperty('onlineStatus');

    const deleteResponse = await request(app)
      .delete(`/api/admin/moderators/${createResponse.body.moderator.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteResponse.status).toBe(200);

    const inactiveModerator = await User.findById(createResponse.body.moderator.id);
    expect(inactiveModerator.isActive).toBe(false);
  });

  it('allows moderator to approve verification and writes review history', async () => {
    const moderator = await createUser({
      email: 'reviewer@example.com',
      role: 'moderator',
      verificationStatus: 'approved'
    });
    const user = await createUser({ email: 'pending@example.com' });
    const verification = await createVerification(user);
    const token = createAccessToken(moderator);

    const approveResponse = await request(app)
      .post(`/api/moderation/verifications/${verification._id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ comment: 'Документы проверены' });

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.review.action).toBe('approved');

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.verificationStatus).toBe('approved');

    const reviewsCount = await VerificationReview.countDocuments({ moderator: moderator._id });
    expect(reviewsCount).toBe(1);

    const historyResponse = await request(app)
      .get('/api/moderation/reviews')
      .set('Authorization', `Bearer ${token}`);

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.reviews).toHaveLength(1);
  });

  it('allows admin to see reviews from all moderators', async () => {
    const admin = await ensureAdminAccount();
    const moderator = await createUser({
      email: 'rejector@example.com',
      role: 'moderator',
      verificationStatus: 'approved'
    });
    const user = await createUser({ email: 'rejected@example.com' });
    const verification = await createVerification(user);

    await VerificationReview.create({
      verificationRequest: verification._id,
      user: user._id,
      moderator: moderator._id,
      action: 'rejected',
      comment: 'Не хватает документа'
    });

    verification.status = 'rejected';
    verification.reviewedBy = moderator._id;
    verification.reviewedAt = new Date();
    verification.moderationComment = 'Не хватает документа';
    await verification.save();

    const response = await request(app)
      .get('/api/admin/reviews')
      .set('Authorization', `Bearer ${createAccessToken(admin)}`);

    expect(response.status).toBe(200);
    expect(response.body.reviews).toHaveLength(1);
    expect(response.body.reviews[0].moderator.email).toBe('rejector@example.com');
  });
});
