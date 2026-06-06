const fs = require('fs');
const Auction = require('../models/Auction');
const AuctionApplication = require('../models/AuctionApplication');
const Chat = require('../models/Chat');
const ChatMessage = require('../models/ChatMessage');
const Deposit = require('../models/Deposit');
const asyncHandler = require('../utils/asyncHandler');
const { ensureDealChatForAuction } = require('../services/chatService');
const { formatChat, formatChatMessage } = require('../utils/chatFormatters');
const { emitChatMessage, emitChatRead } = require('../services/socketService');

const removeUploadedFiles = (files = []) => {
  files.forEach((file) => {
    fs.unlink(file.path, () => {});
  });
};

const populateChat = (query) => query.populate('auction');

const ensureChatAccess = async (chatId, userId) => {
  const chat = await populateChat(Chat.findOne({ _id: chatId, participants: userId }));
  return chat;
};

const mapAttachments = (files = []) =>
  files.map((file) => ({
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path
  }));

const countUnread = (chatId, userId) =>
  ChatMessage.countDocuments({
    chat: chatId,
    sender: { $ne: userId },
    'readBy.user': { $ne: userId }
  });

const getParticipationContext = async (chats, userId) => {
  const auctionIds = chats.map((chat) => chat.auction?._id || chat.auction).filter(Boolean);

  if (!userId || auctionIds.length === 0) {
    return {
      applicationByAuction: new Map(),
      depositByAuction: new Map()
    };
  }

  const [applications, deposits] = await Promise.all([
    AuctionApplication.find({ auction: { $in: auctionIds }, participant: userId }),
    Deposit.find({ auction: { $in: auctionIds }, payer: userId })
  ]);

  return {
    applicationByAuction: new Map(applications.map((application) => [application.auction.toString(), application])),
    depositByAuction: new Map(deposits.map((deposit) => [deposit.auction.toString(), deposit]))
  };
};

const markMessagesRead = async (chat, userId) => {
  const unreadMessages = await ChatMessage.find({
    chat: chat._id,
    sender: { $ne: userId },
    'readBy.user': { $ne: userId }
  }).select('_id');

  if (unreadMessages.length === 0) {
    return [];
  }

  await ChatMessage.updateMany(
    { _id: { $in: unreadMessages.map((message) => message._id) } },
    { $push: { readBy: { user: userId, readAt: new Date() } } }
  );

  const messageIds = unreadMessages.map((message) => message._id.toString());
  emitChatRead(chat._id, {
    chatId: chat._id.toString(),
    readerId: userId.toString(),
    messageIds
  });

  return messageIds;
};

const listMyChats = asyncHandler(async (req, res) => {
  const finishedAuctions = await Auction.find({
    status: 'finished_success',
    $or: [{ owner: req.user._id }, { winner: req.user._id }]
  });

  await Promise.all(finishedAuctions.map((auction) => ensureDealChatForAuction(auction)));

  const chats = await populateChat(
    Chat.find({ participants: req.user._id }).sort({ lastMessageAt: -1, updatedAt: -1 })
  );
  const { applicationByAuction, depositByAuction } = await getParticipationContext(chats, req.user._id);

  const formatted = await Promise.all(
    chats.map(async (chat) => {
      const auctionId = (chat.auction?._id || chat.auction)?.toString();

      return formatChat(chat, {
        currentUserId: req.user._id,
        unreadCount: await countUnread(chat._id, req.user._id),
        application: applicationByAuction.get(auctionId),
        deposit: depositByAuction.get(auctionId)
      });
    })
  );

  res.json({ chats: formatted });
});

const getChatMessages = asyncHandler(async (req, res) => {
  const chat = await ensureChatAccess(req.params.id, req.user._id);

  if (!chat) {
    res.status(404);
    return res.json({ message: 'Чат не найден' });
  }

  await markMessagesRead(chat, req.user._id);

  const messages = await ChatMessage.find({ chat: chat._id }).sort({ createdAt: 1 });
  const { applicationByAuction, depositByAuction } = await getParticipationContext([chat], req.user._id);
  const auctionId = (chat.auction?._id || chat.auction)?.toString();

  res.json({
    chat: await formatChat(chat, {
      currentUserId: req.user._id,
      unreadCount: 0,
      application: applicationByAuction.get(auctionId),
      deposit: depositByAuction.get(auctionId)
    }),
    messages: messages.map((message) => formatChatMessage(message, { currentUserId: req.user._id, chat }))
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  const chat = await ensureChatAccess(req.params.id, req.user._id);

  if (!chat) {
    removeUploadedFiles(req.files);
    res.status(404);
    return res.json({ message: 'Чат не найден' });
  }

  const text = String(req.body.text || '').trim();
  const attachments = mapAttachments(req.files || []);

  if (!text && attachments.length === 0) {
    res.status(400);
    return res.json({ message: 'Введите сообщение или прикрепите файл' });
  }

  const message = await ChatMessage.create({
    chat: chat._id,
    sender: req.user._id,
    text,
    attachments,
    readBy: [{ user: req.user._id, readAt: new Date() }]
  });

  chat.lastMessage = {
    text,
    sender: req.user._id,
    attachmentsCount: attachments.length,
    createdAt: message.createdAt
  };
  chat.lastMessageAt = message.createdAt;
  await chat.save();

  const formattedMessage = formatChatMessage(message, { currentUserId: req.user._id, chat });
  const { applicationByAuction, depositByAuction } = await getParticipationContext([chat], req.user._id);
  const auctionId = (chat.auction?._id || chat.auction)?.toString();
  const payload = {
    chatId: chat._id.toString(),
    message: formattedMessage
  };

  emitChatMessage(chat._id, payload);

  res.status(201).json({
    chat: await formatChat(chat, {
      currentUserId: req.user._id,
      unreadCount: 0,
      application: applicationByAuction.get(auctionId),
      deposit: depositByAuction.get(auctionId)
    }),
    message: formattedMessage
  });
});

const markChatRead = asyncHandler(async (req, res) => {
  const chat = await ensureChatAccess(req.params.id, req.user._id);

  if (!chat) {
    res.status(404);
    return res.json({ message: 'Чат не найден' });
  }

  const messageIds = await markMessagesRead(chat, req.user._id);

  res.json({ messageIds });
});

module.exports = {
  getChatMessages,
  listMyChats,
  markChatRead,
  sendMessage
};
