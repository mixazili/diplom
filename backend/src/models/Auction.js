const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema(
  {
    fieldName: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    isMain: { type: Boolean, default: false },
    order: { type: Number, default: 0 }
  },
  { _id: false }
);

const characteristicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const auctionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    lotNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'returned', 'published', 'active', 'finished', 'cancelled'],
      default: 'pending',
      index: true
    },
    moderationComment: {
      type: String,
      default: null
    },
    pricing: {
      priceWithoutVat: { type: Number, required: true, min: 0 },
      priceWithVat: { type: Number, required: true, min: 0 },
      vatApplies: { type: Boolean, required: true },
      vatRate: { type: Number, default: 0 },
      vatLabel: { type: String, required: true },
      depositAmount: { type: Number, required: true, min: 0 },
      minBidStep: { type: Number, required: true, min: 0 },
      organizationFeePercent: { type: Number, default: 1 }
    },
    schedule: {
      applicationStartAt: { type: Date, required: true },
      applicationEndAt: { type: Date, required: true },
      biddingStartAt: { type: Date, required: true },
      biddingEndAt: { type: Date, required: true },
      paymentDeadlineDays: { type: Number, required: true, min: 5, max: 90 },
      depositReturnDays: { type: Number, default: 10 },
      contractDeadlineDays: { type: Number, required: true, min: 5, max: 90 }
    },
    item: {
      title: { type: String, required: true, trim: true, maxlength: 100 },
      category: { type: String, required: true, trim: true },
      characteristics: { type: [characteristicSchema], default: [] },
      description: { type: String, default: '', trim: true },
      locationAddress: { type: String, required: true, trim: true },
      geoLocation: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
      }
    },
    photos: {
      type: [photoSchema],
      default: []
    },
    inspection: {
      contactName: { type: String, required: true, trim: true },
      contactPhone: { type: String, required: true, trim: true },
      contactEmail: { type: String, default: '', trim: true }
    },
    seller: {
      accountType: { type: String, enum: ['individual', 'legal_entity', 'entrepreneur'], required: true },
      isResident: { type: Boolean, default: null },
      fullName: { type: String, default: '', trim: true },
      phone: { type: String, default: '', trim: true },
      additionalPhone: { type: String, default: '', trim: true },
      organizationName: { type: String, default: '', trim: true },
      unp: { type: String, default: '', trim: true },
      legalAddress: { type: String, default: '', trim: true }
    },
    submittedAt: {
      type: Date,
      default: Date.now
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

module.exports = mongoose.model('Auction', auctionSchema);
