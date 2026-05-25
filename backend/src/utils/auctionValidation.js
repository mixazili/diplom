const {
  ORGANIZATION_FEE_PERCENT,
  VAT_RATE,
  auctionCategories
} = require('../constants/auctionConstants');

const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;
const moneyPattern = /^\d+(\.\d{1,2})?$/;
const requiredMessage = 'Поле обязательно для заполнения';

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = String(value).replace(',', '.').trim();
  return moneyPattern.test(normalized) ? Number(normalized) : Number.NaN;
};

const toInteger = (value) => {
  const number = Number(value);
  return Number.isInteger(number) ? number : Number.NaN;
};

const toDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const localDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const nextDayKey = (date) => {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return localDateKey(next);
};

const hasText = (value) => String(value || '').trim().length > 0;

const addError = (errors, field, message = requiredMessage) => {
  errors[field] = message;
};

const validateMoney = (errors, field, value, { required = true, min = 0 } = {}) => {
  const number = toNumber(value);

  if (number === null) {
    if (required) {
      addError(errors, field);
    }
    return null;
  }

  if (!Number.isFinite(number) || number < min) {
    addError(errors, field, `Введите число не меньше ${min}`);
    return null;
  }

  return Number(number.toFixed(2));
};

const validateInteger = (errors, field, value, min, max, { required = true } = {}) => {
  if ((value === null || value === undefined || value === '') && !required) {
    return null;
  }

  const number = toInteger(value);

  if (!Number.isFinite(number)) {
    addError(errors, field, 'Введите целое число');
    return null;
  }

  if (number < min || number > max) {
    addError(errors, field, `Значение должно быть от ${min} до ${max}`);
    return null;
  }

  return number;
};

const normalizeCharacteristics = (rows = [], errors) => {
  const normalized = [];

  rows.forEach((row, index) => {
    const name = String(row?.name || '').trim();
    const value = String(row?.value || '').trim();

    if (!name && !value) {
      return;
    }

    if (!name && value) {
      addError(errors, `item.characteristics.${index}.name`, 'Укажите название характеристики');
      return;
    }

    if (name && !value) {
      return;
    }

    normalized.push({ name, value });
  });

  return normalized;
};

const makeDateAtTime = (dateValue, timeValue, fallbackHour) => {
  const date = toDate(dateValue);
  if (!date) {
    return null;
  }

  const [hour = fallbackHour, minute = 0] = String(timeValue || `${fallbackHour}:00`).split(':').map(Number);
  const next = new Date(date);
  next.setHours(hour, minute || 0, 0, 0);
  return next;
};

const makeDateAtFixedTime = (dateValue, hour) => {
  const date = toDate(dateValue);
  if (!date) {
    return null;
  }

  const next = new Date(date);
  next.setHours(hour, 0, 0, 0);
  return next;
};

const validateAuctionPayload = ({ payload, photos, user }) => {
  const errors = {};
  const pricing = payload.pricing || {};
  const schedule = payload.schedule || {};
  const item = payload.item || {};
  const inspection = payload.inspection || {};
  const vatApplies = ['legal_entity', 'entrepreneur'].includes(user.accountType);
  const isDraft = Boolean(payload.isDraft);
  const auctionType = pricing.auctionType === 'decrease' ? 'decrease' : 'increase';

  const priceWithVat = validateMoney(errors, 'pricing.priceWithVat', pricing.priceWithVat, { min: 0.01 });
  const priceWithoutVat = priceWithVat === null ? null : Number((vatApplies ? priceWithVat / (1 + VAT_RATE) : priceWithVat).toFixed(2));
  const minPriceWithVat = auctionType === 'decrease'
    ? validateMoney(errors, 'pricing.minPriceWithVat', pricing.minPriceWithVat, { min: 0.01, required: !isDraft })
    : null;
  const depositAmount = validateMoney(errors, 'pricing.depositAmount', pricing.depositAmount, { min: 0.01, required: !isDraft });
  const minBidStep = auctionType === 'increase'
    ? validateMoney(errors, 'pricing.minBidStep', pricing.minBidStep, { min: 0.01, required: !isDraft })
    : null;
  const bidStepsCount = auctionType === 'decrease'
    ? validateInteger(errors, 'pricing.bidStepsCount', pricing.bidStepsCount, 5, 50, { required: !isDraft })
    : null;

  if (priceWithVat && depositAmount) {
    const minDeposit = priceWithVat * 0.01;
    const maxDeposit = priceWithVat * 0.5;
    if (depositAmount < minDeposit || depositAmount > maxDeposit) {
      addError(errors, 'pricing.depositAmount', 'Сумма задатка должна быть от 1% до 50% от цены с НДС');
    }
  }

  if (auctionType === 'increase' && priceWithVat && minBidStep) {
    const minStep = priceWithVat * 0.01;
    const maxStep = priceWithVat * 0.1;
    if (minBidStep < minStep || minBidStep > maxStep) {
      addError(errors, 'pricing.minBidStep', 'Минимальный шаг торгов должен быть от 1% до 10% от цены с НДС');
    }
  }

  if (auctionType === 'decrease' && priceWithVat && minPriceWithVat) {
    if (minPriceWithVat >= priceWithVat) {
      addError(errors, 'pricing.minPriceWithVat', 'Минимальная цена должна быть ниже начальной цены');
    }
  }

  const now = new Date();
  const applicationStartAt = makeDateAtFixedTime(schedule.applicationStartAt, 9);
  const applicationEndAt = makeDateAtFixedTime(schedule.applicationEndAt, 19);
  const biddingStartAt = makeDateAtTime(schedule.biddingDate, schedule.biddingStartTime, 9);
  const biddingEndAt = makeDateAtTime(schedule.biddingDate, schedule.biddingEndTime, 12);

  if (!applicationStartAt) {
    addError(errors, 'schedule.applicationStartAt');
  } else if (!isDraft && (applicationStartAt < now || applicationStartAt > new Date(now.getTime() + 90 * dayMs))) {
    addError(errors, 'schedule.applicationStartAt', 'Начало приема заявок должно быть от текущей даты до 90 дней');
  }

  if (!applicationEndAt) {
    addError(errors, 'schedule.applicationEndAt');
  } else if (
    applicationStartAt &&
    (applicationEndAt < new Date(applicationStartAt.getTime() + 3 * dayMs) ||
      applicationEndAt > new Date(applicationStartAt.getTime() + 90 * dayMs))
  ) {
    addError(errors, 'schedule.applicationEndAt', 'Конец приема заявок должен быть через 3-90 дней после начала приема');
  }

  if (!isDraft) {
    if (!biddingStartAt) {
      addError(errors, 'schedule.biddingStartAt');
    }

    if (!biddingEndAt) {
      addError(errors, 'schedule.biddingEndAt');
    }

    if (applicationEndAt && biddingStartAt && biddingEndAt) {
      const expectedDateKey = nextDayKey(applicationEndAt);

      if (localDateKey(biddingStartAt) !== expectedDateKey || localDateKey(biddingEndAt) !== expectedDateKey) {
        addError(errors, 'schedule.biddingDate', 'Торги должны проходить на следующий день после конца приема заявок');
      }

      if (biddingStartAt.getHours() < 9) {
        addError(errors, 'schedule.biddingStartTime', 'Начало торгов должно быть не раньше 09:00');
      }

      if (biddingEndAt.getHours() > 19 || (biddingEndAt.getHours() === 19 && biddingEndAt.getMinutes() > 0)) {
        addError(errors, 'schedule.biddingEndTime', 'Конец торгов должен быть не позже 19:00');
      }

      if (biddingEndAt <= biddingStartAt || biddingEndAt.getTime() - biddingStartAt.getTime() < 3 * hourMs) {
        addError(errors, 'schedule.biddingEndTime', 'Минимальный срок торгов должен быть 3 часа');
      }
    }
  }

  const paymentDeadlineDays = validateInteger(errors, 'schedule.paymentDeadlineDays', schedule.paymentDeadlineDays, 5, 90, { required: !isDraft }) ?? 10;
  const contractDeadlineDays = validateInteger(errors, 'schedule.contractDeadlineDays', schedule.contractDeadlineDays, 5, 90, { required: !isDraft }) ?? 10;

  if (!hasText(item.title)) {
    addError(errors, 'item.title');
  } else if (String(item.title).trim().length > 100) {
    addError(errors, 'item.title', 'Название лота должно быть до 100 знаков');
  }

  if (!auctionCategories.includes(item.category)) {
    addError(errors, 'item.category', 'Выберите категорию');
  }

  if (!isDraft && !hasText(item.locationAddress)) {
    addError(errors, 'item.locationAddress');
  }

  const latValue = item.geoLocation?.lat === '' || item.geoLocation?.lat === undefined ? null : Number(item.geoLocation.lat);
  const lngValue = item.geoLocation?.lng === '' || item.geoLocation?.lng === undefined ? null : Number(item.geoLocation.lng);

  if ((latValue !== null && !Number.isFinite(latValue)) || (lngValue !== null && !Number.isFinite(lngValue))) {
    addError(errors, 'item.geoLocation', 'Укажите корректные координаты');
  }

  if (!isDraft && photos.length < 1) {
    addError(errors, 'photos', 'Загрузите хотя бы 1 фотографию');
  }

  if (photos.length > 50) {
    addError(errors, 'photos', 'Можно загрузить не более 50 фотографий');
  }

  const mainPhotoIndex = toInteger(payload.mainPhotoIndex ?? 0);
  if (photos.length > 0 && (!Number.isFinite(mainPhotoIndex) || mainPhotoIndex < 0 || mainPhotoIndex >= photos.length)) {
    addError(errors, 'mainPhotoIndex', 'Выберите главную фотографию');
  }

  if (!isDraft && !hasText(inspection.contactName)) {
    addError(errors, 'inspection.contactName');
  }

  if (!isDraft && !hasText(inspection.contactPhone)) {
    addError(errors, 'inspection.contactPhone');
  }

  if (!hasText(inspection.contactEmail)) {
    addError(errors, 'inspection.contactEmail');
  }

  const calculatedBidStep =
    auctionType === 'decrease' && priceWithVat && minPriceWithVat && bidStepsCount
      ? Number(((priceWithVat - minPriceWithVat) / bidStepsCount).toFixed(2))
      : null;

  return {
    errors,
    normalized: {
      pricing: {
        auctionType,
        priceWithoutVat,
        priceWithVat,
        minPriceWithVat,
        vatApplies,
        vatRate: vatApplies ? VAT_RATE : 0,
        vatLabel: vatApplies ? 'НДС включен в цену' : 'Не облагается налогом на добавочную стоимость',
        depositAmount,
        minBidStep,
        bidStepsCount,
        calculatedBidStep,
        organizationFeePercent: ORGANIZATION_FEE_PERCENT
      },
      schedule: {
        applicationStartAt,
        applicationEndAt,
        biddingStartAt,
        biddingEndAt,
        paymentDeadlineDays,
        contractDeadlineDays
      },
      item: {
        title: String(item.title || '').trim(),
        category: item.category,
        characteristics: normalizeCharacteristics(item.characteristics || [], errors),
        description: String(item.description || '').trim(),
        locationAddress: String(item.locationAddress || '').trim(),
        geoLocation: {
          lat: latValue,
          lng: lngValue
        }
      },
      inspection: {
        contactName: String(inspection.contactName || '').trim(),
        contactPhone: String(inspection.contactPhone || '').trim(),
        contactEmail: String(inspection.contactEmail || '').trim()
      },
      mainPhotoIndex,
      isDraft
    }
  };
};

module.exports = {
  validateAuctionPayload
};
