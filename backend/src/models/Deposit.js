const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: true
    },
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'forfeited'],
      default: 'pending'
    },
    paidAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

depositSchema.index({ auction: 1, payer: 1 }, { unique: true });

module.exports = mongoose.model('Deposit', depositSchema);
