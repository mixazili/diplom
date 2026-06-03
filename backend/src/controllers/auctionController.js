const fs = require('fs');
const Auction = require('../models/Auction');
const AuctionApplication = require('../models/AuctionApplication');
const Bid = require('../models/Bid');
const Deposit = require('../models/Deposit');
const AuctionView = require('../models/AuctionView');
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

const buildViewerKey = (req) => {
  if (req.user?._id) {
    return `user:${req.user._id.toString()}`;
  }

  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwardedFor || req.ip || req.socket?.remoteAddress || 'unknown';
  const userAgent = String(req.headers['user-agent'] || 'unknown').slice(0, 160);

  return `guest:${ip}:${userAgent}`;
};

const incrementAuctionViewOncePerHour = async ({ auctionId, viewerKey }) => {
  try {
    await AuctionView.create({
      auction: auctionId,
      viewerKey,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    });
    await Auction.updateOne({ _id: auctionId }, { $inc: { viewsCount: 1 } });
    return true;
  } catch (error) {
    if (error.code === 11000) {
      return false;
    }

    throw error;
  }
};

const publicAuctionStatuses = [
  'application_waiting',
  'applications_open',
  'bidding_waiting',
  'bidding_active',
  'finished_success',
  'finished_failed',
  'cancelled'
];

const catalogStatusOrder = {
  application_waiting: 1,
  applications_open: 2,
  bidding_waiting: 3,
  bidding_active: 4,
  finished_success: 5,
  finished_failed: 6,
  cancelled: 7
};

const getQueryList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  return String(value || '').trim()
    ? String(value).split(',').map((item) => item.trim()).filter(Boolean)
    : [];
};

const locationRegions = {
  minsk_city: {
    label: 'г. Минск',
    aliases: ['г минск', 'город минск']
  },
  minsk_region: {
    label: 'Минская область',
    aliases: ['минская область', 'минская обл', 'минская о']
  },
  brest_region: {
    label: 'Брестская область',
    aliases: ['брестская область', 'брестская обл', 'брестская о']
  },
  vitebsk_region: {
    label: 'Витебская область',
    aliases: ['витебская область', 'витебская обл', 'витебская о']
  },
  gomel_region: {
    label: 'Гомельская область',
    aliases: ['гомельская область', 'гомельская обл', 'гомельская о']
  },
  grodno_region: {
    label: 'Гродненская область',
    aliases: ['гродненская область', 'гродненская обл', 'гродненская о']
  },
  mogilev_region: {
    label: 'Могилевская область',
    aliases: ['могилевская область', 'могилевская обл', 'могилевская о']
  }
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildAddressRegex = (tokens) => new RegExp(tokens.map(escapeRegExp).join('|'), 'i');

const buildCityRegex = (city) => new RegExp(`(^|[\\s,.;])(?:г\\.?|город)?\\s*${escapeRegExp(city)}([\\s,.;]|$)`, 'i');

const formatViewerParticipation = ({ application, deposit, auction }) => {
  if (!application) {
    return null;
  }

  return {
    status: application.status,
    participantNumber: application.participantNumber || null,
    rejectionReason: application.rejectionReason || null,
    depositStatus: deposit?.status || null,
    depositPaidAt: deposit?.paidAt || null,
    lotPaymentStatus: application.lotPaymentStatus,
    lotPaidAt: application.lotPaidAt || null,
    isWinner: Boolean(
      application.participantNumber &&
      auction?.winnerParticipantNumber &&
      application.participantNumber === auction.winnerParticipantNumber
    )
  };
};

const getAuctionParticipantStats = async (auctionId) => ({
  admittedCount: await AuctionApplication.countDocuments({
    auction: auctionId,
    status: 'approved',
    participantNumber: { $ne: null }
  })
});

const attachViewerParticipation = async (auctions, userId) => {
  if (!userId || auctions.length === 0) {
    return auctions.map(formatAuction);
  }

  const auctionIds = auctions.map((auction) => auction._id);
  const [applications, deposits] = await Promise.all([
    AuctionApplication.find({ auction: { $in: auctionIds }, participant: userId }),
    Deposit.find({ auction: { $in: auctionIds }, payer: userId })
  ]);
  const applicationByAuction = new Map(applications.map((application) => [application.auction.toString(), application]));
  const depositByAuction = new Map(deposits.map((deposit) => [deposit.auction.toString(), deposit]));

  return auctions.map((auction) => {
    const auctionId = auction._id.toString();
    const application = applicationByAuction.get(auctionId);

    return {
      ...formatAuction(auction),
      viewerParticipation: formatViewerParticipation({
        application,
        deposit: depositByAuction.get(auctionId),
        auction
      })
    };
  });
};

const listPublicAuctions = asyncHandler(async (req, res) => {
  await updateAuctionStatuses();

  const scope = String(req.query.scope || 'all');
  const requestedLimit = Number(req.query.limit) || (scope === 'catalog' ? 20 : 12);
  const limit = Math.min(Math.max(requestedLimit, 1), scope === 'catalog' ? 60 : 48);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const skip = (page - 1) * limit;
  const query = { status: { $in: publicAuctionStatuses } };
  const andConditions = [];
  const categories = getQueryList(req.query.category);
  const statuses = getQueryList(req.query.status);
  const auctionTypes = getQueryList(req.query.auctionType);
  const minPrice = Number(req.query.minPrice);
  const maxPrice = Number(req.query.maxPrice);
  const onlyOwn = String(req.query.onlyOwn || '') === 'true';
  const onlyParticipating = String(req.query.onlyParticipating || '') === 'true';
  const search = String(req.query.search || '').trim();
  const region = String(req.query.region || '').trim();
  const city = String(req.query.city || '').trim();

  if (scope === 'home' || scope === 'popular') {
    query.status = { $in: ['application_waiting', 'applications_open'] };
  } else if (statuses.length > 0) {
    query.status = { $in: statuses.filter((status) => publicAuctionStatuses.includes(status)) };
  }

  if (categories.length > 0) {
    query['item.category'] = { $in: categories };
  }

  if (search) {
    andConditions.push({
      $or: [
        { 'item.title': { $regex: search, $options: 'i' } },
        { 'item.locationAddress': { $regex: search, $options: 'i' } },
        { lotNumber: { $regex: search, $options: 'i' } }
      ]
    });
  }

  if (auctionTypes.length > 0) {
    query['pricing.auctionType'] = { $in: auctionTypes.filter((type) => ['increase', 'decrease'].includes(type)) };
  }

  if (region && locationRegions[region]) {
    const regionData = locationRegions[region];
    andConditions.push({
      $or: [
        { 'item.locationRegion': regionData.label },
        { 'item.locationAddress': buildAddressRegex(regionData.aliases) }
      ]
    });
  }

  if (city) {
    andConditions.push({
      $or: [
        { 'item.locationCity': city },
        { 'item.locationAddress': buildCityRegex(city) }
      ]
    });
  }

  if (onlyOwn) {
    query.owner = req.user?._id || null;
  }

  if (onlyParticipating) {
    if (!req.user?._id) {
      query._id = { $in: [] };
    } else {
      const applicationAuctionIds = await AuctionApplication.distinct('auction', {
        participant: req.user._id
      });
      query._id = { $in: applicationAuctionIds };
    }
  }

  andConditions.push({
    $or: [
      { status: { $ne: 'cancelled' } },
      { lotNumber: { $type: 'string' } }
    ]
  });

  if (andConditions.length > 0) {
    query.$and = andConditions;
  }

  const boundsQuery = { ...query };

  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    query['pricing.priceWithVat'] = {};
    if (Number.isFinite(minPrice)) {
      query['pricing.priceWithVat'].$gte = minPrice;
    }
    if (Number.isFinite(maxPrice)) {
      query['pricing.priceWithVat'].$lte = maxPrice;
    }
  }

  const sortMode = String(req.query.sort || (scope === 'popular' ? 'views_desc' : 'newest'));
  const [allAuctions, total, priceBoundsResult] = await Promise.all([
    Auction.find(query),
    Auction.countDocuments(query),
    Auction.aggregate([
      { $match: boundsQuery },
      {
        $group: {
          _id: null,
          min: { $min: '$pricing.priceWithVat' },
          max: { $max: '$pricing.priceWithVat' }
        }
      }
    ])
  ]);
  const direction = sortMode.endsWith('_asc') || sortMode === 'oldest' ? 1 : -1;
  const sortedAuctions = allAuctions.sort((left, right) => {
    if (sortMode.startsWith('price')) {
      return ((left.pricing?.priceWithVat || 0) - (right.pricing?.priceWithVat || 0)) * direction;
    }

    if (sortMode.startsWith('views')) {
      return ((left.viewsCount || 0) - (right.viewsCount || 0)) * direction;
    }

    const statusDirection = sortMode === 'oldest' ? -1 : 1;
    const statusDiff = ((catalogStatusOrder[left.status] || 99) - (catalogStatusOrder[right.status] || 99)) * statusDirection;
    if (statusDiff !== 0) {
      return statusDiff;
    }

    const leftDate = new Date(left.reviewedAt || left.createdAt || 0).getTime();
    const rightDate = new Date(right.reviewedAt || right.createdAt || 0).getTime();
    return (leftDate - rightDate) * direction;
  });
  const auctions = sortedAuctions.slice(skip, skip + limit);
  const priceBounds = priceBoundsResult[0] || { min: 0, max: 0 };

  res.json({
    auctions: await attachViewerParticipation(auctions, req.user?._id),
    total,
    page,
    limit,
    priceBounds: {
      min: Math.floor(priceBounds.min || 0),
      max: Math.ceil(priceBounds.max || 0)
    }
  });
});

const getPublicAuction = asyncHandler(async (req, res) => {
  await updateAuctionStatuses();
  const auction = await Auction.findOne({
    _id: req.params.id,
    status: { $in: publicAuctionStatuses },
    $or: [
      { status: { $ne: 'cancelled' } },
      { lotNumber: { $type: 'string' } }
    ]
  });

  if (!auction) {
    res.status(404);
    return res.json({ message: 'Лот не найден или еще не опубликован' });
  }

  const isOwner = req.user?._id && auction.owner?.toString() === req.user._id.toString();

  if (!isOwner) {
    const incremented = await incrementAuctionViewOncePerHour({
      auctionId: auction._id,
      viewerKey: buildViewerKey(req)
    });

    if (incremented) {
      auction.viewsCount = (auction.viewsCount || 0) + 1;
    }
  }

  const [application, deposit, bids] = await Promise.all([
    req.user?._id
      ? AuctionApplication.findOne({ auction: auction._id, participant: req.user._id })
      : null,
    req.user?._id
      ? Deposit.findOne({ auction: auction._id, payer: req.user._id })
      : null,
    Bid.find({ auction: auction._id })
      .sort({ createdAt: 1 })
      .populate('bidder')
  ]);

  const formattedBids = bids.map((bid, index) => ({
    id: bid._id.toString(),
    amount: bid.amount,
    increment: bid.increment || 0,
    createdAt: bid.createdAt,
    participantNumber: bid.participantNumber || index + 1,
    bidder: bid.bidder ? { id: bid.bidder._id.toString() } : null
  }));

  res.json({
    auction: {
      ...formatAuction(auction),
      participantStats: await getAuctionParticipantStats(auction._id)
    },
    viewer: {
      isOwner: Boolean(isOwner),
      participation: application
        ? {
            status: application.status,
            participantNumber: application.participantNumber || null,
            rejectionReason: application.rejectionReason || null,
            depositStatus: deposit?.status || null,
            depositPaidAt: deposit?.paidAt || null,
            lotPaymentStatus: application.lotPaymentStatus,
            lotPaidAt: application.lotPaidAt || null
          }
        : null
    },
    bids: formattedBids
  });
});

const listSimilarAuctions = asyncHandler(async (req, res) => {
  await updateAuctionStatuses();
  const auction = await Auction.findById(req.params.id);

  if (!auction) {
    res.status(404);
    return res.json({ message: 'Лот не найден' });
  }

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 18);
  const skip = (page - 1) * limit;
  const query = {
    _id: { $ne: auction._id },
    status: { $in: ['application_waiting', 'applications_open'] },
    'item.category': auction.item?.category
  };

  const [auctions, total] = await Promise.all([
    Auction.find(query)
      .sort({ viewsCount: -1, reviewedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Auction.countDocuments(query)
  ]);

  res.json({
    auctions: await attachViewerParticipation(auctions, req.user?._id),
    page,
    limit,
    total
  });
});

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
  listPublicAuctions,
  listSimilarAuctions,
  getPublicAuction,
  formatAuction
};
