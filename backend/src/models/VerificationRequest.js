const mongoose = require('mongoose');

const uploadedDocumentSchema = new mongoose.Schema(
  {
    fieldName: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    path: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const verificationRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    accountType: {
      type: String,
      enum: ['individual', 'legal_entity', 'entrepreneur'],
      required: true
    },
    isResident: {
      type: Boolean,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    personalData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    addressData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    documentData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    bankData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    organizationData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    documents: {
      type: [uploadedDocumentSchema],
      default: []
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    moderationComment: {
      type: String,
      default: null
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('VerificationRequest', verificationRequestSchema);
