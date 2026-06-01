import React from 'react';
import styles from '../../App.module.css';
import { ORGANIZATION_FEE_PERCENT, VAT_RATE, auctionCategoryLabels, buyerTerms, operatorInfo } from '../../constants/auctionConstants.js';
import { accountTypeLabels } from '../../constants/verificationLabels.js';
import { formatDateTime } from '../../utils/formatters.js';
import { formatPhoneDisplay } from '../../utils/inputFormatters.js';
import CollapsibleSection from '../auction/CollapsibleSection.jsx';
import AuctionMapPreview from './AuctionMapPreview.jsx';

const formatMoney = (value) =>
  new Intl.NumberFormat('ru-BY', { style: 'currency', currency: 'BYN' }).format(Number(value || 0));

const padTime = (value) => String(value).padStart(2, '0');

const minutesToTime = (minutes) => `${padTime(Math.floor(minutes / 60))}:${padTime(minutes % 60)}`;

const timeToMinutes = (value) => {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getHours() * 60 + date.getMinutes();
};

function TimeRangePreview({ startAt, endAt, min = 540, max = 1140 }) {
  const startMinutes = timeToMinutes(startAt) ?? 720;
  const endMinutes = timeToMinutes(endAt) ?? 1020;
  const durationHours = Math.max(0, (endMinutes - startMinutes) / 60);
  const rangeSize = max - min;
  const fillLeft = Math.max(0, Math.min(100, ((startMinutes - min) / rangeSize) * 100));
  const fillRight = 100 - Math.max(0, Math.min(100, ((endMinutes - min) / rangeSize) * 100));

  return (
    <div className={styles.fieldFull}>
      <span className={styles.field__label}>Время торгов</span>
      <div className={styles.timeRange}>
        <label>
          <span>Начало</span>
          <input className={`${styles.field__control} ${styles['field__control--readonly']}`} type="time" value={minutesToTime(startMinutes)} disabled />
        </label>
        <label>
          <span>Конец</span>
          <input className={`${styles.field__control} ${styles['field__control--readonly']}`} type="time" value={minutesToTime(endMinutes)} disabled />
        </label>
      </div>
      <div className={styles.timeRangeSliders}>
        <div className={styles.rangeTrack}>
          <span className={styles.rangeTrack__fill} style={{ left: `${fillLeft}%`, right: `${fillRight}%` }} />
        </div>
        <input type="range" min={min} max={max} step="30" value={startMinutes} disabled readOnly />
        <input type="range" min={min} max={max} step="30" value={endMinutes} disabled readOnly />
      </div>
      <div className={styles.timeMarks}>
        <span>{minutesToTime(min)}</span>
        <span>12:00</span>
        <span>15:00</span>
        <span>{minutesToTime(max)}</span>
      </div>
      <span className={styles.field__hint}>Продолжительность: {durationHours.toLocaleString('ru-RU')} ч. Минимум 3 часа.</span>
    </div>
  );
}

const auctionTypeLabels = {
  increase: 'Аукцион на повышение',
  decrease: 'Аукцион на понижение'
};

function ReadField({ label, value, wide = false, as = 'input', hint = '' }) {
  const Control = as;
  const displayValue = /телефон/i.test(label) ? formatPhoneDisplay(value) : value;

  return (
    <label className={`${styles.field} ${wide ? styles.fieldFull : ''}`}>
      <span className={styles.field__label}>{label}</span>
      <Control
        className={`${styles.field__control} ${styles['field__control--readonly']}`}
        value={displayValue || 'Не указано'}
        disabled
        rows={as === 'textarea' ? 3 : undefined}
      />
      {hint && <span className={styles.field__hint}>{hint}</span>}
    </label>
  );
}

function ReadSection({ title, children, userEntered = false }) {
  return (
    <section className={`${styles.auctionBlock} ${userEntered ? styles.userEnteredSection : ''}`}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.formGrid}>{children}</div>
    </section>
  );
}

function PriceBreakdown({ label, amount, vatApplies }) {
  const price = Number(amount || 0);

  if (!price) {
    return null;
  }

  const fee = price * (ORGANIZATION_FEE_PERCENT / 100);
  const vat = vatApplies ? price * VAT_RATE : 0;
  const clean = price - fee - vat;

  return (
    <div className={`${styles.priceBreakdown} ${styles.fieldFull}`}>
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

function AuctionDetails({ auction }) {
  if (!auction) {
    return <p className={styles.panel__text}>Нет данных лота.</p>;
  }

  const pricing = auction.pricing || {};
  const item = auction.item || {};
  const schedule = auction.schedule || {};
  const inspection = auction.inspection || {};
  const seller = auction.seller || {};

  return (
    <div className={`${styles.auctionForm} ${styles.readonlyForm}`}>
      <ReadSection title="Цена и условия торгов" userEntered>
        <ReadField label="Тип аукциона" value={auctionTypeLabels[pricing.auctionType] || pricing.auctionType} wide />
        <ReadField label={pricing.vatApplies ? 'Начальная цена с НДС, BYN' : 'Начальная цена, BYN'} value={formatMoney(pricing.priceWithVat)} wide hint="Эта цена будет отображаться пользователям." />
        <PriceBreakdown label="Расчет по начальной цене" amount={pricing.priceWithVat} vatApplies={pricing.vatApplies} />
        {pricing.auctionType === 'decrease' && (
          <>
            <ReadField label={pricing.vatApplies ? 'Минимальная цена с НДС, BYN' : 'Минимальная цена, BYN'} value={formatMoney(pricing.minPriceWithVat)} wide />
            <PriceBreakdown label="Расчет по минимальной цене" amount={pricing.minPriceWithVat} vatApplies={pricing.vatApplies} />
          </>
        )}
        <ReadField label="Сумма задатка, BYN" value={formatMoney(pricing.depositAmount)} />
        {pricing.auctionType === 'increase' ? (
          <ReadField label="Минимальный шаг торгов, BYN" value={formatMoney(pricing.minBidStep)} />
        ) : (
          <>
            <ReadField label="Количество шагов торгов" value={pricing.bidStepsCount} />
            <ReadField label="Расчетный шаг снижения" value={formatMoney(pricing.calculatedBidStep)} />
          </>
        )}
      </ReadSection>

      <ReadSection title="Сроки проведения аукциона" userEntered>
        <ReadField label="Начало приема заявок" value={formatDateTime(schedule.applicationStartAt)} />
        <ReadField label="Конец приема заявок" value={formatDateTime(schedule.applicationEndAt)} />
        <ReadField label="Дата торгов" value={formatDateTime(schedule.biddingStartAt).split(',')[0]} />
        <TimeRangePreview startAt={schedule.biddingStartAt} endAt={schedule.biddingEndAt} />
        <ReadField label="Срок полной оплаты, дней" value={schedule.paymentDeadlineDays} />
        <ReadField label="Срок заключения договора, дней" value={schedule.contractDeadlineDays} />
      </ReadSection>

      <ReadSection title="Информация о предмете торгов" userEntered>
        <ReadField label="Название лота" value={item.title} wide />
        <ReadField label="Категория" value={auctionCategoryLabels[item.category] || item.category} />
        {auction.photos?.length > 0 && (
          <div className={styles.fieldFull}>
            <div className={styles.photoGrid}>
              {auction.photos.map((photo, index) => (
                <a className={`${styles.photoCard} ${photo.isMain ? styles['photoCard--main'] : ''}`} href={photo.url} target="_blank" rel="noreferrer" key={photo.path || index}>
                  <img src={photo.url} alt="Фото лота" />
                </a>
              ))}
            </div>
          </div>
        )}
        {item.characteristics?.length > 0 && (
          <div className={`${styles.characteristicTable} ${styles.fieldFull}`}>
            {item.characteristics.map((row, index) => (
              <div className={styles.characteristicRow} key={`${row.name}-${index}`}>
                <input className={`${styles.field__control} ${styles['field__control--readonly']}`} value={row.name} disabled />
                <input className={`${styles.field__control} ${styles['field__control--readonly']}`} value={row.value} disabled />
              </div>
            ))}
          </div>
        )}
        <ReadField label="Описание" value={item.description} as="textarea" wide />
        <ReadField label="Адрес нахождения предмета торгов" value={item.locationAddress} as="textarea" wide />
        <div className={styles.fieldFull}>
          <AuctionMapPreview geoLocation={item.geoLocation} address={item.locationAddress} />
        </div>
      </ReadSection>

      <ReadSection title="Осмотр предмета торгов" userEntered>
        <ReadField label="ФИО контактного лица" value={inspection.contactName} />
        <ReadField label="Телефон контактного лица" value={inspection.contactPhone} />
        <ReadField label="Email контактного лица" value={inspection.contactEmail} />
      </ReadSection>

      <ReadSection title="Информация о продавце">
        <div className={styles.fieldFull}>
          <ReadOnlyGrid
            items={[
              ['Тип участника', accountTypeLabels[seller.accountType] || seller.accountType],
              ['ФИО', seller.fullName],
              ['Телефон', seller.phone],
              ['Дополнительный телефон', seller.additionalPhone],
              ['Краткое наименование', seller.organizationName],
              [seller.isResident ? 'УНП' : 'ИНН/БИН', seller.unp],
              ['Юридический адрес', seller.legalAddress]
            ]}
          />
        </div>
      </ReadSection>

      <CollapsibleSection title="Оператор торгов">
        <div className={styles.fieldFull}>
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
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Обязанности и ответственность покупателя">
        <div className={styles.termsGrid}>
          <div className={styles.termsCard}>
            <h3 className={styles.subsectionTitle}>Обязанности</h3>
            <ul>{buyerTerms.obligations.map((itemText) => <li key={itemText}>{itemText}</li>)}</ul>
          </div>
          <div className={styles.termsCard}>
            <h3 className={styles.subsectionTitle}>Ответственность</h3>
            <ul>{buyerTerms.responsibility.map((itemText) => <li key={itemText}>{itemText}</li>)}</ul>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

export default AuctionDetails;
