const Auction = require('../models/Auction');
const Chat = require('../models/Chat');
const VerificationRequest = require('../models/VerificationRequest');

const joinName = (...parts) => parts.filter(Boolean).join(' ').trim();

const buildSellerInfo = (auction) => {
  const seller = auction.seller || {};
  const displayName =
    seller.accountType === 'legal_entity'
      ? seller.organizationName || 'Юридическое лицо'
      : seller.fullName || seller.organizationName || 'Продавец';

  return {
    user: auction.owner,
    accountType: seller.accountType || null,
    displayName,
    fullName: seller.fullName || '',
    organizationName: seller.organizationName || '',
    phone: seller.phone || '',
    email: seller.email || auction.inspection?.contactEmail || '',
    unp: seller.unp || '',
    legalAddress: seller.legalAddress || '',
    postalAddress: seller.postalAddress || ''
  };
};

const buildBuyerInfo = async (buyer) => {
  const verification = await VerificationRequest.findOne({ user: buyer._id || buyer, status: 'approved' })
    .sort({ reviewedAt: -1, createdAt: -1 });
  const personalData = verification?.personalData || {};
  const organizationData = verification?.organizationData || {};
  const addressData = verification?.addressData || {};
  const accountType = verification?.accountType || buyer.accountType || null;
  const fullName =
    personalData.fullName ||
    joinName(personalData.lastName, personalData.firstName, personalData.middleName) ||
    buyer.email;
  const organizationName = organizationData.shortName || organizationData.fullName || '';
  const displayName = accountType === 'legal_entity' ? organizationName || 'Юридическое лицо' : fullName;

  return {
    user: buyer._id || buyer,
    accountType,
    displayName,
    fullName,
    organizationName,
    phone: personalData.phone || organizationData.phone || '',
    email: personalData.notificationEmail || organizationData.notificationEmail || buyer.email || '',
    unp: organizationData.unp || organizationData.taxId || '',
    legalAddress: addressData.legalAddress || '',
    postalAddress: addressData.postalAddress || addressData.livingAddress || ''
  };
};

const ensureDealChatForAuction = async (auctionOrId) => {
  const auction = typeof auctionOrId?.populate === 'function'
    ? auctionOrId
    : await Auction.findById(auctionOrId);

  if (!auction || auction.status !== 'finished_success' || !auction.winner || !auction.owner) {
    return null;
  }

  if (auction.owner.toString() === auction.winner.toString()) {
    return null;
  }

  const existing = await Chat.findOne({ auction: auction._id });

  if (existing) {
    return existing;
  }

  await auction.populate('winner');
  const sellerInfo = buildSellerInfo(auction);
  const buyerInfo = await buildBuyerInfo(auction.winner);

  try {
    return await Chat.create({
      auction: auction._id,
      seller: auction.owner,
      buyer: auction.winner._id || auction.winner,
      participants: [auction.owner, auction.winner._id || auction.winner],
      sellerInfo,
      buyerInfo
    });
  } catch (error) {
    if (error?.code === 11000) {
      return Chat.findOne({ auction: auction._id });
    }

    throw error;
  }
};

module.exports = {
  ensureDealChatForAuction
};
