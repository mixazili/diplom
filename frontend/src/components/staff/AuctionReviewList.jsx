import React from 'react';
import styles from '../../App.module.css';
import { auctionCategoryLabels } from '../../constants/auctionConstants.js';
import AuctionDetails from './AuctionDetails.jsx';
import StaffCard from './StaffCard.jsx';

const actionLabels = {
  approved: 'Одобрен',
  returned: 'Возвращен на доработку'
};

function AuctionReviewList({ reviews, title }) {
  return (
    <section className={styles.staffSection}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.staffList}>
        {reviews.length === 0 && <p className={styles.panel__text}>Журнал пока пуст.</p>}
        {reviews.map((review) => {
          const snapshot = review.auctionSnapshot || review.auction;
          const category = auctionCategoryLabels[snapshot?.item?.category] || snapshot?.item?.category || 'категория не указана';

          return (
            <StaffCard
              key={review.id}
              title={`${actionLabels[review.action] || review.action}: ${snapshot?.item?.title || 'лот'}`}
              meta={`${new Date(review.createdAt).toLocaleString()} · модератор: ${review.moderator?.email || 'не указан'} · ${category}`}
              status={actionLabels[review.action] || review.action}
            >
              {review.comment && <p className={styles.staffCard__comment}>{review.comment}</p>}
              <AuctionDetails auction={snapshot} />
            </StaffCard>
          );
        })}
      </div>
    </section>
  );
}

export default AuctionReviewList;
