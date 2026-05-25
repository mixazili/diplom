import React from 'react';
import styles from '../../App.module.css';
import { verificationStatusLabels } from '../../constants/verificationLabels.js';
import { formatDateTime, getVerificationTitle } from '../../utils/formatters.js';
import StaffCard from './StaffCard.jsx';
import VerificationDetails from './VerificationDetails.jsx';

function ReviewList({ reviews, title, showModerator = true }) {
  return (
    <section className={styles.staffSection}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.staffList}>
        {reviews.length === 0 && <p className={styles.panel__text}>Журнал пока пуст.</p>}
        {reviews.map((review) => (
          <StaffCard
            key={review.id}
            title={getVerificationTitle(review.verificationRequest)}
            meta={`${formatDateTime(review.createdAt)}${showModerator ? ` · модератор: ${review.moderator?.email || 'не указан'}` : ''}`}
            status={verificationStatusLabels[review.action] || review.action}
          >
            {review.action === 'rejected' && (
              <div className={styles.decisionNotice}>
                <strong>Статус: отклонена</strong>
                {showModerator && review.moderator?.email && <span>Модератор: {review.moderator.email}</span>}
                <p>Комментарий модератора: {review.comment || 'Не указан'}</p>
              </div>
            )}
            <VerificationDetails verification={review.verificationRequest} />
          </StaffCard>
        ))}
      </div>
    </section>
  );
}

export default ReviewList;
