import React, { useMemo, useState } from 'react';
import styles from '../../App.module.css';
import { accountTypeLabels, verificationStatusLabels } from '../../constants/verificationLabels.js';
import { formatDateTime, getVerificationTitle } from '../../utils/formatters.js';
import StaffCard from './StaffCard.jsx';
import StaffListControls, { StaffPagination, paginateItems, sortByDate } from './StaffListControls.jsx';
import VerificationDetails from './VerificationDetails.jsx';

function VerificationQueue({ verifications, onApprove, onReject }) {
  const [comments, setComments] = useState({});
  const [sort, setSort] = useState('oldest');
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);

  const updateComment = (id, value) => {
    setComments((current) => ({ ...current, [id]: value }));
  };

  const sortedVerifications = useMemo(
    () => sortByDate(verifications, sort, (verification) => verification.submittedAt || verification.createdAt),
    [sort, verifications]
  );
  const { pageItems, totalPages, safePage } = paginateItems(sortedVerifications, page, limit);

  return (
    <section className={styles.staffSection}>
      <h2 className={styles.sectionTitle}>Заявки на верификацию</h2>
      <StaffListControls sort={sort} onSortChange={(value) => { setSort(value); setPage(1); }} limit={limit} onLimitChange={(value) => { setLimit(value); setPage(1); }} />
      <div className={styles.staffList}>
        {pageItems.length === 0 && <p className={styles.panel__text}>Нет заявок в ожидании.</p>}
        {pageItems.map((verification) => (
          <StaffCard
            key={verification.id}
            title={getVerificationTitle(verification)}
            meta={`${accountTypeLabels[verification.accountType] || verification.accountType} · ${verification.isResident ? 'резидент РБ' : 'нерезидент РБ'} · ${formatDateTime(verification.submittedAt)}`}
            status={verificationStatusLabels[verification.status] || verification.status}
            actions={(
              <div className={styles.staffActions}>
                <textarea
                  className={styles.field__control}
                  value={comments[verification.id] || ''}
                  onChange={(event) => updateComment(verification.id, event.target.value)}
                  placeholder="Комментарий для пользователя при отклонении или внутренняя заметка"
                />
                <div className={styles.staffDecisionButtons}>
                  <button className={styles.buttonSecondary} type="button" onClick={() => onApprove(verification.id, comments[verification.id] || '')}>
                    Одобрить
                  </button>
                  <button className={styles.buttonDanger} type="button" onClick={() => onReject(verification.id, comments[verification.id] || '')}>
                    Отклонить
                  </button>
                </div>
              </div>
            )}
          >
            <VerificationDetails verification={verification} />
          </StaffCard>
        ))}
      </div>
      <StaffPagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}

export default VerificationQueue;
