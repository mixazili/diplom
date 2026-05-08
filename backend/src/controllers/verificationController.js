const VerificationRequest = require('../models/VerificationRequest');
const User = require('../models/User');
const fs = require('fs');
const asyncHandler = require('../utils/asyncHandler');
const { sanitizeUser } = require('../services/authService');
const { validateVerificationPayload } = require('../utils/verificationValidation');

const parsePayload = (rawPayload) => {
  if (!rawPayload) {
    return {};
  }

  if (typeof rawPayload === 'object') {
    return rawPayload;
  }

  try {
    return JSON.parse(rawPayload);
  } catch (error) {
    return null;
  }
};

const mapUploadedFiles = (files = []) =>
  files.map((file) => ({
    fieldName: file.fieldname,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path
  }));

const removeUploadedFiles = (files = []) => {
  files.forEach((file) => {
    fs.unlink(file.path, () => {});
  });
};

const getMyVerification = asyncHandler(async (req, res) => {
  const verification = await VerificationRequest.findOne({ user: req.user._id }).sort({ createdAt: -1 });

  res.json({
    verification
  });
});

const submitVerification = asyncHandler(async (req, res) => {
  const payload = parsePayload(req.body.payload);

  if (!payload) {
    removeUploadedFiles(req.files);
    res.status(400);
    return res.json({ message: 'Некорректные данные формы', errors: { payload: 'Payload должен быть JSON' } });
  }

  const uploadedFiles = mapUploadedFiles(req.files);
  const errors = validateVerificationPayload(payload, uploadedFiles);

  if (Object.keys(errors).length > 0) {
    removeUploadedFiles(req.files);
    res.status(400);
    return res.json({ message: 'Проверьте данные верификации', errors });
  }

  const verification = await VerificationRequest.create({
    user: req.user._id,
    accountType: payload.accountType,
    isResident: payload.isResident,
    status: 'pending',
    personalData: payload.personalData || {},
    addressData: payload.addressData || {},
    documentData: payload.documentData || {},
    bankData: payload.bankData || {},
    organizationData: payload.organizationData || {},
    documents: uploadedFiles
  });

  const user = await User.findById(req.user._id);
  user.accountType = payload.accountType;
  user.isResident = payload.isResident;
  user.verificationStatus = 'pending';
  await user.save();

  res.status(201).json({
    message: 'Заявка на верификацию отправлена',
    user: sanitizeUser(user),
    verification
  });
});

module.exports = {
  getMyVerification,
  submitVerification
};
