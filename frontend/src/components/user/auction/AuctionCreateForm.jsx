import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Star, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  ORGANIZATION_FEE_PERCENT,
  VAT_RATE,
  auctionCategoryLabels,
  buyerTerms,
  characteristicTemplates,
  operatorInfo
} from '../../../constants/auctionConstants.js';
import { submitAuction, updateAuction } from '../../../features/auction/auctionSlice.js';
import { formatPhoneDisplay, phoneDigits } from '../../../utils/inputFormatters.js';
import CollapsibleSection from '../../auction/CollapsibleSection.jsx';
import CustomSelect from '../../ui/CustomSelect.jsx';
import YandexMapPicker from './YandexMapPicker.jsx';
import styles from './AuctionCreateForm.module.css';

const moneyPattern = /^\d+([,.]\d{1,2})?$/;
const pad = (value) => String(value).padStart(2, '0');
const dayMs = 24 * 60 * 60 * 1000;

const toDateInput = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const addDays = (value, days) => {
  const date = value ? new Date(value) : new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return 'Дата не выбрана';
  }

  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

const toMoneyNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).replace(',', '.').trim();
  return moneyPattern.test(normalized) ? Number(normalized) : Number.NaN;
};

const formatMoney = (value) =>
  new Intl.NumberFormat('ru-BY', { style: 'currency', currency: 'BYN' }).format(Number(value || 0));

const minutesToTime = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const timeToMinutes = (value, fallback) => {
  const [hours, minutes] = String(value || fallback).split(':').map(Number);
  return (Number.isFinite(hours) ? hours : 9) * 60 + (Number.isFinite(minutes) ? minutes : 0);
};
const normalizeTimeToStep = (value, fallback, min = 540, max = 1140) => {
  const raw = timeToMinutes(value, fallback);
  const rounded = Math.round(raw / 30) * 30;
  return minutesToTime(Math.min(Math.max(rounded, min), max));
};

const makePhotoId = (file) => {
  const randomPart = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Math.random()).slice(2);
  return `${file.name}-${file.size}-${file.lastModified}-${randomPart}`;
};

const joinName = (...parts) => parts.filter(Boolean).join(' ').trim();
const rowsForCategory = (category) =>
  (characteristicTemplates[category] || characteristicTemplates.passenger_cars).map((name) => ({ name, value: '' }));

const toExistingPhotoState = (auction) =>
  (auction?.photos || []).map((photo) => ({
    id: photo.path,
    path: photo.path,
    url: photo.url,
    previewUrl: photo.url,
    originalName: photo.originalName,
    size: photo.size,
    existing: true
  }));

const getSellerInfo = (user, verification) => {
  const personalData = verification?.personalData || {};
  const organizationData = verification?.organizationData || {};
  const addressData = verification?.addressData || {};
  const fullName =
    personalData.fullName ||
    joinName(personalData.lastName, personalData.firstName, personalData.middleName);
  const notificationEmail = personalData.notificationEmail || '';

  if (user.accountType === 'legal_entity') {
    return {
      typeLabel: 'Юридическое лицо',
      fields: [
        ['Краткое наименование', organizationData.shortName],
        [verification?.isResident ? 'УНП' : 'ИНН/БИН', organizationData.unp || organizationData.taxId],
        ['Юридический адрес', addressData.legalAddress]
      ],
      defaultInspection: { contactName: '', contactPhone: '', contactEmail: notificationEmail }
    };
  }

  if (user.accountType === 'entrepreneur') {
    return {
      typeLabel: 'Индивидуальный предприниматель',
      fields: [
        ['ФИО', fullName],
        [verification?.isResident ? 'УНП' : 'ИНН/БИН', organizationData.unp || organizationData.taxId],
        ['Телефон', personalData.phone]
      ],
      defaultInspection: {
        contactName: fullName,
        contactPhone: personalData.phone || '',
        contactEmail: notificationEmail
      }
    };
  }

  return {
    typeLabel: 'Физическое лицо',
    fields: [
      ['ФИО', fullName],
      ['Телефон', personalData.phone],
      ['Дополнительный телефон', personalData.additionalPhone]
    ],
    defaultInspection: {
      contactName: fullName,
      contactPhone: personalData.phone || '',
      contactEmail: notificationEmail
    }
  };
};

const createInitialForm = (user, verification, initialAuction) => {
  const sellerInfo = getSellerInfo(user, verification);

  if (initialAuction) {
    return {
      pricing: {
        auctionType: initialAuction.pricing?.auctionType || 'increase',
        priceWithVat: String(initialAuction.pricing?.priceWithVat ?? ''),
        minPriceWithVat: String(initialAuction.pricing?.minPriceWithVat ?? ''),
        depositAmount: String(initialAuction.pricing?.depositAmount ?? ''),
        minBidStep: String(initialAuction.pricing?.minBidStep ?? ''),
        bidStepsCount: String(initialAuction.pricing?.bidStepsCount ?? 10)
      },
      schedule: {
        applicationStartAt: toDateInput(initialAuction.schedule?.applicationStartAt),
        applicationEndAt: toDateInput(initialAuction.schedule?.applicationEndAt),
        biddingStartTime: initialAuction.schedule?.biddingStartAt
          ? minutesToTime(timeToMinutes(new Date(initialAuction.schedule.biddingStartAt).toTimeString().slice(0, 5), '09:00'))
          : '09:00',
        biddingEndTime: initialAuction.schedule?.biddingEndAt
          ? minutesToTime(timeToMinutes(new Date(initialAuction.schedule.biddingEndAt).toTimeString().slice(0, 5), '12:00'))
          : '12:00',
        paymentDeadlineDays: String(initialAuction.schedule?.paymentDeadlineDays ?? 10),
        contractDeadlineDays: String(initialAuction.schedule?.contractDeadlineDays ?? 10)
      },
      item: {
        title: initialAuction.item?.title || '',
        category: initialAuction.item?.category || 'passenger_cars',
        characteristics:
          initialAuction.item?.characteristics?.length > 0
            ? initialAuction.item.characteristics.map((row) => ({ name: row.name || '', value: row.value || '' }))
            : rowsForCategory(initialAuction.item?.category || 'passenger_cars'),
        description: initialAuction.item?.description || '',
        locationAddress: initialAuction.item?.locationAddress || '',
        geoLocation: {
          lat: initialAuction.item?.geoLocation?.lat ?? '',
          lng: initialAuction.item?.geoLocation?.lng ?? ''
        }
      },
      inspection: {
        contactName: initialAuction.inspection?.contactName || sellerInfo.defaultInspection.contactName,
        contactPhone: initialAuction.inspection?.contactPhone || sellerInfo.defaultInspection.contactPhone,
        contactEmail: initialAuction.inspection?.contactEmail || sellerInfo.defaultInspection.contactEmail
      }
    };
  }

  const start = addDays(new Date(), 1);
  const end = addDays(start, 7);

  return {
    pricing: {
      auctionType: 'increase',
      priceWithVat: '',
      minPriceWithVat: '',
      depositAmount: '',
      minBidStep: '',
      bidStepsCount: '10'
    },
    schedule: {
      applicationStartAt: toDateInput(start),
      applicationEndAt: toDateInput(end),
      biddingStartTime: '09:00',
      biddingEndTime: '12:00',
      paymentDeadlineDays: '10',
      contractDeadlineDays: '10'
    },
    item: {
      title: '',
      category: 'passenger_cars',
      characteristics: rowsForCategory('passenger_cars'),
      description: '',
      locationAddress: '',
      geoLocation: { lat: '', lng: '' }
    },
    inspection: sellerInfo.defaultInspection
  };
};

function Field({ label, value, onChange, error, required = false, type = 'text', as = 'input', disabled = false, hint = '', placeholder = '', className = '', min, max, step }) {
  const Control = as;
  const isPhone = type === 'tel' || /телефон/i.test(label);
  const displayValue = isPhone && !disabled ? formatPhoneDisplay(value) : value;

  return (
    <label className={`${styles.field} ${className}`}>
      <span className={styles.field__label}>
        {label}{required && <span className={styles.requiredMark}>*</span>}
      </span>
      <Control
        className={`${styles.field__control} ${error ? styles['field__control--error'] : ''} ${disabled ? styles['field__control--readonly'] : ''}`}
        type={as === 'input' ? type : undefined}
        value={displayValue}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        inputMode={isPhone ? 'tel' : undefined}
        onChange={(event) => onChange(isPhone ? phoneDigits(event.target.value) : event.target.value)}
      />
      {hint && <span className={styles.field__hint}>{hint}</span>}
      {error && <span className={styles.field__error}>{error}</span>}
    </label>
  );
}

function PriceBreakdown({ label, amount, vatApplies }) {
  const price = toMoneyNumber(amount);

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  const fee = price * (ORGANIZATION_FEE_PERCENT / 100);
  const vat = vatApplies ? price * VAT_RATE : 0;
  const clean = price - fee - vat;

  return (
    <div className={styles.priceBreakdown}>
      <strong>{label}</strong>
      <span>Комиссия площадки {ORGANIZATION_FEE_PERCENT}%: {formatMoney(fee)}</span>
      {vatApplies ? <span>НДС 20%: {formatMoney(vat)}</span> : <span>НДС не применяется</span>}
      <span>К получению: {formatMoney(clean)} ({vatApplies ? '79%' : '99%'} от цены)</span>
    </div>
  );
}

function ReadOnlyGrid({ items }) {
  return (
    <div className={styles.readonlyGrid}>
      {items.filter(([, value]) => value).map(([label, value]) => (
        <div className={styles.readonlyItem} key={label}>
          <span>{label}</span>
          <strong>{/телефон/i.test(label) ? formatPhoneDisplay(value) : value}</strong>
        </div>
      ))}
    </div>
  );
}

function TimeRangePicker({ startValue, endValue, onStartChange, onEndChange, error, min = 540, max = 1140 }) {
  const startMinutes = timeToMinutes(startValue, '09:00');
  const endMinutes = timeToMinutes(endValue, '12:00');
  const durationMinutes = endMinutes - startMinutes;
  const minGap = 180;
  const rangeSize = max - min;
  const fillLeft = Math.max(0, Math.min(100, ((startMinutes - min) / rangeSize) * 100));
  const fillRight = 100 - Math.max(0, Math.min(100, ((endMinutes - min) / rangeSize) * 100));
  const updateStart = (minutes) => onStartChange(minutesToTime(Math.min(Math.max(minutes, min), endMinutes - minGap)));
  const updateEnd = (minutes) => onEndChange(minutesToTime(Math.max(Math.min(minutes, max), startMinutes + minGap)));

  return (
    <div className={`${styles.field} ${styles.fieldFull}`}>
      <span className={styles.field__label}>Время торгов<span className={styles.requiredMark}>*</span></span>
      <div className={styles.timeRange}>
        <label>
          <span>Начало</span>
          <input
            className={styles.field__control}
            type="time"
            min="09:00"
            max="16:00"
            step="1800"
            value={startValue}
            onChange={(event) => updateStart(timeToMinutes(normalizeTimeToStep(event.target.value, startValue, min, max - minGap), startValue))}
          />
        </label>
        <label>
          <span>Конец</span>
          <input
            className={styles.field__control}
            type="time"
            min="12:00"
            max="19:00"
            step="1800"
            value={endValue}
            onChange={(event) => updateEnd(timeToMinutes(normalizeTimeToStep(event.target.value, endValue, min + minGap, max), endValue))}
          />
        </label>
      </div>
      <div className={styles.timeRangeSliders}>
        <div className={styles.rangeTrack}>
          <span className={styles.rangeTrack__fill} style={{ left: `${fillLeft}%`, right: `${fillRight}%` }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step="30"
          value={startMinutes}
          onChange={(event) => updateStart(Number(event.target.value))}
        />
        <input
          type="range"
          min={min}
          max={max}
          step="30"
          value={endMinutes}
          onChange={(event) => updateEnd(Number(event.target.value))}
        />
      </div>
      <div className={styles.timeMarks}>
        <span>09:00</span>
        <span>12:00</span>
        <span>15:00</span>
        <span>19:00</span>
      </div>
      <span className={durationMinutes >= 180 ? styles.field__hint : styles.field__error}>
        Продолжительность: {Math.max(durationMinutes, 0) / 60} ч. Минимум 3 часа.
      </span>
      {error && <span className={styles.field__error}>{error}</span>}
    </div>
  );
}

function PhotoUploader({ photos, mainPhotoIndex, onAdd, onMainChange, onRemove, error }) {
  const inputRef = useRef(null);

  return (
    <div className={styles.photoUploader}>
      <div className={styles.photoUploader__header}>
        <div>
          <span className={styles.field__label}>Фотографии</span>
          <p>Можно добавить один файл или сразу несколько.</p>
        </div>
        <button className={styles.buttonSecondary} type="button" onClick={() => inputRef.current?.click()}>
          Добавить фото
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => {
            onAdd(event.target.files);
            event.target.value = '';
          }}
        />
      </div>
      <div className={styles.photoUploader__drop}>
        <strong>{photos.length ? `Выбрано фото: ${photos.length} из 50` : 'Фото пока не выбраны'}</strong>
        <span>Главная фотография будет использоваться в каталоге и карточке аукциона.</span>
      </div>
      {error && <span className={styles.field__error}>{error}</span>}
      {photos.length > 0 && (
        <div className={styles.photoGrid}>
          {photos.map((photo, index) => {
            return (
              <article className={`${styles.photoCard} ${mainPhotoIndex === index ? styles['photoCard--main'] : ''}`} key={photo.id}>
                <img src={photo.previewUrl || photo.url} alt="Фото предмета торгов" />
                <button
                  className={styles.photoCard__mainButton}
                  type="button"
                  onClick={() => onMainChange(index)}
                  aria-label={mainPhotoIndex === index ? 'Главная фотография' : 'Сделать главной'}
                  title={mainPhotoIndex === index ? 'Главная фотография' : 'Сделать главной'}
                >
                  <Star size={26} fill={mainPhotoIndex === index ? 'currentColor' : 'none'} />
                </button>
                <button className={styles.photoCard__removeButton} type="button" onClick={() => onRemove(index)} aria-label="Удалить фото" title="Удалить фото">
                  <X size={18} />
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AuctionCreateForm({ verification, initialAuction = null, onSaved, onCancel }) {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((state) => state.auth);
  const auction = useSelector((state) => state.auction);
  const [form, setForm] = useState(() => createInitialForm(user, verification, initialAuction));
  const [photos, setPhotos] = useState(() => toExistingPhotoState(initialAuction));
  const [mainPhotoIndex, setMainPhotoIndex] = useState(() => {
    const index = (initialAuction?.photos || []).findIndex((photo) => photo.isMain);
    return index >= 0 ? index : 0;
  });
  const [localErrors, setLocalErrors] = useState({});
  const errors = { ...localErrors, ...(auction.errors || {}) };
  const isEditing = Boolean(initialAuction);
  const vatApplies = ['legal_entity', 'entrepreneur'].includes(user.accountType);
  const sellerInfo = useMemo(() => getSellerInfo(user, verification), [user, verification]);
  const biddingDate = toDateInput(addDays(form.schedule.applicationEndAt, 1));
  const priceWithVat = toMoneyNumber(form.pricing.priceWithVat);
  const minPriceWithVat = toMoneyNumber(form.pricing.minPriceWithVat);
  const recommendedDeposit = Number.isFinite(priceWithVat) && priceWithVat > 0 ? (priceWithVat * 0.1).toFixed(2) : '0.00';
  const calculatedDecreaseStep =
    form.pricing.auctionType === 'decrease' &&
    Number.isFinite(priceWithVat) &&
    Number.isFinite(minPriceWithVat) &&
    Number(form.pricing.bidStepsCount) > 0
      ? (Math.max(priceWithVat - minPriceWithVat, 0) / Number(form.pricing.bidStepsCount)).toFixed(2)
      : '0.00';

  useEffect(() => {
    setForm(createInitialForm(user, verification, initialAuction));
    setPhotos((current) => {
      current.forEach((photo) => {
        if (photo.file && photo.previewUrl) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      });
      return toExistingPhotoState(initialAuction);
    });
    const index = (initialAuction?.photos || []).findIndex((photo) => photo.isMain);
    setMainPhotoIndex(index >= 0 ? index : 0);
    setLocalErrors({});
  }, [user, verification, initialAuction]);

  useEffect(
    () => () => {
      photos.forEach((photo) => {
        if (photo.file && photo.previewUrl) {
          URL.revokeObjectURL(photo.previewUrl);
        }
      });
    },
    [photos]
  );

  const updateSection = (section, field, value) => {
    setForm((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value }
    }));
  };

  const updateGeoLocation = ({ lat, lng }) => {
    setForm((current) => ({
      ...current,
      item: { ...current.item, geoLocation: { lat, lng } }
    }));
  };

  const changeCategory = (category) => {
    setForm((current) => ({
      ...current,
      item: { ...current.item, category, characteristics: rowsForCategory(category) }
    }));
  };

  const updateCharacteristic = (index, field, value) => {
    setForm((current) => ({
      ...current,
      item: {
        ...current.item,
        characteristics: current.item.characteristics.map((row, rowIndex) =>
          rowIndex === index ? { ...row, [field]: value } : row
        )
      }
    }));
  };

  const addCharacteristic = () => {
    setForm((current) => ({
      ...current,
      item: { ...current.item, characteristics: [...current.item.characteristics, { name: '', value: '' }] }
    }));
  };

  const removeCharacteristic = (index) => {
    setForm((current) => ({
      ...current,
      item: { ...current.item, characteristics: current.item.characteristics.filter((_, rowIndex) => rowIndex !== index) }
    }));
  };

  const addPhotos = (fileList) => {
    const imageFiles = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
    const availableSlots = 50 - photos.length;

    if (imageFiles.length === 0) {
      return;
    }

    if (availableSlots <= 0) {
      setLocalErrors((current) => ({ ...current, photos: 'Можно загрузить не более 50 фотографий' }));
      return;
    }

    const nextPhotos = imageFiles.slice(0, availableSlots).map((file) => ({
      id: makePhotoId(file),
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    setPhotos((current) => [...current, ...nextPhotos]);
    setLocalErrors((current) => ({
      ...current,
      photos: imageFiles.length > availableSlots ? 'Часть файлов не добавлена: максимум 50 фотографий' : ''
    }));
  };

  const removePhoto = (index) => {
    setPhotos((current) => {
      const removed = current[index];
      if (removed?.file && removed.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return current.filter((_, photoIndex) => photoIndex !== index);
    });
    setMainPhotoIndex((current) => (index === current ? 0 : index < current ? current - 1 : current));
  };

  const validateClient = (isDraft) => {
    const nextErrors = {};
    const requireText = (field, value) => {
      if (!String(value || '').trim()) {
        nextErrors[field] = 'Поле обязательно для заполнения';
      }
    };
    const requireMoney = (field, value) => {
      const number = toMoneyNumber(value);
      if (number === null) {
        nextErrors[field] = 'Поле обязательно для заполнения';
      } else if (!Number.isFinite(number) || number <= 0) {
        nextErrors[field] = 'Введите сумму больше 0';
      }
      return number;
    };

    const price = requireMoney('pricing.priceWithVat', form.pricing.priceWithVat);
    requireText('schedule.applicationStartAt', form.schedule.applicationStartAt);
    requireText('schedule.applicationEndAt', form.schedule.applicationEndAt);
    requireText('item.title', form.item.title);
    requireText('inspection.contactEmail', form.inspection.contactEmail);

    if (form.item.title.length > 100) {
      nextErrors['item.title'] = 'Название должно быть не длиннее 100 знаков';
    }

    if (!isDraft) {
      const deposit = requireMoney('pricing.depositAmount', form.pricing.depositAmount);

      if (Number.isFinite(price) && Number.isFinite(deposit) && (deposit < price * 0.01 || deposit > price * 0.5)) {
        nextErrors['pricing.depositAmount'] = 'Задаток должен быть от 1% до 50% цены';
      }

      if (form.pricing.auctionType === 'increase') {
        const step = requireMoney('pricing.minBidStep', form.pricing.minBidStep);
        if (Number.isFinite(price) && Number.isFinite(step) && (step < price * 0.01 || step > price * 0.1)) {
          nextErrors['pricing.minBidStep'] = 'Шаг торгов должен быть от 1% до 10% цены';
        }
      } else {
        const minPrice = requireMoney('pricing.minPriceWithVat', form.pricing.minPriceWithVat);
        const steps = Number(form.pricing.bidStepsCount);
        if (!Number.isInteger(steps) || steps < 5 || steps > 50) {
          nextErrors['pricing.bidStepsCount'] = 'Количество шагов должно быть от 5 до 50';
        }
        if (Number.isFinite(price) && Number.isFinite(minPrice) && minPrice >= price) {
          nextErrors['pricing.minPriceWithVat'] = 'Минимальная цена должна быть ниже начальной';
        }
      }

      const startMinutes = timeToMinutes(form.schedule.biddingStartTime, '09:00');
      const endMinutes = timeToMinutes(form.schedule.biddingEndTime, '12:00');
      if (endMinutes - startMinutes < 180) {
        nextErrors['schedule.biddingEndTime'] = 'Минимальный срок торгов должен быть 3 часа';
      }

      ['paymentDeadlineDays', 'contractDeadlineDays'].forEach((field) => {
        const value = Number(form.schedule[field]);
        if (!Number.isInteger(value) || value < 5 || value > 90) {
          nextErrors[`schedule.${field}`] = 'Срок должен быть от 5 до 90 дней';
        }
      });

      requireText('item.locationAddress', form.item.locationAddress);
      requireText('inspection.contactName', form.inspection.contactName);
      requireText('inspection.contactPhone', form.inspection.contactPhone);

      if (!form.item.geoLocation.lat || !form.item.geoLocation.lng) {
        nextErrors['item.geoLocation'] = 'Укажите место нахождения предмета торгов на карте';
      }

      if (photos.length < 1) {
        nextErrors.photos = 'Загрузите хотя бы одну фотографию';
      }
    }

    setLocalErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = (isDraft) => ({
    isDraft,
    pricing: form.pricing,
    schedule: {
      applicationStartAt: form.schedule.applicationStartAt,
      applicationEndAt: form.schedule.applicationEndAt,
      biddingDate,
      biddingStartTime: form.schedule.biddingStartTime,
      biddingEndTime: form.schedule.biddingEndTime,
      paymentDeadlineDays: form.schedule.paymentDeadlineDays,
      contractDeadlineDays: form.schedule.contractDeadlineDays
    },
    item: {
      ...form.item,
      characteristics: form.item.characteristics.filter((row) => row.name.trim() && row.value.trim())
    },
    inspection: form.inspection,
    mainPhotoIndex,
    existingPhotoPaths: photos.filter((photo) => photo.path && !photo.file).map((photo) => photo.path)
  });

  const save = async (isDraft) => {
    if (!validateClient(isDraft)) {
      return;
    }

    const payload = buildPayload(isDraft);
    const action = isEditing
      ? updateAuction({ id: initialAuction.id, payload, photos, token: accessToken })
      : submitAuction({ payload, photos, token: accessToken });
    const result = await dispatch(action);

    if ((isEditing ? updateAuction.fulfilled : submitAuction.fulfilled).match(result)) {
      if (result.payload?.message) {
        toast.success(result.payload.message);
      }
      onSaved?.(result.payload.auction);
    } else {
      toast.error(result.payload?.message || result.error?.message || 'Не удалось сохранить аукцион');
    }
  };

  const resetForm = () => {
    photos.forEach((photo) => {
      if (photo.file && photo.previewUrl) {
        URL.revokeObjectURL(photo.previewUrl);
      }
    });
    setForm(createInitialForm(user, verification, null));
    setPhotos([]);
    setMainPhotoIndex(0);
    setLocalErrors({});
  };

  if (!verification || verification.status !== 'approved') {
    return (
      <section className={styles.panel}>
        <p className={styles.panel__text}>Создание аукциона доступно только после одобрения верификации.</p>
      </section>
    );
  }

  return (
    <section className={`${styles.panel} ${styles.auctionCreatePanel}`}>
      <div className={styles.panel__header}>
        <button className={styles.backButton} type="button" onClick={onCancel}>← Назад</button>
        <h1 className={styles.panel__title}>{isEditing ? 'Редактирование аукциона' : 'Заявка на создание аукциона'}</h1>
        <p className={styles.panel__text}>
          Заполните карточку будущего аукциона. Черновик можно сохранить и продолжить позже.
        </p>
        {initialAuction?.moderationComment && (
          <div className={styles.statusPanel__reason}>
            <strong>Причина отклонения</strong>
            <p>{initialAuction.moderationComment}</p>
          </div>
        )}
      </div>

      <form className={styles.auctionForm} onSubmit={(event) => { event.preventDefault(); save(false); }} noValidate>
        <section className={styles.auctionBlock}>
          <h2 className={styles.sectionTitle}>Цена и условия торгов</h2>
          <div className={`${styles.segmentGroup} ${styles.fieldFull}`}>
            <label className={styles.segmentOption}>
              <input
                type="radio"
                checked={form.pricing.auctionType === 'increase'}
                onChange={() => updateSection('pricing', 'auctionType', 'increase')}
              />
              <span>Аукцион на повышение</span>
            </label>
            <label className={styles.segmentOption}>
              <input
                type="radio"
                checked={form.pricing.auctionType === 'decrease'}
                onChange={() => updateSection('pricing', 'auctionType', 'decrease')}
              />
              <span>Аукцион на понижение</span>
            </label>
          </div>
          <p className={styles.auctionBlock__hint}>
            На повышение участники увеличивают цену шагом торгов. На понижение цена снижается заданным количеством шагов до минимальной цены.
          </p>

          <div className={styles.formGrid}>
            <Field
              className={styles.fieldFull}
              label={vatApplies ? 'Начальная цена с НДС, BYN' : 'Начальная цена, BYN'}
              value={form.pricing.priceWithVat}
              onChange={(value) => updateSection('pricing', 'priceWithVat', value)}
              error={errors['pricing.priceWithVat']}
              required
              type="number"
              step="0.01"
              hint="Эта цена будет отображаться пользователям."
            />
            <div className={styles.fieldFull}>
              <PriceBreakdown label="Расчет по начальной цене" amount={form.pricing.priceWithVat} vatApplies={vatApplies} />
            </div>

            {form.pricing.auctionType === 'decrease' && (
              <>
                <Field
                  className={styles.fieldFull}
                  label={vatApplies ? 'Минимальная цена с НДС, BYN' : 'Минимальная цена, BYN'}
                  value={form.pricing.minPriceWithVat}
                  onChange={(value) => updateSection('pricing', 'minPriceWithVat', value)}
                  error={errors['pricing.minPriceWithVat']}
                  required
                  type="number"
                  step="0.01"
                  hint="Минимальная цена должна быть ниже начальной. Эта цена будет отображаться пользователям при снижении."
                />
                <div className={styles.fieldFull}>
                  <PriceBreakdown label="Расчет по минимальной цене" amount={form.pricing.minPriceWithVat} vatApplies={vatApplies} />
                </div>
              </>
            )}

            <Field
              label="Сумма задатка, BYN"
              value={form.pricing.depositAmount}
              onChange={(value) => updateSection('pricing', 'depositAmount', value)}
              error={errors['pricing.depositAmount']}
              required
              type="number"
              step="0.01"
              hint={`От 1% до 50% цены. Рекомендуемое значение 10%: ${recommendedDeposit} BYN.`}
            />
            {form.pricing.auctionType === 'increase' ? (
              <Field
                label="Минимальный шаг торгов, BYN"
                value={form.pricing.minBidStep}
                onChange={(value) => updateSection('pricing', 'minBidStep', value)}
                error={errors['pricing.minBidStep']}
                required
                type="number"
                step="0.01"
                hint="От 1% до 10% начальной цены."
              />
            ) : (
              <Field
                label="Количество шагов торгов"
                value={form.pricing.bidStepsCount}
                onChange={(value) => updateSection('pricing', 'bidStepsCount', value)}
                error={errors['pricing.bidStepsCount']}
                required
                type="number"
                min="5"
                max="50"
                hint={`От 5 до 50. Расчетный шаг снижения: ${calculatedDecreaseStep} BYN.`}
              />
            )}
          </div>
        </section>

        <section className={styles.auctionBlock}>
          <h2 className={styles.sectionTitle}>Сроки проведения аукциона</h2>
          <div className={styles.formGrid}>
            <Field
              label="Начало приема заявок"
              value={form.schedule.applicationStartAt}
              onChange={(value) => updateSection('schedule', 'applicationStartAt', value)}
              error={errors['schedule.applicationStartAt']}
              required
              type="date"
              min={toDateInput(new Date())}
              max={toDateInput(addDays(new Date(), 90))}
              hint="От текущей даты до 90 дней."
            />
            <Field
              label="Конец приема заявок"
              value={form.schedule.applicationEndAt}
              onChange={(value) => updateSection('schedule', 'applicationEndAt', value)}
              error={errors['schedule.applicationEndAt']}
              required
              type="date"
              min={toDateInput(addDays(form.schedule.applicationStartAt, 3))}
              max={toDateInput(addDays(form.schedule.applicationStartAt, 90))}
              hint="Через 3-90 дней после начала приема заявок."
            />
            <Field
              label="Дата торгов"
              value={formatDate(biddingDate)}
              onChange={() => {}}
              disabled
              hint="Следующий день после конца приема заявок."
            />
            <TimeRangePicker
              startValue={form.schedule.biddingStartTime}
              endValue={form.schedule.biddingEndTime}
              onStartChange={(value) => updateSection('schedule', 'biddingStartTime', value)}
              onEndChange={(value) => updateSection('schedule', 'biddingEndTime', value)}
              error={errors['schedule.biddingStartTime'] || errors['schedule.biddingStartAt'] || errors['schedule.biddingEndTime'] || errors['schedule.biddingEndAt']}
            />
            <Field
              label="Срок полной оплаты, дней"
              value={form.schedule.paymentDeadlineDays}
              onChange={(value) => updateSection('schedule', 'paymentDeadlineDays', value)}
              error={errors['schedule.paymentDeadlineDays']}
              required
              type="number"
              min="5"
              max="90"
              hint="От 5 до 90 дней."
            />
            <Field
              label="Срок заключения договора, дней"
              value={form.schedule.contractDeadlineDays}
              onChange={(value) => updateSection('schedule', 'contractDeadlineDays', value)}
              error={errors['schedule.contractDeadlineDays']}
              required
              type="number"
              min="5"
              max="90"
              hint="От 5 до 90 дней."
            />
          </div>
        </section>

        <section className={styles.auctionBlock}>
          <h2 className={styles.sectionTitle}>Информация о предмете торгов</h2>
          <div className={styles.formGrid}>
            <Field
              className={styles.fieldFull}
              label="Название предмета торгов"
              value={form.item.title}
              onChange={(value) => updateSection('item', 'title', value)}
              error={errors['item.title']}
              required
              hint={`До 100 знаков. Сейчас: ${form.item.title.length}/100.`}
            />
            <label className={styles.field}>
              <span className={styles.field__label}>Категория<span className={styles.requiredMark}>*</span></span>
              <CustomSelect
                value={form.item.category}
                options={Object.entries(auctionCategoryLabels).map(([value, label]) => ({ value, label }))}
                onChange={changeCategory}
                error={Boolean(errors['item.category'])}
                searchable
                searchPlaceholder="Поиск категории"
              />
              {errors['item.category'] && <span className={styles.field__error}>{errors['item.category']}</span>}
            </label>
          </div>

          <PhotoUploader
            photos={photos}
            mainPhotoIndex={mainPhotoIndex}
            onAdd={addPhotos}
            onMainChange={setMainPhotoIndex}
            onRemove={removePhoto}
            error={errors.photos || errors.mainPhotoIndex}
          />

          <div className={styles.characteristicHeader}>
            <div>
              <h3 className={styles.subsectionTitle}>Характеристики</h3>
              <p>Шаблон зависит от категории. Пустые строки не сохраняются.</p>
            </div>
            <button className={styles.buttonSecondary} type="button" onClick={addCharacteristic}>
              Добавить характеристику
            </button>
          </div>
          <div className={styles.characteristicTable}>
            {form.item.characteristics.map((row, index) => (
              <div className={styles.characteristicRow} key={`${row.name}-${index}`}>
                <input className={styles.field__control} value={row.name} onChange={(event) => updateCharacteristic(index, 'name', event.target.value)} placeholder="Название характеристики" />
                <input className={styles.field__control} value={row.value} onChange={(event) => updateCharacteristic(index, 'value', event.target.value)} placeholder="Значение" />
                <button className={styles.buttonSecondary} type="button" onClick={() => removeCharacteristic(index)}>Удалить</button>
              </div>
            ))}
          </div>

          <div className={styles.formGrid}>
            <Field className={styles.fieldFull} label="Описание" value={form.item.description} onChange={(value) => updateSection('item', 'description', value)} as="textarea" />
            <Field
              className={styles.fieldFull}
              label="Адрес нахождения предмета торгов"
              value={form.item.locationAddress}
              onChange={(value) => updateSection('item', 'locationAddress', value)}
              error={errors['item.locationAddress']}
              required
              as="textarea"
              placeholder="Например: Минская область, г. Минск, ул. Октябрьская, д. 10, кв. 1118"
            />
            <div className={styles.fieldFull}>
              <YandexMapPicker value={form.item.geoLocation} onChange={updateGeoLocation} error={errors['item.geoLocation']} />
            </div>
          </div>
        </section>

        <section className={styles.auctionBlock}>
          <h2 className={styles.sectionTitle}>Осмотр предмета торгов</h2>
          <div className={styles.formGrid}>
            <Field label="ФИО контактного лица" value={form.inspection.contactName} onChange={(value) => updateSection('inspection', 'contactName', value)} error={errors['inspection.contactName']} required />
            <Field label="Телефон контактного лица" value={form.inspection.contactPhone} onChange={(value) => updateSection('inspection', 'contactPhone', value)} error={errors['inspection.contactPhone']} required type="tel" placeholder="+375 (29) 123-45-67" />
            <Field label="Email контактного лица" value={form.inspection.contactEmail} onChange={(value) => updateSection('inspection', 'contactEmail', value)} error={errors['inspection.contactEmail']} required type="email" />
          </div>
        </section>

        <section className={styles.auctionBlock}>
          <h2 className={styles.sectionTitle}>Информация о продавце</h2>
          <ReadOnlyGrid items={sellerInfo.fields} />
        </section>

        <CollapsibleSection title="Оператор торгов">
          <ReadOnlyGrid
            items={[
              ['Наименование', operatorInfo.name],
              ['Адрес', operatorInfo.address],
              ['ФИО контактного лица', operatorInfo.contactPerson],
              ['Телефон', operatorInfo.phone],
              ['Электронная почта', operatorInfo.email],
              ['УНП', operatorInfo.unp]
            ]}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Обязанности и ответственность покупателя" className={styles.auctionBlockWide}>
          <div className={styles.termsGrid}>
            <div className={styles.termsCard}>
              <h3 className={styles.subsectionTitle}>Обязанности</h3>
              <ul>{buyerTerms.obligations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className={styles.termsCard}>
              <h3 className={styles.subsectionTitle}>Ответственность</h3>
              <ul>{buyerTerms.responsibility.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </CollapsibleSection>

        {auction.message && auction.createStatus === 'failed' && <p className={styles.message__error}>{auction.message}</p>}

        <div className={`${styles.formActions} ${styles.auctionFormActions}`}>
          <button className={styles.buttonSecondary} type="button" onClick={resetForm}>Стереть все</button>
          <button className={styles.buttonSecondary} type="button" onClick={() => save(true)} disabled={auction.createStatus === 'loading'}>
            Сохранить черновой вариант
          </button>
          <button className={styles.button} type="submit" disabled={auction.createStatus === 'loading'}>
            Подать заявку на создание аукциона
          </button>
        </div>
      </form>
      <div className={styles.formBackActions}>
        <button className={styles.backButton} type="button" onClick={onCancel}>← Назад</button>
      </div>
    </section>
  );
}

export default AuctionCreateForm;
