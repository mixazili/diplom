import React, { useState } from 'react';
import styles from '../../App.module.css';
import AuctionCard from '../auction/AuctionCard.jsx';
import { formatDateTime } from '../../utils/formatters.js';
import AuctionDetails from './AuctionDetails.jsx';

const actionLabels = {
  approved: 'Одобрен',
  returned: 'Отклонен'
};

function AuctionReviewList({ reviews, title, showModerator = true }) {
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const selectedReview = reviews.find((review) => review.id === selectedReviewId);

  if (selectedReview) {
    const snapshot = selectedReview.auctionSnapshot || selectedReview.auction;

    return (
      <section className={styles.staffSection}>
        <button className={styles.backButton} type="button" onClick={() => setSelectedReviewId(null)}>
          ← Назад
        </button>
        {selectedReview.action === 'returned' && (
          <div className={styles.decisionNotice}>
            <strong>Статус: отклонен</strong>
            {showModerator && selectedReview.moderator?.email && <span>Модератор: {selectedReview.moderator.email}</span>}
            <p>Комментарий модератора: {selectedReview.comment || 'Не указан'}</p>
          </div>
        )}
        <AuctionDetails auction={snapshot} />
        <div className={styles.staffCancelActions}>
          <button className={styles.backButton} type="button" onClick={() => setSelectedReviewId(null)}>
            Назад
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.staffSection}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.lotGrid}>
        {reviews.length === 0 && <p className={styles.panel__text}>Журнал пока пуст.</p>}
        {reviews.map((review) => {
          const snapshot = review.auctionSnapshot || review.auction;

          return (
            <AuctionCard
              auction={snapshot}
              footerMeta={`${formatDateTime(review.createdAt)}${showModerator ? ` · модератор: ${review.moderator?.email || 'не указан'}` : ''}`}
              key={review.id}
              mode="journal"
              onOpen={() => setSelectedReviewId(review.id)}
              statusOverride={actionLabels[review.action] || review.action}
            />
          );
        })}
      </div>
    </section>
  );
}

export default AuctionReviewList;
