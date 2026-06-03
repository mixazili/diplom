const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: true
    },
    bidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    participantNumber: {
      type: Number,
      required: true,
      min: 10000000,
      max: 99999999
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    increment: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { timestamps: true }
);

bidSchema.index({ auction: 1, amount: -1 });
bidSchema.index({ auction: 1, createdAt: 1 });

module.exports = mongoose.model('Bid', bidSchema);
