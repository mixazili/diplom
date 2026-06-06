const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { emitCounters, formatNotification, getUserCounters } = require('../services/notificationService');

const listMyNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 60);
  const sort = String(req.query.sort || 'newest') === 'oldest' ? 1 : -1;
  const skip = (page - 1) * limit;
  const query = { user: req.user._id };
  const [notifications, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: sort }).skip(skip).limit(limit),
    Notification.countDocuments(query)
  ]);

  res.json({
    notifications: notifications.map(formatNotification),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1)
    },
    counters: await getUserCounters(req.user._id)
  });
});

const getMyCounters = asyncHandler(async (req, res) => {
  res.json({ counters: await getUserCounters(req.user._id) });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });

  if (!notification) {
    res.status(404);
    return res.json({ message: 'Уведомление не найдено' });
  }

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }

  await emitCounters(req.user._id);

  res.json({
    notification: formatNotification(notification),
    counters: await getUserCounters(req.user._id)
  });
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, readAt: null },
    { $set: { readAt: new Date() } }
  );
  await emitCounters(req.user._id);

  res.json({ counters: await getUserCounters(req.user._id) });
});

const markPageNotificationsRead = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];

  if (ids.length > 0) {
    await Notification.updateMany(
      { _id: { $in: ids }, user: req.user._id, readAt: null },
      { $set: { readAt: new Date() } }
    );
  }

  await emitCounters(req.user._id);

  res.json({ counters: await getUserCounters(req.user._id) });
});

module.exports = {
  getMyCounters,
  listMyNotifications,
  markAllNotificationsRead,
  markPageNotificationsRead,
  markNotificationRead
};
