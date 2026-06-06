const AuctionApplication = require('../models/AuctionApplication');
const Chat = require('../models/Chat');
const ChatMessage = require('../models/ChatMessage');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendNotificationEmail } = require('./emailService');
const { emitUserCounters, emitUserNotification } = require('./socketService');

const formatNotification = (notification) => ({
  id: notification._id.toString(),
  type: notification.type,
  title: notification.title,
  body: notification.body || '',
  importance: notification.importance,
  link: notification.link || '',
  entity: notification.entity || null,
  readAt: notification.readAt,
  emailedAt: notification.emailedAt,
  createdAt: notification.createdAt,
  updatedAt: notification.updatedAt
});

const getUnreadNotificationCount = (userId) =>
  Notification.countDocuments({ user: userId, readAt: null });

const getUnreadChatMessageCount = async (userId) => {
  const chats = await Chat.find({ participants: userId }).select('_id').lean();
  const chatIds = chats.map((chat) => chat._id);

  if (chatIds.length === 0) {
    return 0;
  }

  return ChatMessage.countDocuments({
    chat: { $in: chatIds },
    sender: { $ne: userId },
    'readBy.user': { $ne: userId }
  });
};

const getUserCounters = async (userId) => ({
  unreadNotifications: await getUnreadNotificationCount(userId),
  unreadChatMessages: await getUnreadChatMessageCount(userId)
});

const emitCounters = async (userId) => {
  emitUserCounters(userId, await getUserCounters(userId));
};

const createNotification = async ({
  user,
  type,
  title,
  body = '',
  importance = 'important',
  link = '',
  entity = null,
  email = false,
  emailSubject = ''
}) => {
  const userId = user?._id || user;

  if (!userId) {
    return null;
  }

  const notification = await Notification.create({
    user: userId,
    type,
    title,
    body,
    importance,
    link,
    entity
  });

  let formatted = formatNotification(notification);

  if (email) {
    const recipient = user?.email ? user : await User.findById(userId).select('email');

    if (recipient?.email) {
      const result = await sendNotificationEmail({
        email: recipient.email,
        subject: emailSubject || title,
        title,
        body
      });

      if (!result.deliveryError) {
        notification.emailedAt = new Date();
        await notification.save();
        formatted = formatNotification(notification);
      }
    }
  }

  emitUserNotification(userId, {
    notification: formatted,
    counters: await getUserCounters(userId)
  });

  return formatted;
};

const createManyNotifications = (items = []) =>
  Promise.all(items.filter(Boolean).map((item) => createNotification(item)));

const getAuctionLink = (auction) => `/auction/${auction._id || auction.id}`;

const notifyAuctionPublished = ({ auction, owner }) =>
  createNotification({
    user: owner || auction.owner,
    type: 'auction_published',
    title: 'Ваш аукцион опубликован',
    body: `Аукцион «${auction.item?.title || 'Предмет торгов'}» опубликован и доступен в каталоге.`,
    importance: 'important',
    link: getAuctionLink(auction),
    entity: { kind: 'auction', id: auction._id }
  });

const notifyAuctionReturned = ({ auction, owner, comment }) =>
  createNotification({
    user: owner || auction.owner,
    type: 'auction_returned',
    title: 'Аукцион отклонен',
    body: comment ? `Причина отклонения: ${comment}` : 'Аукцион возвращен на доработку.',
    importance: 'important',
    link: '/cabinet?section=auctions',
    entity: { kind: 'auction', id: auction._id }
  });

const notifyVerificationReviewed = ({ verification, user, action, comment }) =>
  createNotification({
    user: user || verification.user,
    type: action === 'approved' ? 'verification_approved' : 'verification_rejected',
    title: action === 'approved' ? 'Верификация одобрена' : 'Верификация отклонена',
    body: action === 'approved'
      ? 'Теперь можно создавать аукционы и участвовать в торгах.'
      : `Причина отклонения: ${comment || 'не указана'}`,
    importance: 'important',
    link: '/cabinet',
    entity: { kind: 'verification', id: verification._id }
  });

const notifyAuctionCancelled = async ({ auction, comment }) => {
  const applications = await AuctionApplication.find({ auction: auction._id }).select('participant').lean();
  const participantIds = [...new Set(applications.map((application) => application.participant?.toString()).filter(Boolean))];

  return createManyNotifications([
    {
      user: auction.owner,
      type: 'auction_cancelled',
      title: 'Аукцион отменен',
      body: comment || 'Аукцион отменен модератором.',
      importance: 'critical',
      link: getAuctionLink(auction),
      entity: { kind: 'auction', id: auction._id },
      email: true,
      emailSubject: 'Auction.by: аукцион отменен'
    },
    ...participantIds.map((participantId) => ({
      user: participantId,
      type: 'auction_cancelled',
      title: 'Аукцион отменен',
      body: `Аукцион «${auction.item?.title || 'Предмет торгов'}» отменен. Задаток будет возвращен.`,
      importance: 'critical',
      link: getAuctionLink(auction),
      entity: { kind: 'auction', id: auction._id },
      email: true,
      emailSubject: 'Auction.by: аукцион отменен'
    }))
  ]);
};

const notifyAuctionFinished = async ({ auction, latestBid = null }) => {
  const applications = await AuctionApplication.find({
    auction: auction._id,
    status: 'approved',
    participantNumber: { $ne: null }
  }).select('participant participantNumber').lean();
  const winnerId = auction.winner?._id || auction.winner || latestBid?.bidder;
  const winnerNumber = auction.winnerParticipantNumber || latestBid?.participantNumber;

  if (auction.status === 'finished_failed') {
    return createManyNotifications([
      {
        user: auction.owner,
        type: 'auction_failed',
        title: 'Торги не состоялись',
        body: auction.resultReason || 'Торги завершились без определения победителя.',
        importance: 'important',
        link: getAuctionLink(auction),
        entity: { kind: 'auction', id: auction._id }
      },
      ...applications.map((application) => ({
        user: application.participant,
        type: 'auction_failed',
        title: 'Торги не состоялись',
        body: auction.resultReason || 'Торги завершились без определения победителя.',
        importance: 'important',
        link: getAuctionLink(auction),
        entity: { kind: 'auction', id: auction._id }
      }))
    ]);
  }

  return createManyNotifications([
    {
      user: auction.owner,
      type: 'auction_sold',
      title: 'Аукцион завершен успешно',
      body: `Победитель торгов определен. Финальная цена: ${Number(auction.winningBidAmount || latestBid?.amount || 0).toFixed(2)} BYN.`,
      importance: 'critical',
      link: getAuctionLink(auction),
      entity: { kind: 'auction', id: auction._id },
      email: true,
      emailSubject: 'Auction.by: аукцион завершен успешно'
    },
    {
      user: winnerId,
      type: 'auction_won',
      title: 'Вы победили в торгах',
      body: `Ваш номер участника: ${winnerNumber}. Перейдите к оплате лота.`,
      importance: 'critical',
      link: getAuctionLink(auction),
      entity: { kind: 'auction', id: auction._id },
      email: true,
      emailSubject: 'Auction.by: вы победили в торгах'
    },
    ...applications
      .filter((application) => String(application.participant) !== String(winnerId))
      .map((application) => ({
        user: application.participant,
        type: 'auction_lost',
        title: 'Торги завершены',
        body: `Вы участвовали под номером ${application.participantNumber}. Победил другой участник.`,
        importance: 'important',
        link: getAuctionLink(auction),
        entity: { kind: 'auction', id: auction._id }
      }))
  ]);
};

module.exports = {
  createManyNotifications,
  createNotification,
  emitCounters,
  formatNotification,
  getUserCounters,
  notifyAuctionCancelled,
  notifyAuctionFinished,
  notifyAuctionPublished,
  notifyAuctionReturned,
  notifyVerificationReviewed
};
