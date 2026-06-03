import React from 'react';
import styles from './LoadingState.module.css';

function LoadingState({ text = 'Загрузка данных', compact = false }) {
  return (
    <span className={`${styles.loadingState} ${compact ? styles['loadingState--compact'] : ''}`} role="status" aria-live="polite">
      <span className={styles.loadingState__spinner} aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}

export default LoadingState;
