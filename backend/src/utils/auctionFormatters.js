const { sanitizeUser } = require('../services/authService');

const formatUserRef = (value) => {
  if (!value) {
    return null;
  }

  if (value.email) {
    return sanitizeUser(value);
  }

  return value;
};

const formatPhoto = (photo) => ({
  fieldName: photo.fieldName,
  originalName: photo.originalName,
  mimeType: photo.mimeType,
  size: photo.size,
  path: photo.path,
  isMain: photo.isMain,
  order: photo.order,
  url: `/uploads/auctions/${photo.path.split(/[\\/]/).pop()}`
});

const formatAuction = (auction) => ({
  id: auction._id.toString(),
  owner: formatUserRef(auction.owner),
  lotNumber: auction.lotNumber,
  status: auction.status,
  moderationComment: auction.moderationComment,
  pricing: auction.pricing,
  schedule: auction.schedule,
  item: auction.item,
  photos: auction.photos.map(formatPhoto),
  inspection: auction.inspection,
  seller: auction.seller,
  submittedAt: auction.submittedAt,
  reviewedBy: formatUserRef(auction.reviewedBy),
  reviewedAt: auction.reviewedAt,
  createdAt: auction.createdAt,
  updatedAt: auction.updatedAt
});

const formatAuctionReview = (review) => ({
  id: review._id.toString(),
  action: review.action,
  comment: review.comment,
  createdAt: review.createdAt,
  moderator: formatUserRef(review.moderator),
  owner: formatUserRef(review.owner),
  auction: review.auction ? formatAuction(review.auction) : null,
  auctionSnapshot: review.auctionSnapshot || null
});

module.exports = {
  formatAuction,
  formatAuctionReview,
  formatPhoto
};
