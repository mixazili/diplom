const { sanitizeUser } = require('../services/authService');

const onlineWindowMs = 5 * 60 * 1000;

const isOnline = (user) => {
  if (!user.lastSeenAt) {
    return false;
  }

  return Date.now() - new Date(user.lastSeenAt).getTime() <= onlineWindowMs;
};

const formatModerator = (user) => ({
  ...sanitizeUser(user),
  onlineStatus: isOnline(user) ? 'online' : 'offline',
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const formatVerification = (verification) => ({
  id: verification._id.toString(),
  user: verification.user ? sanitizeUser(verification.user) : null,
  accountType: verification.accountType,
  isResident: verification.isResident,
  status: verification.status,
  personalData: verification.personalData,
  addressData: verification.addressData,
  documentData: verification.documentData,
  bankData: verification.bankData,
  organizationData: verification.organizationData,
  documents: verification.documents.map((document) => ({
    fieldName: document.fieldName,
    originalName: document.originalName,
    mimeType: document.mimeType,
    size: document.size,
    path: document.path,
    url: `/uploads/verification/${document.path.split(/[\\/]/).pop()}`
  })),
  submittedAt: verification.submittedAt,
  moderationComment: verification.moderationComment,
  reviewedBy: verification.reviewedBy ? sanitizeUser(verification.reviewedBy) : null,
  reviewedAt: verification.reviewedAt,
  createdAt: verification.createdAt,
  updatedAt: verification.updatedAt
});

const formatReview = (review) => ({
  id: review._id.toString(),
  action: review.action,
  comment: review.comment,
  createdAt: review.createdAt,
  moderator: review.moderator ? sanitizeUser(review.moderator) : null,
  user: review.user ? sanitizeUser(review.user) : null,
  verificationRequest: review.verificationRequest ? formatVerification(review.verificationRequest) : null
});

module.exports = {
  formatModerator,
  formatVerification,
  formatReview,
  isOnline
};
