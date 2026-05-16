const {
  DEPOSIT_RETURN_DAYS,
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

const validateInteger = (errors, field, value, min, max) => {
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

const validateAuctionPayload = ({ payload, photos, user }) => {
  const errors = {};
  const pricing = payload.pricing || {};
  const schedule = payload.schedule || {};
  const item = payload.item || {};
  const inspection = payload.inspection || {};
  const vatApplies = ['legal_entity', 'entrepreneur'].includes(user.accountType);

  const priceWithoutVat = validateMoney(errors, 'pricing.priceWithoutVat', pricing.priceWithoutVat, { min: 0.01 });
  const priceWithVat = validateMoney(errors, 'pricing.priceWithVat', pricing.priceWithVat, { min: 0.01 });

  if (vatApplies && priceWithoutVat !== null && priceWithVat !== null) {
    const expected = Number((priceWithoutVat * (1 + VAT_RATE)).toFixed(2));
    if (Math.abs(expected - priceWithVat) > 0.05) {
      addError(errors, 'pricing.priceWithVat', 'Цена с НДС должна соответствовать цене без НДС и ставке 20%');
    }
  }

  if (!vatApplies && priceWithoutVat !== null && priceWithVat !== null && Math.abs(priceWithoutVat - priceWithVat) > 0.01) {
    addError(errors, 'pricing.priceWithVat', 'Для физического лица цена без НДС и итоговая цена должны совпадать');
  }

  const depositAmount = validateMoney(errors, 'pricing.depositAmount', pricing.depositAmount, { min: 0.01 });
  const minBidStep = validateMoney(errors, 'pricing.minBidStep', pricing.minBidStep, { min: 0.01 });

  if (priceWithVat && depositAmount) {
    const minDeposit = priceWithVat * 0.01;
    const maxDeposit = priceWithVat * 0.5;
    if (depositAmount < minDeposit || depositAmount > maxDeposit) {
      addError(errors, 'pricing.depositAmount', 'Сумма задатка должна быть от 1% до 50% от цены с НДС');
    }
  }

  if (priceWithVat && minBidStep) {
    const minStep = priceWithVat * 0.01;
    const maxStep = priceWithVat * 0.1;
    if (minBidStep < minStep || minBidStep > maxStep) {
      addError(errors, 'pricing.minBidStep', 'Минимальный шаг торгов должен быть от 1% до 10% от цены с НДС');
    }
  }

  const now = new Date();
  const applicationStartAt = toDate(schedule.applicationStartAt);
  const applicationEndAt = toDate(schedule.applicationEndAt);
  const biddingStartAt = toDate(schedule.biddingStartAt);
  const biddingEndAt = toDate(schedule.biddingEndAt);

  if (!applicationStartAt) {
    addError(errors, 'schedule.applicationStartAt');
  } else if (applicationStartAt < now || applicationStartAt > new Date(now.getTime() + 90 * dayMs)) {
    addError(errors, 'schedule.applicationStartAt', 'Начало приема заявок должно быть от текущего времени до 90 дней');
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

  if (!biddingStartAt) {
    addError(errors, 'schedule.biddingStartAt');
  }

  if (!biddingEndAt) {
    addError(errors, 'schedule.biddingEndAt');
  }

  if (applicationEndAt && biddingStartAt && biddingEndAt) {
    const expectedDateKey = nextDayKey(applicationEndAt);

    if (localDateKey(biddingStartAt) !== expectedDateKey || localDateKey(biddingEndAt) !== expectedDateKey) {
      addError(errors, 'schedule.biddingStartAt', 'Торги должны проходить на следующий день после конца приема заявок');
    }

    if (biddingStartAt.getHours() < 9) {
      addError(errors, 'schedule.biddingStartAt', 'Начало торгов должно быть не раньше 09:00');
    }

    if (biddingEndAt.getHours() > 19 || (biddingEndAt.getHours() === 19 && biddingEndAt.getMinutes() > 0)) {
      addError(errors, 'schedule.biddingEndAt', 'Конец торгов должен быть не позже 19:00');
    }

    if (biddingEndAt <= biddingStartAt || biddingEndAt.getTime() - biddingStartAt.getTime() < 5 * hourMs) {
      addError(errors, 'schedule.biddingEndAt', 'Минимальный срок торгов должен быть 5 часов');
    }
  }

  const paymentDeadlineDays = validateInteger(errors, 'schedule.paymentDeadlineDays', schedule.paymentDeadlineDays, 5, 90);
  const contractDeadlineDays = validateInteger(errors, 'schedule.contractDeadlineDays', schedule.contractDeadlineDays, 5, 90);

  if (!hasText(item.title)) {
    addError(errors, 'item.title');
  } else if (String(item.title).trim().length > 100) {
    addError(errors, 'item.title', 'Название лота должно быть до 100 знаков');
  }

  if (!auctionCategories.includes(item.category)) {
    addError(errors, 'item.category', 'Выберите категорию');
  }

  if (!hasText(item.locationAddress)) {
    addError(errors, 'item.locationAddress');
  }

  const latValue = item.geoLocation?.lat === '' || item.geoLocation?.lat === undefined ? null : Number(item.geoLocation.lat);
  const lngValue = item.geoLocation?.lng === '' || item.geoLocation?.lng === undefined ? null : Number(item.geoLocation.lng);

  if ((latValue !== null && !Number.isFinite(latValue)) || (lngValue !== null && !Number.isFinite(lngValue))) {
    addError(errors, 'item.geoLocation', 'Укажите корректные координаты');
  }

  if (photos.length < 1) {
    addError(errors, 'photos', 'Загрузите хотя бы 1 фотографию');
  }

  if (photos.length > 50) {
    addError(errors, 'photos', 'Можно загрузить не более 50 фотографий');
  }

  const mainPhotoIndex = toInteger(payload.mainPhotoIndex ?? 0);
  if (!Number.isFinite(mainPhotoIndex) || mainPhotoIndex < 0 || mainPhotoIndex >= Math.max(photos.length, 1)) {
    addError(errors, 'mainPhotoIndex', 'Выберите главную фотографию');
  }

  if (!hasText(inspection.contactName)) {
    addError(errors, 'inspection.contactName');
  }

  if (!hasText(inspection.contactPhone)) {
    addError(errors, 'inspection.contactPhone');
  }

  return {
    errors,
    normalized: {
      pricing: {
        priceWithoutVat,
        priceWithVat,
        vatApplies,
        vatRate: vatApplies ? VAT_RATE : 0,
        vatLabel: vatApplies ? 'НДС включен в цену' : 'Не облагается налогом на добавленную стоимость',
        depositAmount,
        minBidStep,
        organizationFeePercent: ORGANIZATION_FEE_PERCENT
      },
      schedule: {
        applicationStartAt,
        applicationEndAt,
        biddingStartAt,
        biddingEndAt,
        paymentDeadlineDays,
        depositReturnDays: DEPOSIT_RETURN_DAYS,
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
      mainPhotoIndex
    }
  };
};

module.exports = {
  validateAuctionPayload
};
