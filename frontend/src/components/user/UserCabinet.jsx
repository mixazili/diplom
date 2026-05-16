import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from '../../App.module.css';
import { logout } from '../../features/auth/authSlice.js';
import { fetchMyVerification } from '../../features/verification/verificationSlice.js';
import { verificationStatusLabels } from '../../constants/verificationLabels.js';
import AuctionCreateForm from './auction/AuctionCreateForm.jsx';
import MyAuctions from './auction/MyAuctions.jsx';

const statusText = {
  draft: 'Заполните форму и отправьте заявку на проверку.',
  pending: 'Заявка отправлена и ожидает проверки модератором.',
  approved: 'Верификация одобрена. Можно создавать лоты и подавать их на проверку.',
  rejected: 'Заявка отклонена. Исправьте данные с учетом причины и отправьте форму повторно.'
};

const tabs = [
  { id: 'verification', label: 'Верификация' },
  { id: 'lots', label: 'Мои лоты' },
  { id: 'create-lot', label: 'Создать лот' }
];

function UserCabinet({ children }) {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((state) => state.auth);
  const { request } = useSelector((state) => state.verification);
  const [activeTab, setActiveTab] = useState('verification');

  useEffect(() => {
    if (accessToken) {
      dispatch(fetchMyVerification({ token: accessToken }));
    }
  }, [accessToken, dispatch]);

  const effectiveStatus = request?.status || user.verificationStatus || 'draft';
  const rejectionReason = request?.status === 'rejected' ? request.moderationComment : '';
  const shouldShowVerificationForm = !['approved', 'pending'].includes(effectiveStatus);
  const canCreateLot = effectiveStatus === 'approved';
  const statusLabel = useMemo(
    () => verificationStatusLabels[effectiveStatus] || effectiveStatus,
    [effectiveStatus]
  );

  const renderActiveTab = () => {
    if (activeTab === 'lots') {
      return <MyAuctions />;
    }

    if (activeTab === 'create-lot') {
      if (!canCreateLot) {
        return (
          <section className={styles.panel}>
            <p className={styles.panel__text}>Создание лотов доступно только после одобрения верификации.</p>
          </section>
        );
      }

      return <AuctionCreateForm verification={request} />;
    }

    if (shouldShowVerificationForm) {
      return children;
    }

    return (
      <section className={styles.panel}>
        <p className={styles.panel__text}>
          {effectiveStatus === 'approved'
            ? 'Верификация уже одобрена. Повторно заполнять форму не нужно.'
            : 'Заявка на верификацию уже ожидает проверки.'}
        </p>
      </section>
    );
  };

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

      <nav className={styles.cabinetTabs} aria-label="Разделы личного кабинета">
        {tabs.map((tab) => (
          <button
            className={`${styles.cabinetTabs__button} ${activeTab === tab.id ? styles['cabinetTabs__button--active'] : ''}`}
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {renderActiveTab()}
    </div>
  );
}

export default UserCabinet;
