const mongoose = require('mongoose');

const participantInfoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    accountType: {
      type: String,
      enum: ['individual', 'legal_entity', 'entrepreneur'],
      default: null
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    fullName: {
      type: String,
      default: '',
      trim: true
    },
    organizationName: {
      type: String,
      default: '',
      trim: true
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    email: {
      type: String,
      default: '',
      trim: true
    },
    unp: {
      type: String,
      default: '',
      trim: true
    },
    legalAddress: {
      type: String,
      default: '',
      trim: true
    },
    postalAddress: {
      type: String,
      default: '',
      trim: true
    }
  },
  { _id: false }
);

const lastMessageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      default: ''
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    attachmentsCount: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
      unique: true,
      index: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ],
      default: []
    },
    sellerInfo: {
      type: participantInfoSchema,
      required: true
    },
    buyerInfo: {
      type: participantInfoSchema,
      required: true
    },
    lastMessage: {
      type: lastMessageSchema,
      default: null
    },
    lastMessageAt: {
      type: Date,
      default: null,
      index: true
    }
  },
  { timestamps: true }
);

chatSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);
