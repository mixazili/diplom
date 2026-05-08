import React, { useState } from 'react';
import styles from '../../App.module.css';
import { accountTypeLabels, verificationStatusLabels } from '../../constants/verificationLabels.js';
import StaffCard from './StaffCard.jsx';
import VerificationDetails from './VerificationDetails.jsx';

function VerificationQueue({ verifications, onApprove, onReject }) {
  const [comments, setComments] = useState({});

  const updateComment = (id, value) => {
    setComments((current) => ({ ...current, [id]: value }));
  };

  return (
    <section className={styles.staffSection}>
      <h2 className={styles.sectionTitle}>Заявки на верификацию</h2>
      <div className={styles.staffList}>
        {verifications.length === 0 && <p className={styles.panel__text}>Нет заявок в ожидании.</p>}
        {verifications.map((verification) => (
          <StaffCard
            key={verification.id}
            title={verification.user?.email || 'Пользователь'}
            meta={`${accountTypeLabels[verification.accountType] || verification.accountType} · ${verification.isResident ? 'резидент РБ' : 'нерезидент РБ'} · ${new Date(verification.submittedAt).toLocaleString()}`}
            status={verificationStatusLabels[verification.status] || verification.status}
            actions={(
              <div className={styles.staffActions}>
                <textarea
                  className={styles.field__control}
                  value={comments[verification.id] || ''}
                  onChange={(event) => updateComment(verification.id, event.target.value)}
                  placeholder="Комментарий для пользователя при отклонении или внутренняя заметка"
                />
                <button className={styles.button} type="button" onClick={() => onApprove(verification.id, comments[verification.id] || '')}>
                  Одобрить
                </button>
                <button className={styles.buttonDanger} type="button" onClick={() => onReject(verification.id, comments[verification.id] || '')}>
                  Отклонить
                </button>
              </div>
            )}
          >
            <VerificationDetails verification={verification} />
          </StaffCard>
        ))}
      </div>
    </section>
  );
}

export default VerificationQueue;
