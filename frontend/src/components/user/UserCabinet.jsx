import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { changePassword, logout } from '../../features/auth/authSlice.js';
import { fetchMyVerification } from '../../features/verification/verificationSlice.js';
import AuctionCreateForm from './auction/AuctionCreateForm.jsx';
import MyAuctions from './auction/MyAuctions.jsx';
import MyChats from './chat/MyChats.jsx';
import MyFavorites from './auction/MyFavorites.jsx';
import MyParticipations from './auction/MyParticipations.jsx';
import MyWins from './auction/MyWins.jsx';
import VerificationForm from './VerificationForm.jsx';
import styles from './UserCabinet.module.css';

const verificationStatus = {
  draft: {
    label: 'Верификация не пройдена',
    tone: 'danger',
    text: 'Без верификации нельзя участвовать в торгах и запускать свои аукционы.'
  },
  pending: {
    label: 'Верификация ожидает проверки',
    tone: 'warning',
    text: 'Заявка отправлена модератору. После отправки форма недоступна до решения.'
  },
  approved: {
    label: 'Верификация пройдена',
    tone: 'success',
    text: 'Можно участвовать в торгах и подавать аукционы на проверку.'
  },
  rejected: {
    label: 'Верификация отклонена',
    tone: 'danger',
    text: 'Исправьте данные с учетом причины отклонения и отправьте заявку повторно.'
  }
};

function ConfirmModal({ onClose, onConfirm }) {
  return (
    <div className={styles.modalBackdrop} role="presentation">
      <div className={styles.modal} role="dialog" aria-modal="true">
        <h2>Выйти из аккаунта?</h2>
        <p>Текущая сессия будет завершена на этом устройстве.</p>
        <div className={styles.modal__actions}>
          <button className={styles.buttonSecondary} type="button" onClick={onClose}>Отмена</button>
          <button className={styles.buttonDanger} type="button" onClick={onConfirm}>Выйти</button>
        </div>
      </div>
    </div>
  );
}

function UserCabinet({
  actionVersion = 0,
  initialSection = '',
  timeOffsetMs = 0,
  onApplyAuction,
  onOpenAuction,
  onPayDepositAuction,
  onPayLotAuction,
  onOpenProtocolAuction,
  onToggleFavoriteAuction
}) {
  const dispatch = useDispatch();
  const { accessToken, user, status: authStatus, errors: authErrors } = useSelector((state) => state.auth);
  const { request } = useSelector((state) => state.verification);
  const [activeSection, setActiveSection] = useState('profile');
  const [editingAuction, setEditingAuction] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', passwordRepeat: '' });
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!initialSection) {
      setActiveSection('profile');
      return;
    }

    if (['profile', 'auctions', 'participations', 'wins', 'favorites', 'notifications', 'chats'].includes(initialSection)) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  useEffect(() => {
    if (accessToken) {
      dispatch(fetchMyVerification({ token: accessToken }));
    }
  }, [accessToken, dispatch]);

  const effectiveStatus = request?.status || user.verificationStatus || 'draft';
  const statusConfig = verificationStatus[effectiveStatus] || verificationStatus.draft;
  const canCreateAuction = effectiveStatus === 'approved';
  const canShowVerificationForm = !['approved', 'pending'].includes(effectiveStatus);
  const rejectionReason = effectiveStatus === 'rejected' ? request?.moderationComment : '';

  const submitPassword = (event) => {
    event.preventDefault();
    setPasswordError('');

    if (passwordForm.password !== passwordForm.passwordRepeat) {
      setPasswordError('Пароли не совпадают');
      return;
    }

    dispatch(changePassword({ password: passwordForm.password })).then((result) => {
      if (!result.error) {
        setPasswordForm({ password: '', passwordRepeat: '' });
      }
    });
  };

  const openCreateAuction = () => {
    setEditingAuction(null);
    setActiveSection('create-auction');
  };

  const openVerificationForm = () => {
    setActiveSection('verification-form');
  };

  const openEditAuction = (auction) => {
    setEditingAuction(auction);
    setActiveSection('create-auction');
  };

  const closeAuctionForm = () => {
    setEditingAuction(null);
    setActiveSection('auctions');
  };

  const closeVerificationForm = () => {
    setActiveSection('profile');
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    dispatch(logout());
  };

  const renderProfile = () => (
    <div className={styles.cabinetContent}>
      <section className={styles.panel}>
        <h1 className={styles.panel__title}>Профиль</h1>
        <div className={styles.profileStack}>
          <div className={styles.profileLine}>
            <span>Email</span>
            <strong>{user.email}</strong>
          </div>

          <div className={styles.verificationSummary}>
            <div className={styles.verificationSummary__status}>
              <strong className={`${styles.statusBadge} ${styles[`statusBadge--${statusConfig.tone}`]}`}>
                {statusConfig.label}
              </strong>
              {rejectionReason && <p className={styles.message__error}>Причина отказа: {rejectionReason}</p>}
            </div>
            {canShowVerificationForm && (
              <button className={styles.button} type="button" onClick={openVerificationForm}>
                Пройти верификацию
              </button>
            )}
            <p className={styles.verificationSummary__text}>{statusConfig.text}</p>
          </div>
        </div>

        <form className={styles.passwordForm} onSubmit={submitPassword}>
          <h2>Смена пароля</h2>
          <label className={styles.field}>
            <span className={styles.field__label}>Новый пароль<span className={styles.requiredMark}>*</span></span>
            <input
              className={styles.field__control}
              type="password"
              value={passwordForm.password}
              onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Минимум 8 символов"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.field__label}>Повторите новый пароль<span className={styles.requiredMark}>*</span></span>
            <input
              className={styles.field__control}
              type="password"
              value={passwordForm.passwordRepeat}
              onChange={(event) => setPasswordForm((current) => ({ ...current, passwordRepeat: event.target.value }))}
            />
          </label>
          {(passwordError || authErrors.password) && <p className={styles.message__error}>{passwordError || authErrors.password}</p>}
          <button className={styles.buttonSecondary} type="submit" disabled={authStatus === 'loading'}>
            Сменить пароль
          </button>
        </form>
      </section>
    </div>
  );

  const renderAuctions = () => (
    <MyAuctions
      canCreateAuction={canCreateAuction}
      onCreate={openCreateAuction}
      onEdit={openEditAuction}
      onOpenAuction={onOpenAuction}
      onOpenProtocolAuction={onOpenProtocolAuction}
      timeOffsetMs={timeOffsetMs}
    />
  );

  const renderCreateAuction = () => {
    if (!canCreateAuction) {
      return (
        <section className={styles.panel}>
          <p className={styles.panel__text}>Создание аукционов доступно только после одобрения верификации.</p>
        </section>
      );
    }

    return (
      <AuctionCreateForm
        verification={request}
        initialAuction={editingAuction}
        onSaved={closeAuctionForm}
        onCancel={closeAuctionForm}
      />
    );
  };

  const renderParticipations = () => (
    <MyParticipations
      actionVersion={actionVersion}
      timeOffsetMs={timeOffsetMs}
      onApplyAuction={onApplyAuction}
      onOpenAuction={onOpenAuction}
      onPayDepositAuction={onPayDepositAuction}
      onPayLotAuction={onPayLotAuction}
      onOpenProtocolAuction={onOpenProtocolAuction}
      onToggleFavoriteAuction={onToggleFavoriteAuction}
    />
  );
  const renderFavorites = () => (
    <MyFavorites
      actionVersion={actionVersion}
      timeOffsetMs={timeOffsetMs}
      onApplyAuction={onApplyAuction}
      onOpenAuction={onOpenAuction}
      onPayDepositAuction={onPayDepositAuction}
      onPayLotAuction={onPayLotAuction}
      onOpenProtocolAuction={onOpenProtocolAuction}
      onToggleFavoriteAuction={onToggleFavoriteAuction}
    />
  );
  const renderWins = () => (
    <MyWins
      actionVersion={actionVersion}
      timeOffsetMs={timeOffsetMs}
      onOpenAuction={onOpenAuction}
      onPayLotAuction={onPayLotAuction}
      onOpenProtocolAuction={onOpenProtocolAuction}
      onToggleFavoriteAuction={onToggleFavoriteAuction}
    />
  );
  const renderChats = () => (
    <MyChats
      actionVersion={actionVersion}
      timeOffsetMs={timeOffsetMs}
      onApplyAuction={onApplyAuction}
      onOpenAuction={onOpenAuction}
      onPayDepositAuction={onPayDepositAuction}
      onPayLotAuction={onPayLotAuction}
      onOpenProtocolAuction={onOpenProtocolAuction}
      onToggleFavoriteAuction={onToggleFavoriteAuction}
    />
  );

  const renderVerificationForm = () => {
    if (!canShowVerificationForm) {
      return (
        <section className={styles.panel}>
          <button className={styles.backButton} type="button" onClick={closeVerificationForm}>← Назад</button>
          <p className={styles.panel__text}>Форма верификации сейчас недоступна.</p>
        </section>
      );
    }

    return (
      <section className={styles.panel}>
        <button className={styles.backButton} type="button" onClick={closeVerificationForm}>← Назад</button>
        <VerificationForm onSubmitted={closeVerificationForm} onCancel={closeVerificationForm} />
      </section>
    );
  };

  return (
    <div className={styles.cabinetLayout}>
      <aside className={styles.cabinetSidebar}>
        <p className={styles.cabinetSidebar__title}>Личный кабинет</p>
        <button
          className={`${styles.cabinetSidebar__button} ${activeSection === 'profile' ? styles['cabinetSidebar__button--active'] : ''}`}
          type="button"
          onClick={() => setActiveSection('profile')}
        >
          Профиль
        </button>
        <button
          className={`${styles.cabinetSidebar__button} ${activeSection === 'notifications' ? styles['cabinetSidebar__button--active'] : ''}`}
          type="button"
          onClick={() => setActiveSection('notifications')}
        >
          Уведомления
        </button>
        <button
          className={`${styles.cabinetSidebar__button} ${activeSection === 'chats' ? styles['cabinetSidebar__button--active'] : ''}`}
          type="button"
          onClick={() => setActiveSection('chats')}
        >
          Чаты сделок
        </button>
        <button
          className={`${styles.cabinetSidebar__button} ${['auctions', 'create-auction'].includes(activeSection) ? styles['cabinetSidebar__button--active'] : ''}`}
          type="button"
          onClick={() => {
            setEditingAuction(null);
            setActiveSection('auctions');
          }}
        >
          Мои аукционы
        </button>
        <button
          className={`${styles.cabinetSidebar__button} ${activeSection === 'participations' ? styles['cabinetSidebar__button--active'] : ''}`}
          type="button"
          onClick={() => setActiveSection('participations')}
        >
          Участие в аукционах
        </button>
        <button
          className={`${styles.cabinetSidebar__button} ${activeSection === 'favorites' ? styles['cabinetSidebar__button--active'] : ''}`}
          type="button"
          onClick={() => setActiveSection('favorites')}
        >
          Избранные аукционы
        </button>
        <button
          className={`${styles.cabinetSidebar__button} ${activeSection === 'wins' ? styles['cabinetSidebar__button--active'] : ''}`}
          type="button"
          onClick={() => setActiveSection('wins')}
        >
          Победы в торгах
        </button>
        <button className={styles.cabinetSidebar__button} type="button" onClick={() => setShowLogoutModal(true)}>
          Выйти
        </button>
      </aside>

      <div className={styles.cabinetMain}>
        {activeSection === 'profile' && renderProfile()}
        {activeSection === 'auctions' && renderAuctions()}
        {activeSection === 'participations' && renderParticipations()}
        {activeSection === 'favorites' && renderFavorites()}
        {activeSection === 'wins' && renderWins()}
        {activeSection === 'notifications' && null}
        {activeSection === 'chats' && renderChats()}
        {activeSection === 'create-auction' && renderCreateAuction()}
        {activeSection === 'verification-form' && renderVerificationForm()}
      </div>

      {showLogoutModal && <ConfirmModal onClose={() => setShowLogoutModal(false)} onConfirm={confirmLogout} />}
    </div>
  );
}

export default UserCabinet;
