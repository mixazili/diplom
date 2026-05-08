const bcrypt = require('bcryptjs');

const createEmailVerificationCode = () => String(Math.floor(100000 + Math.random() * 900000));

const hashValue = (value) => bcrypt.hash(String(value), 10);
const compareValue = (value, hash) => bcrypt.compare(String(value), hash);

const sanitizeUser = (user) => ({
  id: user._id.toString(),
  email: user.email,
  role: user.role,
  accountType: user.accountType,
  isResident: user.isResident,
  isEmailVerified: user.isEmailVerified,
  verificationStatus: user.verificationStatus,
  isActive: user.isActive,
  lastSeenAt: user.lastSeenAt
});

module.exports = {
  createEmailVerificationCode,
  hashValue,
  compareValue,
  sanitizeUser
};
