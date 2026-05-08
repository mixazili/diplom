process.env.NODE_ENV = 'test';

const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const User = require('../src/models/User');
const VerificationRequest = require('../src/models/VerificationRequest');
const VerificationReview = require('../src/models/VerificationReview');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectDatabase();
});

beforeEach(async () => {
  await VerificationRequest.deleteMany({});
  await VerificationReview.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await disconnectDatabase();
});
