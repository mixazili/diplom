const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    body: {
      type: String,
      default: '',
      trim: true
    },
    importance: {
      type: String,
      enum: ['normal', 'important', 'critical'],
      default: 'important'
    },
    link: {
      type: String,
      default: ''
    },
    entity: {
      kind: {
        type: String,
        default: ''
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
      }
    },
    readAt: {
      type: Date,
      default: null
    },
    emailedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
