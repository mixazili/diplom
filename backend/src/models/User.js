const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user'
    },
    accountType: {
      type: String,
      enum: ['individual', 'legal_entity', 'entrepreneur'],
      default: null
    },
    isResident: {
      type: Boolean,
      default: null
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerifiedAt: {
      type: Date,
      default: null
    },
    emailVerificationCodeHash: {
      type: String,
      default: null
    },
    emailVerificationCodeExpiresAt: {
      type: Date,
      default: null
    },
    verificationStatus: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
      default: 'draft'
    },
    refreshTokenHash: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
