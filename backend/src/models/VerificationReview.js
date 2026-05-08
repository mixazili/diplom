const mongoose = require('mongoose');

const verificationReviewSchema = new mongoose.Schema(
  {
    verificationRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VerificationRequest',
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    moderator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    action: {
      type: String,
      enum: ['approved', 'rejected'],
      required: true
    },
    comment: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('VerificationReview', verificationReviewSchema);
