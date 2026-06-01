import React, { useMemo, useState } from 'react';
import styles from '../../App.module.css';
import AuctionCard from '../auction/AuctionCard.jsx';
import { formatDateTime } from '../../utils/formatters.js';
import AuctionDetails from './AuctionDetails.jsx';
import StaffListControls, { StaffPagination, paginateItems, sortByDate } from './StaffListControls.jsx';

const actionLabels = {
  approved: 'Одобрен',
  returned: 'Отклонен'
};

const filterOptions = [
  ['all', 'Все решения'],
  ['approved', 'Одобренные'],
  ['returned', 'Отклоненные']
];

function AuctionReviewList({ reviews, title, showModerator = true }) {
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [sort, setSort] = useState('newest');
  const [filters, setFilters] = useState(['approved', 'returned']);
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const selectedReview = reviews.find((review) => review.id === selectedReviewId);
  const toggleFilter = (value) => {
    setFilters((current) => {
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
      return next.length > 0 ? next : current;
    });
    setPage(1);
  };
  const filteredReviews = useMemo(
    () => reviews.filter((review) => filters.includes(review.action)),
    [filters, reviews]
  );
  const sortedReviews = useMemo(
    () => sortByDate(filteredReviews, sort, (review) => review.createdAt),
    [filteredReviews, sort]
  );
  const { pageItems, totalPages, safePage } = paginateItems(sortedReviews, page, limit);

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
        filters={filters}
        onFilterToggle={toggleFilter}
        filterOptions={filterOptions}
        limit={limit}
        onLimitChange={(value) => { setLimit(value); setPage(1); }}
      />
      <div className={styles.lotGrid}>
        {pageItems.length === 0 && <p className={styles.panel__text}>Журнал пока пуст.</p>}
        {pageItems.map((review) => {
          const snapshot = review.auctionSnapshot || review.auction;

          return (
            <AuctionCard
              auction={{
                ...snapshot,
                status: review.action === 'returned' ? 'returned' : snapshot.status,
                moderationComment: review.action === 'returned' ? review.comment || snapshot.moderationComment : snapshot.moderationComment
              }}
              footerMeta={`${formatDateTime(review.createdAt)}${showModerator ? `\n${review.moderator?.email || 'модератор не указан'}` : ''}`}
              key={review.id}
              mode="journal"
              onOpen={() => setSelectedReviewId(review.id)}
              statusOverride={actionLabels[review.action] || review.action}
            />
          );
        })}
      </div>
      <StaffPagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}

export default AuctionReviewList;
