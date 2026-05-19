import React, { useState } from 'react';
import styles from '../../App.module.css';
import { auctionCategoryLabels } from '../../constants/auctionConstants.js';
import AuctionDetails from './AuctionDetails.jsx';
import StaffCard from './StaffCard.jsx';

const formatMoney = (value) =>
  new Intl.NumberFormat('ru-BY', { style: 'currency', currency: 'BYN' }).format(Number(value || 0));

function AuctionQueue({ auctions, onApprove, onReturn }) {
  const [comments, setComments] = useState({});

  const updateComment = (id, value) => {
    setComments((current) => ({ ...current, [id]: value }));
  };

  return (
    <section className={styles.staffSection}>
      <h2 className={styles.sectionTitle}>Заявки на создание лотов</h2>
      <div className={styles.staffList}>
        {auctions.length === 0 && <p className={styles.panel__text}>Нет лотов в ожидании проверки.</p>}
        {auctions.map((auction) => (
          <StaffCard
            key={auction.id}
            title={auction.item?.title || 'Лот без названия'}
            meta={`${auction.owner?.email || 'пользователь'} · ${auctionCategoryLabels[auction.item?.category] || auction.item?.category} · ${formatMoney(auction.pricing?.priceWithVat)}`}
            status="Ожидает проверки"
            actions={(
              <div className={styles.staffActions}>
                <textarea
                  className={styles.field__control}
                  value={comments[auction.id] || ''}
                  onChange={(event) => updateComment(auction.id, event.target.value)}
                  placeholder="Комментарий для пользователя при возврате на доработку"
                />
                <button className={styles.button} type="button" onClick={() => onApprove(auction.id, comments[auction.id] || '')}>
                  Одобрить
                </button>
                <button className={styles.buttonDanger} type="button" onClick={() => onReturn(auction.id, comments[auction.id] || '')}>
                  На доработку
                </button>
              </div>
            )}
          >
            <AuctionDetails auction={auction} />
          </StaffCard>
        ))}
      </div>
    </section>
  );
}

export default AuctionQueue;
