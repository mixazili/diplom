const mongoose = require('mongoose');

const auctionViewSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: true
    },
    viewerKey: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }
    }
  },
  { timestamps: true }
);

auctionViewSchema.index({ auction: 1, viewerKey: 1 }, { unique: true });

module.exports = mongoose.model('AuctionView', auctionViewSchema);
