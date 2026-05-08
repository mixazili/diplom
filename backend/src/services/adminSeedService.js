const bcrypt = require('bcryptjs');
const config = require('../config/env');
const User = require('../models/User');

const ensureAdminAccount = async () => {
  const email = config.admin.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(config.admin.password, 10);

  const existingAdmin = await User.findOne({ role: 'admin' });

  if (existingAdmin) {
    existingAdmin.email = email;
    existingAdmin.passwordHash = passwordHash;
    existingAdmin.isEmailVerified = true;
    existingAdmin.emailVerifiedAt = existingAdmin.emailVerifiedAt || new Date();
    existingAdmin.isActive = true;
    await existingAdmin.save();
    return existingAdmin;
  }

  return User.create({
    email,
    passwordHash,
    role: 'admin',
    isEmailVerified: true,
    emailVerifiedAt: new Date(),
    isActive: true,
    verificationStatus: 'approved'
  });
};

module.exports = {
  ensureAdminAccount
};
