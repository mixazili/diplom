import React, { useEffect, useRef, useState } from 'react';
import styles from './CustomSelect.module.css';

function CustomSelect({ value, options, onChange, disabled = false, ariaLabel = '', className = '', error = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const current = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
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
        onClick={() => setOpen((valueState) => !valueState)}
      >
        <span>{current?.label || 'Не выбрано'}</span>
      </button>
      {open && !disabled && (
        <div className={styles.customSelect__menu} role="listbox">
          {options.map((option) => (
            <button
              className={option.value === value ? styles['customSelect__option--active'] : ''}
              type="button"
              role="option"
              aria-selected={option.value === value}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
