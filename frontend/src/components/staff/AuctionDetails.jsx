import React from 'react';
import styles from '../../App.module.css';
import { auctionCategoryLabels, buyerTerms, operatorInfo } from '../../constants/auctionConstants.js';
import { accountTypeLabels } from '../../constants/verificationLabels.js';

const formatMoney = (value) =>
  new Intl.NumberFormat('ru-BY', { style: 'currency', currency: 'BYN' }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString('ru-BY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

function DetailSection({ title, items }) {
  const rows = items.filter(([, value]) => value !== undefined && value !== null && value !== '');

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className={styles.detailSection}>
      <h3 className={styles.detailSection__title}>{title}</h3>
      <dl className={styles.detailList}>
        {rows.map(([label, value]) => (
          <div className={styles.detailItem} key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function AuctionDetails({ auction }) {
  if (!auction) {
    return <p className={styles.panel__text}>Нет данных лота.</p>;
  }

  const mainPhoto = auction.photos?.find((photo) => photo.isMain) || auction.photos?.[0];

  return (
    <div className={styles.detailGrid}>
      <section className={styles.auctionDetailHero}>
        {mainPhoto ? (
          <img src={mainPhoto.url} alt={auction.item?.title || 'Фото лота'} />
        ) : (
          <div className={styles.lotCard__placeholder}>Фото не загружено</div>
        )}
        <div>
          <span className={styles.statusPanel__badge}>{auction.status}</span>
          <h3>{auction.item?.title}</h3>
          <p>{auction.lotNumber}</p>
          <strong>{formatMoney(auction.pricing?.priceWithVat)}</strong>
        </div>
      </section>

      {auction.photos?.length > 0 && (
        <section className={styles.detailSection}>
          <h3 className={styles.detailSection__title}>Фотографии</h3>
          <div className={styles.auctionPhotoStrip}>
            {auction.photos.map((photo) => (
              <a href={photo.url} target="_blank" rel="noreferrer" key={photo.path || photo.url}>
                <img src={photo.url} alt={photo.originalName || 'Фото лота'} />
                <span>{photo.isMain ? 'Главная' : photo.originalName}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <DetailSection
        title="Ценовой блок"
        items={[
          ['Цена без НДС', formatMoney(auction.pricing?.priceWithoutVat)],
          ['Цена с НДС', formatMoney(auction.pricing?.priceWithVat)],
          ['НДС', auction.pricing?.vatLabel],
          ['Сумма задатка', formatMoney(auction.pricing?.depositAmount)],
          ['Минимальный шаг торгов', formatMoney(auction.pricing?.minBidStep)],
          ['Затраты на организацию торгов', `${auction.pricing?.organizationFeePercent || 1}%`]
        ]}
      />

      <DetailSection
        title="Даты"
        items={[
          ['Начало приема заявок', formatDateTime(auction.schedule?.applicationStartAt)],
          ['Конец приема заявок', formatDateTime(auction.schedule?.applicationEndAt)],
          ['Начало торгов', formatDateTime(auction.schedule?.biddingStartAt)],
          ['Конец торгов', formatDateTime(auction.schedule?.biddingEndAt)],
          ['Срок полной оплаты', `${auction.schedule?.paymentDeadlineDays} дней`],
          ['Срок возвращения задатков', `${auction.schedule?.depositReturnDays} дней`],
          ['Срок заключения договора', `${auction.schedule?.contractDeadlineDays} дней`]
        ]}
      />

      <DetailSection
        title="Предмет торгов"
        items={[
          ['Категория', auctionCategoryLabels[auction.item?.category] || auction.item?.category],
          ['Адрес нахождения', auction.item?.locationAddress],
          ['Описание', auction.item?.description],
          ['Геолокация', auction.item?.geoLocation?.lat && auction.item?.geoLocation?.lng ? 'Указана на карте' : 'Не указана']
        ]}
      />

      {auction.item?.characteristics?.length > 0 && (
        <section className={styles.detailSection}>
          <h3 className={styles.detailSection__title}>Характеристики</h3>
          <dl className={styles.detailList}>
            {auction.item.characteristics.map((row) => (
              <div className={styles.detailItem} key={`${row.name}-${row.value}`}>
                <dt>{row.name}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <DetailSection
        title="Осмотр предмета торгов"
        items={[
          ['ФИО контактного лица', auction.inspection?.contactName],
          ['Телефон контактного лица', auction.inspection?.contactPhone],
          ['Email контактного лица', auction.inspection?.contactEmail]
        ]}
      />

      <DetailSection
        title="Продавец"
        items={[
          ['Тип участника', accountTypeLabels[auction.seller?.accountType] || auction.seller?.accountType],
          ['ФИО', auction.seller?.fullName],
          ['Телефон', auction.seller?.phone],
          ['Дополнительный телефон', auction.seller?.additionalPhone],
          ['Полное наименование', auction.seller?.organizationName],
          ['УНП', auction.seller?.unp],
          ['Юридический адрес', auction.seller?.legalAddress]
        ]}
      />

      <DetailSection
        title="Оператор торгов"
        items={[
          ['Наименование', operatorInfo.name],
          ['Контактное лицо', operatorInfo.contactPerson],
          ['Адрес', operatorInfo.address],
          ['Электронная почта', operatorInfo.email],
          ['УНП', operatorInfo.unp]
        ]}
      />

      <section className={styles.detailSection}>
        <h3 className={styles.detailSection__title}>Обязанности и ответственность покупателя</h3>
        <div className={styles.termsGrid}>
          <div className={styles.termsCard}>
            <h4 className={styles.subsectionTitle}>Обязанности</h4>
            <ul>{buyerTerms.obligations.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className={styles.termsCard}>
            <h4 className={styles.subsectionTitle}>Ответственность</h4>
            <ul>{buyerTerms.responsibility.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AuctionDetails;
