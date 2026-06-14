import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './CustomSelect.module.css';

function CustomSelect({
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel = '',
  className = '',
  error = false,
  searchable = false,
  searchPlaceholder = 'Поиск'
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef(null);
  const current = options.find((option) => option.value === value) || options[0];
  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return options;
    }

    return options.filter((option) => {
      const label = String(option.label || '').toLowerCase();
      const optionValue = String(option.value || '').toLowerCase();
      return label.includes(query) || optionValue.includes(query);
    });
  }, [options, search]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  return (
    <div
      className={`${styles.customSelect} ${open ? styles['customSelect--open'] : ''} ${error ? styles['customSelect--error'] : ''} ${className}`}
      ref={rootRef}
    >
      <button
        className={styles.customSelect__button}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((valueState) => {
            const nextOpen = !valueState;
            if (!nextOpen) {
              setSearch('');
            }
            return nextOpen;
          });
        }}
      >
        <span>{current?.label || 'Не выбрано'}</span>
      </button>
      {open && !disabled && (
        <div className={styles.customSelect__menu} role="listbox">
          {searchable && (
            <div className={styles.customSelect__search}>
              <input
                type="search"
                value={search}
                placeholder={searchPlaceholder}
                autoFocus
                onChange={(event) => setSearch(event.target.value)}
                onClick={(event) => event.stopPropagation()}
              />
            </div>
          )}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                className={option.value === value ? styles['customSelect__option--active'] : ''}
                type="button"
                role="option"
                aria-selected={option.value === value}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setSearch('');
                }}
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className={styles.customSelect__empty}>Ничего не найдено</div>
          )}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
