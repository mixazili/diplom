const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true
    },
    mimeType: {
      type: String,
      required: true,
      trim: true
    },
    size: {
      type: Number,
      required: true
    },
    path: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const readReceiptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    text: {
      type: String,
      default: '',
      trim: true,
      maxlength: 4000
    },
    attachments: {
      type: [attachmentSchema],
      default: []
    },
    readBy: {
      type: [readReceiptSchema],
      default: []
    }
  },
  { timestamps: true }
);

chatMessageSchema.index({ chat: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
