process.env.NODE_ENV = 'test';

jest.setTimeout(30000);

const { connectDatabase, disconnectDatabase } = require('../src/config/database');
const User = require('../src/models/User');
const Auction = require('../src/models/Auction');
const AuctionApplication = require('../src/models/AuctionApplication');
const AuctionReview = require('../src/models/AuctionReview');
const AuctionView = require('../src/models/AuctionView');
const Bid = require('../src/models/Bid');
const Counter = require('../src/models/Counter');
const Deposit = require('../src/models/Deposit');
const VerificationRequest = require('../src/models/VerificationRequest');
const VerificationReview = require('../src/models/VerificationReview');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectDatabase();
});

beforeEach(async () => {
  await Auction.deleteMany({});
  await AuctionApplication.deleteMany({});
  await AuctionReview.deleteMany({});
  await AuctionView.deleteMany({});
  await Bid.deleteMany({});
  await Counter.deleteMany({});
  await Deposit.deleteMany({});
  await VerificationRequest.deleteMany({});
  await VerificationReview.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await disconnectDatabase();
});
