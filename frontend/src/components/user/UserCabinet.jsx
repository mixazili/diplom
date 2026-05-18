import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from '../../App.module.css';
import { logout } from '../../features/auth/authSlice.js';
import { fetchMyVerification } from '../../features/verification/verificationSlice.js';
import AuctionCreateForm from './auction/AuctionCreateForm.jsx';
import MyAuctions from './auction/MyAuctions.jsx';
import VerificationForm from './VerificationForm.jsx';

const statusText = {
  draft: 'Верификация не пройдена. Заполните форму и отправьте заявку на проверку.',
  pending: 'Заявка отправлена и ожидает проверки модератором.',
  approved: 'Верификация пройдена. Можно создавать лоты и подавать их на проверку.',
  rejected: 'Верификация не пройдена. Заявка отклонена, исправьте данные с учетом причины и отправьте форму повторно.'
};

function UserCabinet() {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((state) => state.auth);
  const { request } = useSelector((state) => state.verification);
  const [activeSection, setActiveSection] = useState('profile');

  useEffect(() => {
    if (accessToken) {
      dispatch(fetchMyVerification({ token: accessToken }));
    }
  }, [accessToken, dispatch]);

  const effectiveStatus = request?.status || user.verificationStatus || 'draft';
  const rejectionReason = request?.status === 'rejected' ? request.moderationComment : '';
  const isApproved = effectiveStatus === 'approved';
  const isPending = effectiveStatus === 'pending';
  const shouldShowVerificationForm = !isApproved && !isPending;
  const canCreateLot = isApproved;
  const showProfile = () => setActiveSection('profile');
  const showVerification = () => setActiveSection('verification');
  const showLots = () => setActiveSection('lots');
  const showCreateLot = () => setActiveSection('create-lot');

  const renderProfile = () => (
    <section className={`${styles.statusPanel} ${isApproved ? styles.statusPanelSuccess : styles.statusPanelWarning}`}>
      <p className={styles.panel__eyebrow}>Профиль</p>
      <h1 className={styles.profileStatus__title}>
        {isApproved ? 'Верификация пройдена' : 'Верификация не пройдена'}
      </h1>
      <p className={styles.profileStatus__email}>{user.email}</p>
    </section>
  );

  const renderVerification = () => (
    <div className={styles.cabinetContent}>
      {shouldShowVerificationForm ? (
        <>
          <section className={styles.statusPanel}>
            <p className={styles.statusPanel__text}>{statusText[effectiveStatus] || statusText.draft}</p>
            {rejectionReason && (
              <div className={styles.statusPanel__reason}>
                <strong>Причина отклонения</strong>
                <p>{rejectionReason}</p>
              </div>
            )}
          </section>
          <VerificationForm />
        </>
      ) : (
        <section className={styles.panel}>
          <p className={styles.panel__text}>
            {isPending
              ? 'Заявка на верификацию уже ожидает проверки.'
              : 'Верификация пройдена. Форма повторной подачи скрыта.'}
          </p>
        </section>
      )}
    </div>
  );

  const renderLots = () => (
    <div className={styles.cabinetContent}>
      <section className={styles.panel}>
        <div className={styles.panel__header}>
          <p className={styles.panel__eyebrow}>Личный кабинет</p>
          <h1 className={styles.panel__title}>Мои лоты</h1>
          <p className={styles.panel__text}>Список заявок на создание лотов и их текущие статусы.</p>
        </div>
        <button className={styles.button} type="button" onClick={showCreateLot} disabled={!canCreateLot}>
          Создать лот
        </button>
        {!canCreateLot && (
          <p className={styles.message__error}>Создание лота доступно только после одобрения верификации.</p>
        )}
      </section>
      <MyAuctions />
    </div>
  );

  const renderCreateLot = () => {
    if (!canCreateLot) {
      return (
        <section className={styles.panel}>
          <p className={styles.panel__text}>Создание лотов доступно только после одобрения верификации.</p>
        </section>
      );
    }

    return <AuctionCreateForm verification={request} />;
  };

  return (
    <div className={styles.cabinetLayout}>
      <aside className={styles.cabinetSidebar}>
        <p className={styles.cabinetSidebar__title}>Личный кабинет</p>
        <button
          className={`${styles.cabinetSidebar__button} ${activeSection === 'profile' ? styles['cabinetSidebar__button--active'] : ''}`}
          type="button"
          onClick={showProfile}
        >
          Профиль
        </button>
        <button
          className={`${styles.cabinetSidebar__button} ${activeSection === 'verification' ? styles['cabinetSidebar__button--active'] : ''}`}
          type="button"
          onClick={showVerification}
        >
          Верификация
        </button>
        <button
          className={`${styles.cabinetSidebar__button} ${['lots', 'create-lot'].includes(activeSection) ? styles['cabinetSidebar__button--active'] : ''}`}
          type="button"
          onClick={showLots}
        >
          Мои лоты
        </button>
        <button className={styles.cabinetSidebar__button} type="button" onClick={() => dispatch(logout())}>
          Выйти
        </button>
      </aside>

      <div className={styles.cabinetMain}>
        {activeSection === 'profile' && renderProfile()}
        {activeSection === 'verification' && renderVerification()}
        {activeSection === 'lots' && renderLots()}
        {activeSection === 'create-lot' && renderCreateLot()}
      </div>
    </div>
  );
}

export default UserCabinet;
