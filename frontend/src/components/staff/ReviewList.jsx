import React, { useMemo } from 'react';
import { verificationStatusLabels } from '../../constants/verificationLabels.js';
import { formatDateTime, getVerificationTitle } from '../../utils/formatters.js';
import StaffCard from './StaffCard.jsx';
import StaffListControls, { StaffPagination, paginateItems, sortByDate } from './StaffListControls.jsx';
import VerificationDetails from './VerificationDetails.jsx';
import usePersistedState from '../../hooks/usePersistedState.js';
import styles from './ReviewList.module.css';

const filterOptions = [
  ['all', 'Все решения'],
  ['approved', 'Одобренные'],
  ['rejected', 'Отклоненные']
];

function ReviewList({ reviews, title, showModerator = true }) {
  const storagePrefix = showModerator ? 'auction.staff.verificationReviews.all' : 'auction.staff.verificationReviews.mine';
  const [sort, setSort] = usePersistedState(`${storagePrefix}.sort`, 'newest');
  const [filters, setFilters] = usePersistedState(`${storagePrefix}.filters`, ['approved', 'rejected']);
  const [limit, setLimit] = usePersistedState(`${storagePrefix}.limit`, 20);
  const [page, setPage] = usePersistedState(`${storagePrefix}.page`, 1);
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
      <div className={styles.staffList}>
        {pageItems.length === 0 && <p className={styles.panel__text}>Журнал пока пуст.</p>}
        {pageItems.map((review) => (
          <StaffCard
            key={review.id}
            title={getVerificationTitle(review.verificationRequest)}
            meta={`${formatDateTime(review.createdAt)}${showModerator ? ` · модератор: ${review.moderator?.email || 'не указан'}` : ''}`}
            status={verificationStatusLabels[review.action] || review.action}
            statusTone={review.action === 'approved' ? 'approved' : review.action === 'rejected' ? 'rejected' : ''}
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
      <StaffPagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}

export default ReviewList;
