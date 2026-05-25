const fs = require('fs');
const Auction = require('../models/Auction');
const VerificationRequest = require('../models/VerificationRequest');
const asyncHandler = require('../utils/asyncHandler');
const { formatAuction } = require('../utils/auctionFormatters');
const { validateAuctionPayload } = require('../utils/auctionValidation');
const { updateAuctionStatuses } = require('../services/statusAutomationService');

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
    .map((photo) => (photo.toObject ? photo.toObject() : photo));
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
const formatAddress = (address = {}) => address.legalAddress || address.postalAddress || '';

const buildSellerInfo = ({ user, verification }) => {
  const personalData = verification.personalData || {};
  const organizationData = verification.organizationData || {};
  const addressData = verification.addressData || {};
  const fullName = joinName(personalData.lastName, personalData.firstName, personalData.middleName);

  if (user.accountType === 'legal_entity') {
    return {
      accountType: user.accountType,
      isResident: user.isResident,
      organizationName: organizationData.shortName || organizationData.fullName || '',
      unp: organizationData.unp || organizationData.taxId || '',
      legalAddress: formatAddress(addressData)
    };
  }

  if (user.accountType === 'entrepreneur') {
    return {
      accountType: user.accountType,
      isResident: user.isResident,
      fullName,
      unp: organizationData.unp || organizationData.taxId || '',
      phone: personalData.phone || ''
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
  const { errors, normalized } = validateAuctionPayload({ payload, photos: uploadedPhotos, user: req.user });

  if (Object.keys(errors).length > 0) {
    removeUploadedFiles(req.files);
    res.status(400);
    return res.json({ message: 'Проверьте данные лота', errors });
  }

  const auction = await Auction.create({
    owner: req.user._id,
    status: normalized.isDraft ? 'draft' : 'pending',
    moderationComment: '',
    pricing: normalized.pricing,
    schedule: normalized.schedule,
    item: normalized.item,
    photos: uploadedPhotos,
    inspection: normalized.inspection,
    seller: buildSellerInfo({ user: req.user, verification }),
    submittedAt: normalized.isDraft ? null : new Date(),
    reviewedBy: null,
    reviewedAt: null
  });

  res.status(201).json({
    message: normalized.isDraft ? 'Черновик лота сохранен' : 'Заявка на создание лота отправлена на проверку',
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

  const payload = parsePayload(req.body.payload);

  if (!payload) {
    removeUploadedFiles(req.files);
    res.status(400);
    return res.json({ message: 'Некорректные данные формы', errors: { payload: 'Payload должен быть JSON' } });
  }

  if (!['draft', 'pending', 'returned', 'application_waiting'].includes(auction.status) || (auction.status === 'application_waiting' && !payload.isDraft)) {
    removeUploadedFiles(req.files);
    res.status(400);
    return res.json({ message: 'Редактировать можно неопубликованные лоты и лоты до начала приема заявок при возврате в черновик' });
  }

  const { photos, removedPhotos, validationPhotos } = mergeAuctionPhotos({ auction, payload, files: req.files || [] });
  const { errors, normalized } = validateAuctionPayload({ payload, photos: validationPhotos, user: req.user });

  if (Object.keys(errors).length > 0) {
    removeUploadedFiles(req.files);
    res.status(400);
    return res.json({ message: 'Проверьте данные лота', errors });
  }

  auction.status = normalized.isDraft ? 'draft' : 'pending';
  auction.lotNumber = undefined;
  auction.moderationComment = '';
  auction.pricing = normalized.pricing;
  auction.schedule = normalized.schedule;
  auction.item = normalized.item;
  auction.photos = photos;
  auction.inspection = normalized.inspection;
  auction.submittedAt = normalized.isDraft ? auction.submittedAt : new Date();
  auction.reviewedBy = null;
  auction.reviewedAt = null;
  await auction.save();
  removeAuctionPhotos(removedPhotos);

  res.json({
    message: normalized.isDraft ? 'Черновик лота сохранен' : 'Лот отправлен на проверку',
    auction: formatAuction(auction)
  });
});

const deleteAuction = asyncHandler(async (req, res) => {
  const auction = await Auction.findOne({ _id: req.params.id, owner: req.user._id });

  if (!auction) {
    res.status(404);
    return res.json({ message: 'Лот не найден' });
  }

  if (!['draft', 'pending', 'returned', 'application_waiting'].includes(auction.status)) {
    res.status(400);
    return res.json({ message: 'Удалить можно неопубликованный лот или лот до начала приема заявок' });
  }

  auction.status = 'cancelled';
  auction.lotNumber = undefined;
  auction.moderationComment = 'Удален пользователем';
  await auction.save();

  res.json({ message: 'Лот удален' });
});

const returnAuctionToDraft = asyncHandler(async (req, res) => {
  const auction = await Auction.findOne({ _id: req.params.id, owner: req.user._id });

  if (!auction) {
    res.status(404);
    return res.json({ message: 'Лот не найден' });
  }

  if (auction.status !== 'application_waiting') {
    res.status(400);
    return res.json({ message: 'Вернуть в черновик можно только лот до начала приема заявок' });
  }

  auction.status = 'draft';
  auction.lotNumber = undefined;
  auction.moderationComment = '';
  auction.submittedAt = null;
  auction.reviewedBy = null;
  auction.reviewedAt = null;
  await auction.save();

  res.json({ message: 'Лот возвращен в черновик', auction: formatAuction(auction) });
});

const listMyAuctions = asyncHandler(async (req, res) => {
  await updateAuctionStatuses();
  const auctions = await Auction.find({ owner: req.user._id, status: { $ne: 'cancelled' } }).sort({ createdAt: -1 });

  res.json({ auctions: auctions.map(formatAuction) });
});

module.exports = {
  createAuction,
  updateAuction,
  deleteAuction,
  returnAuctionToDraft,
  listMyAuctions,
  formatAuction
};
