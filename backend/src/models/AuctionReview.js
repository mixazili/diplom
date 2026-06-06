const mongoose = require('mongoose');

const auctionReviewSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
      index: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    moderator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    action: {
      type: String,
      enum: ['approved', 'returned', 'cancelled'],
      required: true
    },
    comment: {
      type: String,
      default: ''
    },
    auctionSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuctionReview', auctionReviewSchema);
