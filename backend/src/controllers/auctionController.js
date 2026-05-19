const fs = require('fs');
const Auction = require('../models/Auction');
const VerificationRequest = require('../models/VerificationRequest');
const asyncHandler = require('../utils/asyncHandler');
const { formatAuction } = require('../utils/auctionFormatters');
const { validateAuctionPayload } = require('../utils/auctionValidation');

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

const removeUploadedFiles = (files = []) => {
  files.forEach((file) => {
    fs.unlink(file.path, () => {});
  });
};

const removeAuctionPhotos = (photos = []) => {
  photos.forEach((photo) => {
    if (photo.path) {
      fs.unlink(photo.path, () => {});
    }
  });
};

const mapUploadedPhotos = (files = []) =>
  files.map((file) => ({
    fieldName: file.fieldname,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path,
    isMain: false,
    order: 0
  }));

const normalizeMainPhotoIndex = (value, maxLength) => {
  const index = Number(value ?? 0);
  if (!Number.isInteger(index) || index < 0 || index >= Math.max(maxLength, 1)) {
    return 0;
  }
  return index;
};

const markMainPhoto = (photos, mainPhotoIndex = 0) =>
  photos.map((photo, index) => ({
    ...photo,
    isMain: index === mainPhotoIndex,
    order: index
  }));

const normalizeExistingPhotoPaths = (payload) => {
  if (!Array.isArray(payload.existingPhotoPaths)) {
    return [];
  }

  return payload.existingPhotoPaths.map((path) => String(path || '')).filter(Boolean);
};

const mergeAuctionPhotos = ({ auction, payload, files }) => {
  const existingPhotoPaths = normalizeExistingPhotoPaths(payload);
  const retainedPhotos = existingPhotoPaths
    .map((path) => auction.photos.find((photo) => photo.path === path))
    .filter(Boolean)
    .map((photo) => photo.toObject ? photo.toObject() : photo);
  const uploadedPhotos = mapUploadedPhotos(files);
  const photos = [...retainedPhotos, ...uploadedPhotos];
  const mainPhotoIndex = normalizeMainPhotoIndex(payload.mainPhotoIndex, photos.length);

  return {
    photos: markMainPhoto(photos, mainPhotoIndex),
    removedPhotos: auction.photos.filter((photo) => !existingPhotoPaths.includes(photo.path)),
    validationPhotos: photos
  };
};

const joinName = (...parts) => parts.filter(Boolean).join(' ').trim();

const formatAddress = (address = {}) => {
  if (address.legalAddress) {
    return address.legalAddress;
  }

  if (address.registrationAddress) {
    return address.registrationAddress;
  }

  return [
    address.region,
    address.district,
    address.locality,
    address.postalCode,
    address.street,
    address.house,
    address.building,
    address.apartment
  ]
    .filter(Boolean)
    .join(', ');
};

const buildSellerInfo = ({ user, verification }) => {
  const personalData = verification.personalData || {};
  const organizationData = verification.organizationData || {};
  const addressData = verification.addressData || {};
  const fullName =
    personalData.fullName ||
    joinName(personalData.lastName, personalData.firstName, personalData.middleName);

  if (user.accountType === 'legal_entity') {
    return {
      accountType: user.accountType,
      isResident: user.isResident,
      organizationName: organizationData.fullName || '',
      unp: organizationData.unp || '',
      legalAddress: formatAddress(addressData)
    };
  }

  if (user.accountType === 'entrepreneur') {
    return {
      accountType: user.accountType,
      isResident: user.isResident,
      fullName,
      unp: organizationData.unp || '',
      phone: organizationData.contactPhone || personalData.phone || ''
    };
  }

  return {
    accountType: user.accountType,
    isResident: user.isResident,
    fullName,
    phone: personalData.phone || '',
    additionalPhone: personalData.additionalPhone || ''
  };
};

const generateLotNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Auction.countDocuments({ createdAt: { $gte: new Date(`${year}-01-01T00:00:00.000Z`) } });
  return `LOT-${year}-${String(count + 1).padStart(6, '0')}`;
};

const getApprovedVerification = (userId) =>
  VerificationRequest.findOne({ user: userId, status: 'approved' }).sort({ reviewedAt: -1, createdAt: -1 });

const ensureCanManageAuctions = (req, res) => {
  if (req.user.role !== 'user' || req.user.verificationStatus !== 'approved') {
    removeUploadedFiles(req.files);
    res.status(403);
    res.json({ message: 'Создавать и редактировать лоты могут только верифицированные пользователи' });
    return false;
  }

  return true;
};

const createAuction = asyncHandler(async (req, res) => {
  if (!ensureCanManageAuctions(req, res)) {
    return;
  }

  const verification = await getApprovedVerification(req.user._id);

  if (!verification) {
    removeUploadedFiles(req.files);
    res.status(403);
    return res.json({ message: 'Не найдена одобренная заявка на верификацию пользователя' });
  }

  const payload = parsePayload(req.body.payload);

  if (!payload) {
    removeUploadedFiles(req.files);
    res.status(400);
    return res.json({ message: 'Некорректные данные формы', errors: { payload: 'Payload должен быть JSON' } });
  }

  const uploadedPhotos = markMainPhoto(mapUploadedPhotos(req.files), normalizeMainPhotoIndex(payload.mainPhotoIndex, req.files.length));
  const { errors, normalized } = validateAuctionPayload({
    payload,
    photos: uploadedPhotos,
    user: req.user
  });

  if (Object.keys(errors).length > 0) {
    removeUploadedFiles(req.files);
    res.status(400);
    return res.json({ message: 'Проверьте данные лота', errors });
  }

  const auction = await Auction.create({
    owner: req.user._id,
    lotNumber: await generateLotNumber(),
    status: 'pending',
    moderationComment: '',
    pricing: normalized.pricing,
    schedule: normalized.schedule,
    item: normalized.item,
    photos: uploadedPhotos,
    inspection: normalized.inspection,
    seller: buildSellerInfo({ user: req.user, verification }),
    submittedAt: new Date(),
    reviewedBy: null,
    reviewedAt: null
  });

  res.status(201).json({
    message: 'Заявка на создание лота отправлена на проверку',
    auction: formatAuction(auction)
  });
});

const updateAuction = asyncHandler(async (req, res) => {
  if (!ensureCanManageAuctions(req, res)) {
    return;
  }

  const auction = await Auction.findOne({ _id: req.params.id, owner: req.user._id });

  if (!auction) {
    removeUploadedFiles(req.files);
    res.status(404);
    return res.json({ message: 'Лот не найден' });
  }

  if (!['pending', 'returned'].includes(auction.status)) {
    removeUploadedFiles(req.files);
    res.status(400);
    return res.json({ message: 'Редактировать можно только лоты на проверке или возвращенные на доработку' });
  }

  const payload = parsePayload(req.body.payload);

  if (!payload) {
    removeUploadedFiles(req.files);
    res.status(400);
    return res.json({ message: 'Некорректные данные формы', errors: { payload: 'Payload должен быть JSON' } });
  }

  const { photos, removedPhotos, validationPhotos } = mergeAuctionPhotos({ auction, payload, files: req.files || [] });
  const { errors, normalized } = validateAuctionPayload({
    payload,
    photos: validationPhotos,
    user: req.user
  });

  if (Object.keys(errors).length > 0) {
    removeUploadedFiles(req.files);
    res.status(400);
    return res.json({ message: 'Проверьте данные лота', errors });
  }

  auction.status = 'pending';
  auction.moderationComment = '';
  auction.pricing = normalized.pricing;
  auction.schedule = normalized.schedule;
  auction.item = normalized.item;
  auction.photos = photos;
  auction.inspection = normalized.inspection;
  auction.submittedAt = new Date();
  auction.reviewedBy = null;
  auction.reviewedAt = null;
  await auction.save();
  removeAuctionPhotos(removedPhotos);

  res.json({
    message: 'Лот повторно отправлен на проверку',
    auction: formatAuction(auction)
  });
});

const deleteAuction = asyncHandler(async (req, res) => {
  const auction = await Auction.findOne({ _id: req.params.id, owner: req.user._id });

  if (!auction) {
    res.status(404);
    return res.json({ message: 'Лот не найден' });
  }

  if (!['pending', 'returned'].includes(auction.status)) {
    res.status(400);
    return res.json({ message: 'Удалить можно только неактивный лот' });
  }

  auction.status = 'cancelled';
  auction.moderationComment = 'Удален пользователем';
  await auction.save();

  res.json({ message: 'Лот удален' });
});

const listMyAuctions = asyncHandler(async (req, res) => {
  const auctions = await Auction.find({ owner: req.user._id, status: { $ne: 'cancelled' } }).sort({ createdAt: -1 });

  res.json({
    auctions: auctions.map(formatAuction)
  });
});

module.exports = {
  createAuction,
  updateAuction,
  deleteAuction,
  listMyAuctions,
  formatAuction
};
