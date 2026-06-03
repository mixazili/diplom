const mongoose = require('mongoose');

const auctionApplicationSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: true
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'deposit_required', 'approved', 'rejected'],
      default: 'pending'
    },
    participantNumber: {
      type: Number,
      default: null
    },
    rejectionReason: {
      type: String,
      default: null
    },
    lotPaymentStatus: {
      type: String,
      enum: ['not_required', 'pending', 'paid'],
      default: 'not_required'
    },
    lotPaidAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

auctionApplicationSchema.index({ auction: 1, participant: 1 }, { unique: true });
auctionApplicationSchema.index(
  { auction: 1, participantNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { participantNumber: { $type: 'number' } }
  }
);

module.exports = mongoose.model('AuctionApplication', auctionApplicationSchema);
