import React from 'react';
import styles from '../../App.module.css';
import { verificationStatusLabels } from '../../constants/verificationLabels.js';
import StaffCard from './StaffCard.jsx';
import VerificationDetails from './VerificationDetails.jsx';

function ReviewList({ reviews, title }) {
  return (
    <section className={styles.staffSection}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.staffList}>
        {reviews.length === 0 && <p className={styles.panel__text}>Журнал пока пуст.</p>}
        {reviews.map((review) => (
          <StaffCard
            key={review.id}
            title={`${verificationStatusLabels[review.action] || review.action}: ${review.user?.email || 'пользователь'}`}
            meta={`${new Date(review.createdAt).toLocaleString()} · модератор: ${review.moderator?.email || 'не указан'}`}
            status={verificationStatusLabels[review.action] || review.action}
          >
            {review.comment && <p className={styles.staffCard__comment}>{review.comment}</p>}
            <VerificationDetails verification={review.verificationRequest} />
          </StaffCard>
        ))}
      </div>
    </section>
  );
}

export default ReviewList;
