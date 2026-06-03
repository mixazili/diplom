import React, { useEffect } from 'react';
import CustomSelect from '../ui/CustomSelect.jsx';
import styles from './StaffListControls.module.css';

export const pageSizeOptions = [20, 40, 60];

export const getPaginationPages = (current, total) => {
  if (total <= 9) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set([1, total, current]);
  for (let offset = -3; offset <= 3; offset += 1) {
    const page = current + offset;
    if (page > 1 && page < total) {
      pages.add(page);
    }
  }

  return [...pages].sort((left, right) => left - right);
};

export const sortByDate = (items, sort, getDate) =>
  [...items].sort((left, right) => {
    const leftTime = new Date(getDate(left) || 0).getTime();
    const rightTime = new Date(getDate(right) || 0).getTime();
    return sort === 'newest' ? rightTime - leftTime : leftTime - rightTime;
  });

export const paginateItems = (items, page, limit) => {
  const totalPages = Math.max(1, Math.ceil(items.length / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * limit;
  return {
    totalPages,
    safePage,
    pageItems: items.slice(start, start + limit)
  };
};

function StaffListControls({ sort, onSortChange, limit, onLimitChange, filters = [], onFilterToggle, filterOptions = [] }) {
  const decisionOptions = filterOptions.filter(([value]) => value !== 'all');

  return (
    <div className={`${styles.catalogToolbar} ${styles.staffToolbar} ${decisionOptions.length === 0 ? styles['staffToolbar--simple'] : ''}`}>
      <label>
        <span>Сортировка</span>
        <CustomSelect
          value={sort}
          options={[
            { value: 'oldest', label: 'Более старые' },
            { value: 'newest', label: 'Более новые' }
          ]}
          onChange={onSortChange}
        />
      </label>
      {decisionOptions.length > 0 && (
        <div className={styles.staffDecisionFilter}>
          <div className={styles.staffDecisionFilter__options}>
            {decisionOptions.map(([value, label]) => (
              <label className={`${styles.checkRow} ${styles.filterChoice}`} key={value}>
                <input
                  type="checkbox"
                  checked={filters.includes(value)}
                  onChange={() => onFilterToggle(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <label>
        <span>Заявок на странице</span>
        <CustomSelect
          value={limit}
          options={pageSizeOptions.map((value) => ({ value, label: String(value) }))}
          onChange={(value) => onLimitChange(Number(value))}
        />
      </label>
    </div>
  );
}

export function StaffPagination({ page, totalPages, onPageChange }) {
  useEffect(() => {
    if (page > totalPages) {
      onPageChange(totalPages);
    }
  }, [onPageChange, page, totalPages]);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className={styles.pagination} aria-label="Пагинация списка">
      <button className={styles.pagination__button} type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Назад
      </button>
      {getPaginationPages(page, totalPages).map((item) => (
        <button
          className={`${styles.pagination__page} ${item === page ? styles['pagination__page--active'] : ''}`}
          type="button"
          key={item}
          onClick={() => onPageChange(item)}
          aria-current={item === page ? 'page' : undefined}
        >
          {item}
        </button>
      ))}
      <button className={styles.pagination__button} type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Вперед
      </button>
    </nav>
  );
}

export default StaffListControls;
