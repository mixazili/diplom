import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from '../../App.module.css';
import { logout } from '../../features/auth/authSlice.js';
import { fetchMyVerification } from '../../features/verification/verificationSlice.js';
import { verificationStatusLabels } from '../../constants/verificationLabels.js';

const statusText = {
  draft: 'Заполните форму и отправьте заявку на проверку.',
  pending: 'Заявка отправлена и ожидает проверки модератором.',
  approved: 'Верификация одобрена. Повторно заполнять форму не нужно.',
  rejected: 'Заявка отклонена. Исправьте данные с учетом причины и отправьте форму повторно.'
};

function UserCabinet({ children }) {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((state) => state.auth);
  const { request } = useSelector((state) => state.verification);

  useEffect(() => {
    if (accessToken) {
      dispatch(fetchMyVerification({ token: accessToken }));
    }
  }, [accessToken, dispatch]);

  const effectiveStatus = request?.status || user.verificationStatus || 'draft';
  const rejectionReason = request?.status === 'rejected' ? request.moderationComment : '';
  const shouldShowForm = !['approved', 'pending'].includes(effectiveStatus);
  const statusLabel = useMemo(
    () => verificationStatusLabels[effectiveStatus] || effectiveStatus,
    [effectiveStatus]
  );

  return (
    <div className={styles.cabinet}>
      <section className={styles.summary}>
        <div>
          <p className={styles.summary__label}>Аккаунт</p>
          <h2 className={styles.summary__title}>{user.email}</h2>
          <p className={styles.summary__text}>
            Роль: {user.role} · Email подтвержден · Верификация: {statusLabel}
          </p>
        </div>
        <button className={styles.buttonSecondary} type="button" onClick={() => dispatch(logout())}>
          Выйти
        </button>
      </section>

      <section className={styles.statusPanel}>
        <span className={styles.statusPanel__badge}>{statusLabel}</span>
        <p className={styles.statusPanel__text}>{statusText[effectiveStatus] || statusText.draft}</p>
        {rejectionReason && (
          <div className={styles.statusPanel__reason}>
            <strong>Причина отклонения</strong>
            <p>{rejectionReason}</p>
          </div>
        )}
      </section>

      {shouldShowForm && children}
    </div>
  );
}

export default UserCabinet;
