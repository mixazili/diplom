const fs = require('fs');
const Auction = require('../models/Auction');
const VerificationRequest = require('../models/VerificationRequest');
const asyncHandler = require('../utils/asyncHandler');
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
  owner: auction.owner,
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
  createdAt: auction.createdAt,
  updatedAt: auction.updatedAt
});

const mapPhotos = (files = [], mainPhotoIndex = 0) =>
  files.map((file, index) => ({
    fieldName: file.fieldname,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path,
    isMain: index === mainPhotoIndex,
    order: index
  }));

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

const createAuction = asyncHandler(async (req, res) => {
  if (req.user.role !== 'user' || req.user.verificationStatus !== 'approved') {
    removeUploadedFiles(req.files);
    res.status(403);
    return res.json({ message: 'Создавать лоты могут только верифицированные пользователи' });
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

  const { errors, normalized } = validateAuctionPayload({
    payload,
    photos: req.files || [],
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
    pricing: normalized.pricing,
    schedule: normalized.schedule,
    item: normalized.item,
    photos: mapPhotos(req.files, normalized.mainPhotoIndex),
    inspection: normalized.inspection,
    seller: buildSellerInfo({ user: req.user, verification })
  });

  res.status(201).json({
    message: 'Заявка на создание лота отправлена на проверку',
    auction: formatAuction(auction)
  });
});

const listMyAuctions = asyncHandler(async (req, res) => {
  const auctions = await Auction.find({ owner: req.user._id }).sort({ createdAt: -1 });

  res.json({
    auctions: auctions.map(formatAuction)
  });
});

module.exports = {
  createAuction,
  listMyAuctions,
  formatAuction
};
