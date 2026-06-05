import React from 'react';
import CustomSelect from '../../ui/CustomSelect.jsx';
import styles from './CabinetAuctionControls.module.css';

export const pageSizeOptions = [20, 40, 60];

export const sortOptions = [
  { value: 'newest', label: 'Более новые' },
  { value: 'oldest', label: 'Более старые' }
];

export const toggleRequiredValue = (values, value) => {
  const nextValues = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  return nextValues.length > 0 ? nextValues : values;
};

export const toggleRequiredGroupValues = (values, groupValues) => {
  const allSelected = groupValues.every((value) => values.includes(value));
  const nextValues = allSelected
    ? values.filter((value) => !groupValues.includes(value))
    : [...new Set([...values, ...groupValues])];

  return nextValues.length > 0 ? nextValues : values;
};

export const getPaginationPages = (currentPage, totalPages) => {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage]);
  for (let offset = 1; offset <= 3; offset += 1) {
    if (currentPage - offset > 1) {
      pages.add(currentPage - offset);
    }
    if (currentPage + offset < totalPages) {
      pages.add(currentPage + offset);
    }
  }

  return [...pages].sort((left, right) => left - right);
};

function FilterOption({ selected, children, onClick }) {
  return (
    <button
      className={`${styles.filterOption} ${selected ? styles['filterOption--selected'] : ''}`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function CompactFilterGroup({ group, selectedValues, onChange }) {
  const selectedCount = group.values.filter((value) => selectedValues.includes(value)).length;
  const allSelected = selectedCount === group.values.length;
  const hasSelection = selectedCount > 0;

  if (group.values.length === 1) {
    const [value, label] = group.options[0] || [group.values[0], group.label];
    return (
      <FlatFilterChoice selected={selectedValues.includes(value)} onClick={() => onChange((current) => toggleRequiredValue(current, value))}>
        {label || group.label}
      </FlatFilterChoice>
    );
  }

  return (
    <div className={styles.filterGroup}>
      <button
        className={[
          styles.filterGroup__button,
          hasSelection ? styles['filterGroup__button--selected'] : ''
        ].filter(Boolean).join(' ')}
        type="button"
        onClick={() => onChange((current) => toggleRequiredGroupValues(current, group.values))}
      >
        <span>{group.label}</span>
        {hasSelection && <small>{selectedCount}/{group.values.length}</small>}
      </button>
      <div className={styles.filterGroup__popover}>
        {group.options.map(([value, label]) => (
          <FilterOption
            key={value}
            selected={selectedValues.includes(value)}
            onClick={() => onChange((current) => toggleRequiredValue(current, value))}
          >
            {label}
          </FilterOption>
        ))}
      </div>
    </div>
  );
}

export function FlatFilterChoice({ selected, children, onClick }) {
  return (
    <button
      className={`${styles.flatChoice} ${selected ? styles['flatChoice--selected'] : ''}`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function CabinetFilterPanel({ children, sort, onSortChange, limit, onLimitChange }) {
  return (
    <div className={styles.filterPanel}>
      <div className={styles.filterPanel__grid}>{children}</div>
      <div className={styles.listControls}>
        <label>
          <span>Сортировка</span>
          <CustomSelect value={sort} options={sortOptions} onChange={onSortChange} />
        </label>
        <label>
          <span>Аукционов на странице</span>
          <CustomSelect
            value={limit}
            options={pageSizeOptions.map((value) => ({ value, label: String(value) }))}
            onChange={(value) => onLimitChange(Number(value))}
          />
        </label>
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = getPaginationPages(page, totalPages);

  return (
    <div className={styles.pagination}>
      <button
        className={styles.pagination__button}
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Назад
      </button>
      {pages.map((item) => (
        <button
          className={`${styles.pagination__page} ${item === page ? styles['pagination__page--active'] : ''}`}
          type="button"
          key={item}
          onClick={() => onPageChange(item)}
        >
          {item}
        </button>
      ))}
      <button
        className={styles.pagination__button}
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Вперед
      </button>
    </div>
  );
}
