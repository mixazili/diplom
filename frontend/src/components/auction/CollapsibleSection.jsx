import React, { useState } from 'react';
import styles from '../../App.module.css';

function CollapsibleSection({ title, children, defaultOpen = false, className = '' }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`${styles.auctionBlock} ${styles.collapsibleSection} ${className}`}>
      <button
        className={styles.collapsibleSection__toggle}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className={styles.collapsibleSection__icon}>{open ? '−' : '+'}</span>
      </button>
      {open && <div className={styles.collapsibleSection__content}>{children}</div>}
    </section>
  );
}

export default CollapsibleSection;
