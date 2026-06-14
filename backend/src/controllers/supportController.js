const { operatorInfo } = require('../constants/auctionConstants');
const { sendSupportRequestEmail } = require('../services/emailService');
const asyncHandler = require('../utils/asyncHandler');

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const trimText = (value) => String(value || '').trim();

const submitSupportRequest = asyncHandler(async (req, res) => {
  const payload = {
    name: trimText(req.body.name),
    email: trimText(req.body.email).toLowerCase(),
    subject: trimText(req.body.subject),
    message: trimText(req.body.message)
  };
  const errors = {};

  if (payload.name.length < 2) {
    errors.name = 'Укажите имя';
  }

  if (!isEmail(payload.email)) {
    errors.email = 'Введите корректный email';
  }

  if (payload.subject.length < 4) {
    errors.subject = 'Укажите тему обращения';
  }

  if (payload.message.length < 20) {
    errors.message = 'Опишите вопрос подробнее';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Проверьте данные обращения', errors });
  }

  const emailInfo = await sendSupportRequestEmail({
    to: operatorInfo.email,
    ...payload
  });

  res.json({
    message: emailInfo.deliveryError
      ? 'Обращение принято. В режиме разработки письмо не было доставлено, проверьте консоль сервера'
      : 'Обращение отправлено в службу поддержки',
    developmentEmailPreviewUrl: emailInfo.previewUrl || null,
    emailDeliveryError: emailInfo.deliveryError || null
  });
});

module.exports = {
  submitSupportRequest
};
