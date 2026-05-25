import React, { useState } from 'react';
import styles from '../../App.module.css';
import AuctionCard from '../auction/AuctionCard.jsx';
import AuctionDetails from './AuctionDetails.jsx';

function AuctionQueue({ auctions, onApprove, onReturn }) {
  const [comments, setComments] = useState({});
  const [selectedAuctionId, setSelectedAuctionId] = useState(null);
  const selectedAuction = auctions.find((auction) => auction.id === selectedAuctionId);

  const updateComment = (id, value) => {
    setComments((current) => ({ ...current, [id]: value }));
  };

  if (selectedAuction) {
    return (
      <section className={styles.staffSection}>
        <button className={styles.backButton} type="button" onClick={() => setSelectedAuctionId(null)}>
          ← Назад
        </button>
        <AuctionDetails auction={selectedAuction} />
        <div className={styles.staffActions}>
          <textarea
            className={styles.field__control}
            value={comments[selectedAuction.id] || ''}
            onChange={(event) => updateComment(selectedAuction.id, event.target.value)}
            placeholder="Комментарий для пользователя при отказе"
          />
          <button className={styles.button} type="button" onClick={() => onApprove(selectedAuction.id, comments[selectedAuction.id] || '')}>
            Одобрить
          </button>
          <button className={styles.buttonDanger} type="button" onClick={() => onReturn(selectedAuction.id, comments[selectedAuction.id] || '')}>
            Отказать
          </button>
        </div>
        <div className={styles.staffCancelActions}>
          <button className={styles.backButton} type="button" onClick={() => setSelectedAuctionId(null)}>
            Назад
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.staffSection}>
      <h2 className={styles.sectionTitle}>Заявки на создание лотов</h2>
      <div className={styles.lotGrid}>
        {auctions.length === 0 && <p className={styles.panel__text}>Нет лотов в ожидании проверки.</p>}
        {auctions.map((auction) => (
          <AuctionCard
            auction={auction}
            key={auction.id}
            mode="moderation"
            onOpen={() => setSelectedAuctionId(auction.id)}
          />
        ))}
      </div>
    </section>
  );
}

export default AuctionQueue;
