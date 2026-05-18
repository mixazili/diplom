import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from '../../../App.module.css';
import {
  DEPOSIT_RETURN_DAYS,
  ORGANIZATION_FEE_PERCENT,
  VAT_RATE,
  auctionCategoryLabels,
  buyerTerms,
  characteristicTemplates,
  operatorInfo
} from '../../../constants/auctionConstants.js';
import { submitAuction } from '../../../features/auction/auctionSlice.js';

const pad = (value) => String(value).padStart(2, '0');
const moneyPattern = /^\d+([,.]\d{1,2})?$/;
const dayMs = 24 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;

const toDateTimeInput = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDate = (dateValue) => {
  if (!dateValue) {
    return '';
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

const getBiddingDate = (applicationEndAt) => {
  if (!applicationEndAt) {
    return '';
  }

  const date = addDays(new Date(applicationEndAt), 1);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const toMoneyNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).replace(',', '.').trim();
  return moneyPattern.test(normalized) ? Number(normalized) : Number.NaN;
};

const makePhotoId = (file) => {
  const randomPart = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Math.random()).slice(2);
  return `${file.name}-${file.size}-${file.lastModified}-${randomPart}`;
};

const toCharacteristicRows = (category) =>
  (characteristicTemplates[category] || characteristicTemplates.passenger_cars).map((name) => ({ name, value: '' }));

const joinName = (...parts) => parts.filter(Boolean).join(' ').trim();

const formatAddress = (address = {}) =>
  address.legalAddress ||
  address.registrationAddress ||
  [
    address.region,
    address.district,
    address.locality,
    address.postalCode,
    address.street,
    address.house,
    address.building,
    address.apartment
  ]
    .filter(Boolean)
    .join(', ');

const getSellerInfo = (user, verification) => {
  const personalData = verification?.personalData || {};
  const organizationData = verification?.organizationData || {};
  const addressData = verification?.addressData || {};
  const fullName =
    personalData.fullName ||
    joinName(personalData.lastName, personalData.firstName, personalData.middleName);

  if (user.accountType === 'legal_entity') {
    return {
      typeLabel: 'Юридическое лицо',
      fields: [
        ['Полное наименование', organizationData.fullName],
        ['УНП', organizationData.unp],
        ['Юридический адрес', formatAddress(addressData)]
      ],
      defaultInspection: { contactName: '', contactPhone: '', contactEmail: '' }
    };
  }

  if (user.accountType === 'entrepreneur') {
    return {
      typeLabel: 'Индивидуальный предприниматель',
      fields: [
        ['ФИО', fullName],
        ['УНП', organizationData.unp],
        ['Телефон', organizationData.contactPhone || personalData.phone]
      ],
      defaultInspection: {
        contactName: fullName,
        contactPhone: organizationData.contactPhone || personalData.phone || '',
        contactEmail: ''
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
      contactEmail: ''
    }
  };
};

const createInitialForm = (user, verification) => {
  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);
  const applicationEnd = addDays(start, 7);
  const sellerInfo = getSellerInfo(user, verification);

  return {
    pricing: {
      priceWithoutVat: '',
      priceWithVat: '',
      depositAmount: '',
      minBidStep: ''
    },
    schedule: {
      applicationStartAt: toDateTimeInput(start),
      applicationEndAt: toDateTimeInput(applicationEnd),
      biddingStartTime: '09:00',
      biddingEndTime: '14:00',
      paymentDeadlineDays: 10,
      contractDeadlineDays: 10
    },
    item: {
      title: '',
      category: 'passenger_cars',
      characteristics: toCharacteristicRows('passenger_cars'),
      description: '',
      locationAddress: '',
      geoLocation: { lat: '', lng: '' }
    },
    inspection: sellerInfo.defaultInspection
  };
};

function Field({
  label,
  value,
  onChange,
  error,
  required = false,
  type = 'text',
  as = 'input',
  disabled = false,
  hint = '',
  className = '',
  highlight = false,
  min,
  max,
  step
}) {
  const Component = as;

  return (
    <label className={`${styles.field} ${className}`}>
      <span className={styles.field__label}>{label}{required ? '*' : ''}</span>
      <Component
        className={`${styles.field__control} ${error ? styles['field__control--error'] : ''} ${disabled ? styles['field__control--readonly'] : ''} ${highlight ? styles['field__control--highlight'] : ''}`}
        type={type}
        value={value}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint && <span className={styles.field__hint}>{hint}</span>}
      {error && <span className={styles.field__error}>{error}</span>}
    </label>
  );
}

function ReadOnlyGrid({ items }) {
  return (
    <div className={styles.readonlyGrid}>
      {items.filter(([, value]) => value).map(([label, value]) => (
        <div className={styles.readonlyItem} key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function PhotoUploader({ photos, mainPhotoIndex, onAdd, onMainChange, onRemove, error }) {
  const inputRef = useRef(null);

  return (
    <div className={styles.photoUploader}>
      <div className={styles.photoUploader__header}>
        <div>
          <span className={styles.field__label}>Фотографии*</span>
          <p>Добавляйте по одной или сразу несколько фотографий. Уже выбранные файлы сохраняются.</p>
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
        <span>Минимум 1 фото. Главное фото будет показываться в каталоге и карточке лота.</span>
      </div>
      {error && <span className={styles.field__error}>{error}</span>}
      {photos.length > 0 && (
        <div className={styles.photoGrid}>
          {photos.map((photo, index) => (
            <article
              className={`${styles.photoCard} ${mainPhotoIndex === index ? styles['photoCard--main'] : ''}`}
              key={photo.id}
            >
              <img src={photo.previewUrl} alt={photo.file.name} />
              <div className={styles.photoCard__body}>
                <strong>{photo.file.name}</strong>
                <span>{(photo.file.size / 1024 / 1024).toFixed(2)} МБ</span>
              </div>
              <div className={styles.photoCard__actions}>
                <button
                  className={mainPhotoIndex === index ? styles.button : styles.buttonSecondary}
                  type="button"
                  onClick={() => onMainChange(index)}
                >
                  {mainPhotoIndex === index ? 'Главная' : 'Сделать главной'}
                </button>
                <button className={styles.buttonSecondary} type="button" onClick={() => onRemove(index)}>
                  Удалить
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function AuctionCreateForm({ verification }) {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((state) => state.auth);
  const auction = useSelector((state) => state.auction);
  const [form, setForm] = useState(() => createInitialForm(user, verification));
  const [photos, setPhotos] = useState([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [localErrors, setLocalErrors] = useState({});
  const errors = { ...localErrors, ...(auction.errors || {}) };
  const vatApplies = ['legal_entity', 'entrepreneur'].includes(user.accountType);
  const sellerInfo = useMemo(() => getSellerInfo(user, verification), [user, verification]);
  const biddingDate = getBiddingDate(form.schedule.applicationEndAt);
  const priceWithVat = toMoneyNumber(form.pricing.priceWithVat);
  const recommendedDeposit = Number.isFinite(priceWithVat) && priceWithVat > 0 ? (priceWithVat * 0.1).toFixed(2) : '0.00';
  const startDate = new Date(form.schedule.applicationStartAt);
  const minApplicationStart = toDateTimeInput(new Date());
  const maxApplicationStart = toDateTimeInput(addDays(new Date(), 90));
  const minApplicationEnd = Number.isNaN(startDate.getTime()) ? '' : toDateTimeInput(addDays(startDate, 3));
  const maxApplicationEnd = Number.isNaN(startDate.getTime()) ? '' : toDateTimeInput(addDays(startDate, 90));

  useEffect(() => {
    setForm(createInitialForm(user, verification));
  }, [user, verification]);

  useEffect(
    () => () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    },
    [photos]
  );

  const updateSection = (section, field, value) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value
      }
    }));
  };

  const updateNested = (section, group, field, value) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [group]: {
          ...current[section][group],
          [field]: value
        }
      }
    }));
  };

  const updatePriceWithoutVat = (value) => {
    const number = toMoneyNumber(value);
    const priceWithVatValue = vatApplies && Number.isFinite(number) ? (number * (1 + VAT_RATE)).toFixed(2) : value;

    setForm((current) => ({
      ...current,
      pricing: {
        ...current.pricing,
        priceWithoutVat: value,
        priceWithVat: priceWithVatValue
      }
    }));
  };

  const updatePriceWithVat = (value) => {
    const number = toMoneyNumber(value);
    const priceWithoutVatValue = vatApplies && Number.isFinite(number) ? (number / (1 + VAT_RATE)).toFixed(2) : value;

    setForm((current) => ({
      ...current,
      pricing: {
        ...current.pricing,
        priceWithoutVat: priceWithoutVatValue,
        priceWithVat: value
      }
    }));
  };

  const changeCategory = (category) => {
    setForm((current) => ({
      ...current,
      item: {
        ...current.item,
        category,
        characteristics: toCharacteristicRows(category)
      }
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
      item: {
        ...current.item,
        characteristics: [...current.item.characteristics, { name: '', value: '' }]
      }
    }));
  };

  const removeCharacteristic = (index) => {
    setForm((current) => ({
      ...current,
      item: {
        ...current.item,
        characteristics: current.item.characteristics.filter((_, rowIndex) => rowIndex !== index)
      }
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
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return current.filter((_, photoIndex) => photoIndex !== index);
    });
    setMainPhotoIndex((current) => {
      if (index === current) {
        return 0;
      }
      return index < current ? current - 1 : current;
    });
  };

  const validateClient = () => {
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
        nextErrors[field] = 'Введите сумму больше 0 с точностью до 2 знаков';
      }
      return number;
    };

    const currentPriceWithVat = requireMoney('pricing.priceWithVat', form.pricing.priceWithVat);
    const currentPriceWithoutVat = requireMoney('pricing.priceWithoutVat', form.pricing.priceWithoutVat);
    const depositAmount = requireMoney('pricing.depositAmount', form.pricing.depositAmount);
    const minBidStep = requireMoney('pricing.minBidStep', form.pricing.minBidStep);

    if (vatApplies && Number.isFinite(currentPriceWithoutVat) && Number.isFinite(currentPriceWithVat)) {
      const expected = Number((currentPriceWithoutVat * (1 + VAT_RATE)).toFixed(2));
      if (Math.abs(expected - currentPriceWithVat) > 0.05) {
        nextErrors['pricing.priceWithVat'] = 'Цена с НДС должна соответствовать цене без НДС и ставке 20%';
      }
    }

    if (Number.isFinite(currentPriceWithVat) && Number.isFinite(depositAmount)) {
      if (depositAmount < currentPriceWithVat * 0.01 || depositAmount > currentPriceWithVat * 0.5) {
        nextErrors['pricing.depositAmount'] = 'Задаток должен быть от 1% до 50% цены с НДС';
      }
    }

    if (Number.isFinite(currentPriceWithVat) && Number.isFinite(minBidStep)) {
      if (minBidStep < currentPriceWithVat * 0.01 || minBidStep > currentPriceWithVat * 0.1) {
        nextErrors['pricing.minBidStep'] = 'Минимальный шаг должен быть от 1% до 10% цены с НДС';
      }
    }

    const now = new Date();
    const applicationStartAt = new Date(form.schedule.applicationStartAt);
    const applicationEndAt = new Date(form.schedule.applicationEndAt);
    const biddingStartAt = new Date(`${biddingDate}T${form.schedule.biddingStartTime}`);
    const biddingEndAt = new Date(`${biddingDate}T${form.schedule.biddingEndTime}`);

    if (Number.isNaN(applicationStartAt.getTime())) {
      nextErrors['schedule.applicationStartAt'] = 'Укажите дату и время начала приема заявок';
    } else if (applicationStartAt < now || applicationStartAt > addDays(now, 90)) {
      nextErrors['schedule.applicationStartAt'] = 'Начало приема заявок должно быть от текущего времени до 90 дней';
    }

    if (Number.isNaN(applicationEndAt.getTime())) {
      nextErrors['schedule.applicationEndAt'] = 'Укажите дату и время конца приема заявок';
    } else if (
      !Number.isNaN(applicationStartAt.getTime()) &&
      (applicationEndAt < addDays(applicationStartAt, 3) || applicationEndAt > addDays(applicationStartAt, 90))
    ) {
      nextErrors['schedule.applicationEndAt'] = 'Конец приема заявок должен быть через 3-90 дней после начала';
    }

    if (form.schedule.biddingStartTime < '09:00') {
      nextErrors['schedule.biddingStartAt'] = 'Начало торгов не раньше 09:00';
    }

    if (form.schedule.biddingEndTime > '19:00') {
      nextErrors['schedule.biddingEndAt'] = 'Конец торгов не позже 19:00';
    }

    if (
      !Number.isNaN(biddingStartAt.getTime()) &&
      !Number.isNaN(biddingEndAt.getTime()) &&
      biddingEndAt.getTime() - biddingStartAt.getTime() < 5 * hourMs
    ) {
      nextErrors['schedule.biddingEndAt'] = 'Минимальный срок торгов - 5 часов';
    }

    const paymentDeadlineDays = Number(form.schedule.paymentDeadlineDays);
    const contractDeadlineDays = Number(form.schedule.contractDeadlineDays);

    if (!Number.isInteger(paymentDeadlineDays) || paymentDeadlineDays < 5 || paymentDeadlineDays > 90) {
      nextErrors['schedule.paymentDeadlineDays'] = 'Срок должен быть от 5 до 90 дней';
    }

    if (!Number.isInteger(contractDeadlineDays) || contractDeadlineDays < 5 || contractDeadlineDays > 90) {
      nextErrors['schedule.contractDeadlineDays'] = 'Срок должен быть от 5 до 90 дней';
    }

    requireText('item.title', form.item.title);
    if (form.item.title.trim().length > 100) {
      nextErrors['item.title'] = 'Название лота должно быть до 100 знаков';
    }
    requireText('item.locationAddress', form.item.locationAddress);

    const lat = form.item.geoLocation.lat;
    const lng = form.item.geoLocation.lng;
    if ((lat && !Number.isFinite(Number(lat))) || (lng && !Number.isFinite(Number(lng)))) {
      nextErrors['item.geoLocation'] = 'Укажите корректные координаты';
    }

    if (photos.length === 0) {
      nextErrors.photos = 'Загрузите хотя бы 1 фотографию';
    }

    if (photos.length > 50) {
      nextErrors.photos = 'Можно загрузить не более 50 фотографий';
    }

    requireText('inspection.contactName', form.inspection.contactName);
    requireText('inspection.contactPhone', form.inspection.contactPhone);

    setLocalErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitForm = async (event) => {
    event.preventDefault();

    if (!validateClient()) {
      return;
    }

    const payload = {
      pricing: form.pricing,
      schedule: {
        applicationStartAt: form.schedule.applicationStartAt,
        applicationEndAt: form.schedule.applicationEndAt,
        biddingStartAt: `${biddingDate}T${form.schedule.biddingStartTime}`,
        biddingEndAt: `${biddingDate}T${form.schedule.biddingEndTime}`,
        paymentDeadlineDays: form.schedule.paymentDeadlineDays,
        contractDeadlineDays: form.schedule.contractDeadlineDays
      },
      item: {
        ...form.item,
        characteristics: form.item.characteristics.filter((row) => row.name.trim() && row.value.trim())
      },
      inspection: form.inspection,
      mainPhotoIndex
    };

    await dispatch(submitAuction({ payload, photos, token: accessToken }));
  };

  if (!verification || verification.status !== 'approved') {
    return (
      <section className={styles.panel}>
        <p className={styles.panel__text}>Данные верификации загружаются. Создание лота доступно только после одобрения верификации.</p>
      </section>
    );
  }

  return (
    <section className={`${styles.panel} ${styles.lotCreatePanel}`}>
      <div className={styles.panel__header}>
        <p className={styles.panel__eyebrow}>Создание лота</p>
        <h1 className={styles.panel__title}>Заявка на создание лота</h1>
        <p className={styles.panel__text}>Заполните карточку будущего аукциона. После отправки лот получит статус ожидания проверки модератором.</p>
      </div>

      <form className={styles.auctionForm} onSubmit={submitForm} noValidate>
        <section className={styles.auctionBlock}>
          <h2 className={styles.sectionTitle}>Ценовой блок</h2>
          <div className={styles.formGrid}>
            {vatApplies && (
              <Field
                label="Начальная цена без НДС, BYN"
                value={form.pricing.priceWithoutVat}
                onChange={updatePriceWithoutVat}
                error={errors['pricing.priceWithoutVat']}
                required
                type="number"
                step="0.01"
                hint="Можно ввести цену без НДС, цена с НДС пересчитается автоматически по ставке 20%."
              />
            )}
            <Field
              className={styles.fieldWide}
              label={vatApplies ? 'Начальная цена с НДС, BYN' : 'Начальная цена, BYN'}
              value={form.pricing.priceWithVat}
              onChange={updatePriceWithVat}
              error={errors['pricing.priceWithVat']}
              required
              type="number"
              step="0.01"
              highlight
              hint={vatApplies ? 'Именно эта цена будет отображаться в каталоге, карточке лота и заявках участников.' : 'Эта цена будет отображаться в каталоге, карточке лота и заявках участников.'}
            />
            <Field
              label="НДС"
              value={vatApplies ? 'НДС включен в цену' : 'Не облагается налогом на добавочную стоимость'}
              onChange={() => {}}
              disabled
              hint="Поле определяется типом аккаунта продавца и не редактируется."
            />
            <Field
              label="Сумма задатка, BYN"
              value={form.pricing.depositAmount}
              onChange={(value) => updateSection('pricing', 'depositAmount', value)}
              error={errors['pricing.depositAmount']}
              required
              type="number"
              step="0.01"
              hint={`От 1% до 50% цены с НДС. Рекомендуемое значение 10%: ${recommendedDeposit} BYN.`}
            />
            <Field
              label="Минимальный шаг торгов, BYN"
              value={form.pricing.minBidStep}
              onChange={(value) => updateSection('pricing', 'minBidStep', value)}
              error={errors['pricing.minBidStep']}
              required
              type="number"
              step="0.01"
              hint="От 1% до 10% цены с НДС."
            />
            <Field
              label="Затраты на организацию и проведение торгов"
              value={`${ORGANIZATION_FEE_PERCENT}%`}
              onChange={() => {}}
              disabled
              hint="Фиксированное значение, пользователь не меняет поле."
            />
          </div>
        </section>

        <section className={styles.auctionBlock}>
          <h2 className={styles.sectionTitle}>Даты</h2>
          <div className={styles.formGrid}>
            <Field
              label="Начало приема заявок"
              value={form.schedule.applicationStartAt}
              onChange={(value) => updateSection('schedule', 'applicationStartAt', value)}
              error={errors['schedule.applicationStartAt']}
              required
              type="datetime-local"
              min={minApplicationStart}
              max={maxApplicationStart}
              hint="От текущего времени до 90 дней."
            />
            <Field
              label="Конец приема заявок"
              value={form.schedule.applicationEndAt}
              onChange={(value) => updateSection('schedule', 'applicationEndAt', value)}
              error={errors['schedule.applicationEndAt']}
              required
              type="datetime-local"
              min={minApplicationEnd}
              max={maxApplicationEnd}
              hint="Через 3-90 дней после начала приема заявок."
            />
            <Field
              label="Дата торгов"
              value={formatDate(biddingDate)}
              onChange={() => {}}
              disabled
              hint="Следующий день после конца приема заявок."
            />
            <Field
              label="Время начала торгов"
              value={form.schedule.biddingStartTime}
              onChange={(value) => updateSection('schedule', 'biddingStartTime', value)}
              error={errors['schedule.biddingStartAt']}
              required
              type="time"
              min="09:00"
              max="14:00"
              hint="Не раньше 09:00."
            />
            <Field
              label="Время конца торгов"
              value={form.schedule.biddingEndTime}
              onChange={(value) => updateSection('schedule', 'biddingEndTime', value)}
              error={errors['schedule.biddingEndAt']}
              required
              type="time"
              min="14:00"
              max="19:00"
              hint="Не позже 19:00. Минимальный срок торгов - 5 часов."
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
              label="Срок возвращения задатков"
              value={`${DEPOSIT_RETURN_DAYS} дней`}
              onChange={() => {}}
              disabled
              hint="Фиксированное значение."
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
              label="Название лота"
              value={form.item.title}
              onChange={(value) => updateSection('item', 'title', value)}
              error={errors['item.title']}
              required
              hint={`До 100 знаков. Сейчас: ${form.item.title.length}/100.`}
            />
            <label className={styles.field}>
              <span className={styles.field__label}>Категория*</span>
              <select
                className={styles.field__control}
                value={form.item.category}
                onChange={(event) => changeCategory(event.target.value)}
              >
                {Object.entries(auctionCategoryLabels).map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
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
              <p>Шаблон зависит от категории. Пустые строки не сохраняются в лоте.</p>
            </div>
            <button className={styles.buttonSecondary} type="button" onClick={addCharacteristic}>
              Добавить характеристику
            </button>
          </div>
          <div className={styles.characteristicTable}>
            {form.item.characteristics.map((row, index) => (
              <div className={styles.characteristicRow} key={`${row.name}-${index}`}>
                <input
                  className={styles.field__control}
                  value={row.name}
                  onChange={(event) => updateCharacteristic(index, 'name', event.target.value)}
                  placeholder="Название характеристики"
                />
                <input
                  className={styles.field__control}
                  value={row.value}
                  onChange={(event) => updateCharacteristic(index, 'value', event.target.value)}
                  placeholder="Значение"
                />
                <button className={styles.buttonSecondary} type="button" onClick={() => removeCharacteristic(index)}>
                  Удалить
                </button>
              </div>
            ))}
          </div>

          <div className={styles.formGrid}>
            <Field
              className={styles.fieldFull}
              label="Описание"
              value={form.item.description}
              onChange={(value) => updateSection('item', 'description', value)}
              as="textarea"
              hint="Необязательное поле. Можно добавить состояние, комплектацию, ограничения или особенности осмотра."
            />
            <Field
              className={styles.fieldFull}
              label="Адрес нахождения предмета торгов"
              value={form.item.locationAddress}
              onChange={(value) => updateSection('item', 'locationAddress', value)}
              error={errors['item.locationAddress']}
              required
              as="textarea"
            />
            <Field
              label="Широта для Yandex Maps"
              value={form.item.geoLocation.lat}
              onChange={(value) => updateNested('item', 'geoLocation', 'lat', value)}
              error={errors['item.geoLocation']}
              hint="Необязательно. Например: 53.9023."
            />
            <Field
              label="Долгота для Yandex Maps"
              value={form.item.geoLocation.lng}
              onChange={(value) => updateNested('item', 'geoLocation', 'lng', value)}
              error={errors['item.geoLocation']}
              hint="Необязательно. Например: 27.5619."
            />
          </div>
        </section>

        <section className={styles.auctionBlock}>
          <h2 className={styles.sectionTitle}>Осмотр предмета торгов</h2>
          <div className={styles.formGrid}>
            <Field
              label="ФИО контактного лица"
              value={form.inspection.contactName}
              onChange={(value) => updateSection('inspection', 'contactName', value)}
              error={errors['inspection.contactName']}
              required
            />
            <Field
              label="Телефон контактного лица"
              value={form.inspection.contactPhone}
              onChange={(value) => updateSection('inspection', 'contactPhone', value)}
              error={errors['inspection.contactPhone']}
              required
            />
            <Field
              label="Email контактного лица"
              value={form.inspection.contactEmail}
              onChange={(value) => updateSection('inspection', 'contactEmail', value)}
              type="email"
              hint="Необязательно."
            />
          </div>
        </section>

        <section className={styles.auctionBlock}>
          <h2 className={styles.sectionTitle}>Информация о продавце</h2>
          <p className={styles.auctionBlock__hint}>Эти данные подтягиваются из одобренной верификации и не редактируются в лоте.</p>
          <ReadOnlyGrid items={sellerInfo.fields} />
        </section>

        <section className={styles.auctionBlock}>
          <h2 className={styles.sectionTitle}>Оператор торгов</h2>
          <ReadOnlyGrid
            items={[
              ['Наименование', operatorInfo.name],
              ['ФИО контактного лица', operatorInfo.contactPerson],
              ['Адрес', operatorInfo.address],
              ['Электронная почта', operatorInfo.email],
              ['УНП', operatorInfo.unp]
            ]}
          />
        </section>

        <section className={`${styles.auctionBlock} ${styles.auctionBlockWide}`}>
          <h2 className={styles.sectionTitle}>Обязанности и ответственность покупателя</h2>
          <div className={styles.termsGrid}>
            <div className={styles.termsCard}>
              <h3 className={styles.subsectionTitle}>Обязанности</h3>
              <ul>
                {buyerTerms.obligations.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className={styles.termsCard}>
              <h3 className={styles.subsectionTitle}>Ответственность</h3>
              <ul>
                {buyerTerms.responsibility.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </section>

        {auction.message && (
          <p className={auction.createStatus === 'failed' ? styles.message__error : styles.message__success}>
            {auction.message}
          </p>
        )}

        <div className={styles.formActions}>
          <button className={styles.button} type="submit" disabled={auction.createStatus === 'loading'}>
            Подать заявку на создание лота
          </button>
        </div>
      </form>
    </section>
  );
}

export default AuctionCreateForm;
