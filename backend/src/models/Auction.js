const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['draft', 'moderation', 'returned', 'published', 'active', 'finished', 'cancelled'],
      default: 'draft'
    },
    moderationComment: {
      type: String,
      default: null
    },
    startPrice: {
      type: Number,
      required: true,
      min: 0
    },
    bidStep: {
      type: Number,
      required: true,
      min: 1
    },
    depositAmount: {
      type: Number,
      required: true,
      min: 0
    },
    startsAt: {
      type: Date,
      required: true
    },
    endsAt: {
      type: Date,
      required: true
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Auction', auctionSchema);
