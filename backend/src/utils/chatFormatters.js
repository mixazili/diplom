const { formatAuction } = require('./auctionFormatters');

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

const formatAttachment = (attachment) => ({
  originalName: attachment.originalName,
  mimeType: attachment.mimeType,
  size: attachment.size,
  path: attachment.path,
  url: `/uploads/chat/${attachment.path.split(/[\\/]/).pop()}`
});

const formatParticipantInfo = (info = {}) => ({
  user: info.user ? info.user.toString() : null,
  accountType: info.accountType || null,
  displayName: info.displayName || '',
  fullName: info.fullName || '',
  organizationName: info.organizationName || '',
  phone: info.phone || '',
  email: info.email || '',
  unp: info.unp || '',
  legalAddress: info.legalAddress || '',
  postalAddress: info.postalAddress || ''
});

const getMessageStatus = ({ message, currentUserId, chat }) => {
  if (!currentUserId || message.sender?.toString() !== currentUserId.toString()) {
    return 'viewed';
  }

  const counterpartId = chat.seller?.toString() === currentUserId.toString()
    ? chat.buyer?.toString()
    : chat.seller?.toString();
  const viewed = message.readBy?.some((receipt) => receipt.user?.toString() === counterpartId);

  return viewed ? 'viewed' : 'sent';
};

const formatChatMessage = (message, { currentUserId, chat }) => ({
  id: message._id.toString(),
  chat: message.chat.toString(),
  sender: message.sender ? message.sender.toString() : null,
  text: message.text || '',
  attachments: (message.attachments || []).map(formatAttachment),
  status: getMessageStatus({ message, currentUserId, chat }),
  readBy: (message.readBy || []).map((receipt) => ({
    user: receipt.user?.toString(),
    readAt: receipt.readAt
  })),
  createdAt: message.createdAt,
  updatedAt: message.updatedAt
});

const formatChat = async (chat, { currentUserId, unreadCount = 0, application = null, deposit = null } = {}) => {
  const isSeller = currentUserId && chat.seller?.toString() === currentUserId.toString();
  const counterpart = isSeller ? chat.buyerInfo : chat.sellerInfo;
  const auction = chat.auction ? formatAuction(chat.auction) : null;

  if (auction) {
    auction.viewerParticipation = formatViewerParticipation({
      application,
      deposit,
      auction: chat.auction
    });
  }

  return {
    id: chat._id.toString(),
    auction,
    seller: chat.seller ? chat.seller.toString() : null,
    buyer: chat.buyer ? chat.buyer.toString() : null,
    sellerInfo: formatParticipantInfo(chat.sellerInfo),
    buyerInfo: formatParticipantInfo(chat.buyerInfo),
    counterpart: formatParticipantInfo(counterpart),
    lastMessage: chat.lastMessage || null,
    lastMessageAt: chat.lastMessageAt || chat.updatedAt,
    unreadCount,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt
  };
};

module.exports = {
  formatAttachment,
  formatChat,
  formatChatMessage,
  formatParticipantInfo,
  formatViewerParticipation
};
