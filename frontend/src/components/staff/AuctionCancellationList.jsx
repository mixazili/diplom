import React, { useMemo, useState } from 'react';
import AuctionCard from '../auction/AuctionCard.jsx';
import { formatDateTime } from '../../utils/formatters.js';
import AuctionDetails from './AuctionDetails.jsx';
import StaffListControls, { StaffPagination, paginateItems, sortByDate } from './StaffListControls.jsx';
import usePersistedState from '../../hooks/usePersistedState.js';
import styles from './AuctionReviewList.module.css';

function AuctionCancellationList({ reviews, title, showModerator = true }) {
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const storagePrefix = showModerator ? 'auction.staff.auctionCancellations.all' : 'auction.staff.auctionCancellations.mine';
  const [sort, setSort] = usePersistedState(`${storagePrefix}.sort`, 'newest');
  const [limit, setLimit] = usePersistedState(`${storagePrefix}.limit`, 20);
  const [page, setPage] = usePersistedState(`${storagePrefix}.page`, 1);
  const selectedReview = reviews.find((review) => review.id === selectedReviewId);
  const sortedReviews = useMemo(
    () => sortByDate(reviews, sort, (review) => review.createdAt),
    [reviews, sort]
  );
  const { pageItems, totalPages, safePage } = paginateItems(sortedReviews, page, limit);

  if (selectedReview) {
    const snapshot = selectedReview.auctionSnapshot || selectedReview.auction;

    return (
      <section className={styles.staffSection}>
        <button className={styles.backButton} type="button" onClick={() => setSelectedReviewId(null)}>
          ← Назад
        </button>
        <div className={styles.decisionNotice}>
          <strong>Статус: отменен</strong>
          {showModerator && selectedReview.moderator?.email && <span>Модератор: {selectedReview.moderator.email}</span>}
          <p>Комментарий модератора: {selectedReview.comment || 'Не указан'}</p>
        </div>
        <AuctionDetails auction={{ ...snapshot, status: 'cancelled', resultReason: selectedReview.comment || snapshot.resultReason }} />
        <div className={styles.staffCancelActions}>
          <button className={styles.backButton} type="button" onClick={() => setSelectedReviewId(null)}>
            ← Назад
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.staffSection}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <StaffListControls
        sort={sort}
        onSortChange={(value) => { setSort(value); setPage(1); }}
        limit={limit}
        onLimitChange={(value) => { setLimit(value); setPage(1); }}
      />
      <div className={styles.auctionGrid}>
        {pageItems.length === 0 && <p className={styles.panel__text}>Журнал отмен пока пуст.</p>}
        {pageItems.map((review) => {
          const snapshot = review.auctionSnapshot || review.auction;

          return (
            <AuctionCard
              auction={{
                ...snapshot,
                status: 'cancelled',
                resultReason: review.comment || snapshot.resultReason,
                moderationComment: review.comment || snapshot.moderationComment
              }}
              footerMeta={`${formatDateTime(review.createdAt)}${showModerator ? `\n${review.moderator?.email || 'модератор не указан'}` : ''}`}
              key={review.id}
              mode="journal"
              onOpen={() => setSelectedReviewId(review.id)}
              statusOverride="Отменен"
            />
          );
        })}
      </div>
      <StaffPagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}

export default AuctionCancellationList;
