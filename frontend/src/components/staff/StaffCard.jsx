import React, { useState } from 'react';
import styles from '../../App.module.css';

function StaffCard({ title, meta, status, children, actions }) {
  const [open, setOpen] = useState(false);

  return (
    <article className={styles.staffCard}>
      <button className={styles.staffCard__head} type="button" onClick={() => setOpen((value) => !value)}>
        <span>
          <strong>{title}</strong>
          <small>{meta}</small>
        </span>
        {status && <span className={styles.staffCard__badge}>{status}</span>}
      </button>
      {open && (
        <div className={styles.staffCard__body}>
          {children}
          {actions}
        </div>
      )}
    </article>
  );
}

export default StaffCard;
