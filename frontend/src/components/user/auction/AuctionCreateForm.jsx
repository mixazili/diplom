import React, { useEffect, useMemo, useState } from 'react';
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
        ['Телефон', organizationData.contactPhone]
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

function Field({ label, value, onChange, error, required = false, type = 'text', as = 'input', disabled = false, hint = '' }) {
  const Component = as;

  return (
    <label className={styles.field}>
      <span className={styles.field__label}>{label}{required ? '*' : ''}</span>
      <Component
        className={styles.field__control}
        type={type}
        value={value}
        disabled={disabled}
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

function AuctionCreateForm({ verification }) {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((state) => state.auth);
  const auction = useSelector((state) => state.auction);
  const [form, setForm] = useState(() => createInitialForm(user, verification));
  const [photos, setPhotos] = useState([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [localError, setLocalError] = useState('');
  const errors = auction.errors || {};
  const vatApplies = ['legal_entity', 'entrepreneur'].includes(user.accountType);
  const sellerInfo = useMemo(() => getSellerInfo(user, verification), [user, verification]);
  const biddingDate = getBiddingDate(form.schedule.applicationEndAt);
  const priceWithVat = Number(String(form.pricing.priceWithVat || '0').replace(',', '.'));
  const recommendedDeposit = Number.isFinite(priceWithVat) && priceWithVat > 0 ? (priceWithVat * 0.1).toFixed(2) : '0.00';

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
    const normalized = value.replace(',', '.');
    const number = Number(normalized);
    const priceWithVatValue = vatApplies && Number.isFinite(number) ? (number * (1 + VAT_RATE)).toFixed(2) : normalized;

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
    const normalized = value.replace(',', '.');
    const number = Number(normalized);
    const priceWithoutVatValue = vatApplies && Number.isFinite(number) ? (number / (1 + VAT_RATE)).toFixed(2) : normalized;

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

  const changePhotos = (fileList) => {
    const files = Array.from(fileList || []);
    setLocalError(files.length > 50 ? 'Можно загрузить не более 50 фотографий' : '');
    const nextPhotos = files.slice(0, 50).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    setPhotos(nextPhotos);
    setMainPhotoIndex(0);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setLocalError('');

    if (photos.length === 0) {
      setLocalError('Загрузите хотя бы 1 фотографию');
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
      item: form.item,
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
    <section className={styles.panel}>
      <div className={styles.panel__header}>
        <p className={styles.panel__eyebrow}>Создание лота</p>
        <h1 className={styles.panel__title}>Заявка на создание лота</h1>
        <p className={styles.panel__text}>Лот будет сохранен со статусом ожидания проверки модератором.</p>
      </div>

      <form className={styles.auctionForm} onSubmit={submitForm}>
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
                hint="Цена с НДС пересчитывается автоматически по ставке 20%."
              />
            )}
            <Field
              label={vatApplies ? 'Начальная цена с НДС, BYN' : 'Начальная цена, BYN'}
              value={form.pricing.priceWithVat}
              onChange={updatePriceWithVat}
              error={errors['pricing.priceWithVat']}
              required
              type="number"
              hint={vatApplies ? 'Покупателям будет видна цена с НДС.' : ''}
            />
            <Field
              label="НДС"
              value={vatApplies ? 'НДС включен в цену' : 'Не облагается налогом на добавленную стоимость'}
              onChange={() => {}}
              disabled
            />
            <Field
              label="Сумма задатка, BYN"
              value={form.pricing.depositAmount}
              onChange={(value) => updateSection('pricing', 'depositAmount', value)}
              error={errors['pricing.depositAmount']}
              required
              type="number"
              hint={`От 1% до 50% цены с НДС. Рекомендуемое значение 10%: ${recommendedDeposit} BYN.`}
            />
            <Field
              label="Минимальный шаг торгов, BYN"
              value={form.pricing.minBidStep}
              onChange={(value) => updateSection('pricing', 'minBidStep', value)}
              error={errors['pricing.minBidStep']}
              required
              type="number"
              hint="От 1% до 10% цены с НДС."
            />
            <Field
              label="Затраты на организацию и проведение торгов"
              value={`${ORGANIZATION_FEE_PERCENT}%`}
              onChange={() => {}}
              disabled
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
            />
            <Field
              label="Конец приема заявок"
              value={form.schedule.applicationEndAt}
              onChange={(value) => updateSection('schedule', 'applicationEndAt', value)}
              error={errors['schedule.applicationEndAt']}
              required
              type="datetime-local"
            />
            <Field label="Дата торгов" value={formatDate(biddingDate)} onChange={() => {}} disabled hint="Следующий день после конца приема заявок." />
            <Field
              label="Время начала торгов"
              value={form.schedule.biddingStartTime}
              onChange={(value) => updateSection('schedule', 'biddingStartTime', value)}
              error={errors['schedule.biddingStartAt']}
              required
              type="time"
              hint="Не раньше 09:00."
            />
            <Field
              label="Время конца торгов"
              value={form.schedule.biddingEndTime}
              onChange={(value) => updateSection('schedule', 'biddingEndTime', value)}
              error={errors['schedule.biddingEndAt']}
              required
              type="time"
              hint="Не позже 19:00, минимум 5 часов торгов."
            />
            <Field
              label="Срок полной оплаты, дней"
              value={form.schedule.paymentDeadlineDays}
              onChange={(value) => updateSection('schedule', 'paymentDeadlineDays', value)}
              error={errors['schedule.paymentDeadlineDays']}
              required
              type="number"
              hint="От 5 до 90 дней."
            />
            <Field label="Срок возвращения задатков" value={`${DEPOSIT_RETURN_DAYS} дней`} onChange={() => {}} disabled />
            <Field
              label="Срок заключения договора, дней"
              value={form.schedule.contractDeadlineDays}
              onChange={(value) => updateSection('schedule', 'contractDeadlineDays', value)}
              error={errors['schedule.contractDeadlineDays']}
              required
              type="number"
              hint="От 5 до 90 дней."
            />
          </div>
        </section>

        <section className={styles.auctionBlock}>
          <h2 className={styles.sectionTitle}>Информация о предмете торгов</h2>
          <div className={styles.formGrid}>
            <Field
              label="Название лота"
              value={form.item.title}
              onChange={(value) => updateSection('item', 'title', value)}
              error={errors['item.title']}
              required
              hint="До 100 знаков."
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

          <label className={styles.field}>
            <span className={styles.field__label}>Фотографии*</span>
            <input className={styles.field__control} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => changePhotos(event.target.files)} />
            <span className={styles.field__hint}>Можно загрузить до 50 фотографий. Выберите главную фотографию для каталога.</span>
            {(errors.photos || localError) && <span className={styles.field__error}>{localError || errors.photos}</span>}
          </label>

          {photos.length > 0 && (
            <div className={styles.photoGrid}>
              {photos.map((photo, index) => (
                <label className={styles.photoCard} key={photo.previewUrl}>
                  <img src={photo.previewUrl} alt={photo.file.name} />
                  <span>{photo.file.name}</span>
                  <input type="radio" checked={mainPhotoIndex === index} onChange={() => setMainPhotoIndex(index)} />
                  Главная
                </label>
              ))}
            </div>
          )}

          <h3 className={styles.subsectionTitle}>Характеристики</h3>
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
            <button className={styles.buttonSecondary} type="button" onClick={addCharacteristic}>
              Добавить характеристику
            </button>
          </div>

          <div className={styles.formGrid}>
            <Field
              label="Описание"
              value={form.item.description}
              onChange={(value) => updateSection('item', 'description', value)}
              as="textarea"
            />
            <Field
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
            />
            <Field
              label="Долгота для Yandex Maps"
              value={form.item.geoLocation.lng}
              onChange={(value) => updateNested('item', 'geoLocation', 'lng', value)}
              error={errors['item.geoLocation']}
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
            />
          </div>
        </section>

        <section className={styles.auctionBlock}>
          <h2 className={styles.sectionTitle}>Информация о продавце</h2>
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

        <section className={styles.auctionBlock}>
          <h2 className={styles.sectionTitle}>Обязанности и ответственность покупателя</h2>
          <div className={styles.termsGrid}>
            <div>
              <h3 className={styles.subsectionTitle}>Обязанности</h3>
              <ul>
                {buyerTerms.obligations.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div>
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

        <button className={styles.button} type="submit" disabled={auction.createStatus === 'loading'}>
          Подать заявку на создание лота
        </button>
      </form>
    </section>
  );
}

export default AuctionCreateForm;
