process.env.NODE_ENV = 'test';

jest.setTimeout(30000);

const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const User = require('../src/models/User');
const Auction = require('../src/models/Auction');
const AuctionReview = require('../src/models/AuctionReview');
const VerificationRequest = require('../src/models/VerificationRequest');
const VerificationReview = require('../src/models/VerificationReview');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectDatabase();
});

beforeEach(async () => {
  await Auction.deleteMany({});
  await AuctionReview.deleteMany({});
  await VerificationRequest.deleteMany({});
  await VerificationReview.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await disconnectDatabase();
});
