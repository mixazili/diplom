const mongoose = require('mongoose');

const auctionProtocolSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
      unique: true,
      index: true
    },
    auctionNumber: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    protocolNumber: {
      type: String,
      required: true,
      trim: true
    },
    generatedAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['generated'],
      default: 'generated'
    },
    resultStatus: {
      type: String,
      enum: ['finished_success', 'finished_failed'],
      required: true
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    contentHtml: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuctionProtocol', auctionProtocolSchema);
