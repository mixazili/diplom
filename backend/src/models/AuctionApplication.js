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
    rejectionReason: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

auctionApplicationSchema.index({ auction: 1, participant: 1 }, { unique: true });

module.exports = mongoose.model('AuctionApplication', auctionApplicationSchema);
