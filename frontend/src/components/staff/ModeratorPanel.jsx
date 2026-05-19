import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from '../../App.module.css';
import { logout } from '../../features/auth/authSlice.js';
import AuctionQueue from './AuctionQueue.jsx';
import AuctionReviewList from './AuctionReviewList.jsx';
import ReviewList from './ReviewList.jsx';
import VerificationQueue from './VerificationQueue.jsx';
import { createStaffRequest } from './useStaffRequest.js';

const menuItems = [
  ['verifications', 'Заявки на верификацию'],
  ['auctions', 'Заявки на лоты'],
  ['verificationReviews', 'Журнал верификаций'],
  ['auctionReviews', 'Журнал лотов']
];

function ModeratorPanel() {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((state) => state.auth);
  const staffRequest = useMemo(() => createStaffRequest(accessToken), [accessToken]);
  const [activeSection, setActiveSection] = useState('verifications');
  const [verifications, setVerifications] = useState([]);
  const [verificationReviews, setVerificationReviews] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [auctionReviews, setAuctionReviews] = useState([]);
  const [message, setMessage] = useState('');

  const loadPanel = async () => {
    const [verificationData, verificationReviewData, auctionData, auctionReviewData] = await Promise.all([
      staffRequest('/moderation/verifications'),
      staffRequest('/moderation/reviews'),
      staffRequest('/moderation/auctions'),
      staffRequest('/moderation/auction-reviews')
    ]);
    setVerifications(verificationData.verifications);
    setVerificationReviews(verificationReviewData.reviews);
    setAuctions(auctionData.auctions);
    setAuctionReviews(auctionReviewData.reviews);
  };

  useEffect(() => {
    loadPanel().catch((error) => setMessage(error.message));
  }, [staffRequest]);

  const reviewVerification = async (id, action, comment) => {
    try {
      await staffRequest(`/moderation/verifications/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ comment })
      });
      setMessage(action === 'approve' ? 'Заявка на верификацию одобрена' : 'Заявка на верификацию отклонена');
      await loadPanel();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const reviewAuction = async (id, action, comment) => {
    try {
      await staffRequest(`/moderation/auctions/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ comment })
      });
      setMessage(action === 'approve' ? 'Лот одобрен и стал активным' : 'Лот возвращен пользователю на доработку');
      await loadPanel();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const renderSection = () => {
    if (activeSection === 'auctions') {
      return (
        <AuctionQueue
          auctions={auctions}
          onApprove={(id, comment) => reviewAuction(id, 'approve', comment)}
          onReturn={(id, comment) => reviewAuction(id, 'return', comment)}
        />
      );
    }

    if (activeSection === 'verificationReviews') {
      return <ReviewList reviews={verificationReviews} title="Мой журнал решений по верификациям" />;
    }

    if (activeSection === 'auctionReviews') {
      return <AuctionReviewList reviews={auctionReviews} title="Мой журнал решений по лотам" />;
    }

    return (
      <VerificationQueue
        verifications={verifications}
        onApprove={(id, comment) => reviewVerification(id, 'approve', comment)}
        onReject={(id, comment) => reviewVerification(id, 'reject', comment)}
      />
    );
  };

  return (
    <div className={styles.cabinetLayout}>
      <aside className={styles.cabinetSidebar}>
        <p className={styles.cabinetSidebar__title}>Модератор</p>
        {menuItems.map(([key, label]) => (
          <button
            className={`${styles.cabinetSidebar__button} ${activeSection === key ? styles['cabinetSidebar__button--active'] : ''}`}
            key={key}
            type="button"
            onClick={() => setActiveSection(key)}
          >
            {label}
          </button>
        ))}
        <button className={styles.cabinetSidebar__button} type="button" onClick={() => dispatch(logout())}>
          Выйти
        </button>
      </aside>

      <div className={styles.cabinetMain}>
        <section className={styles.summary}>
          <div>
            <p className={styles.summary__label}>Панель модератора</p>
            <h2 className={styles.summary__title}>{user.email}</h2>
            <p className={styles.summary__text}>Проверка заявок пользователей, заявок на лоты и журнал собственных решений.</p>
          </div>
        </section>
        {message && <p className={styles.message__success}>{message}</p>}
        {renderSection()}
      </div>
    </div>
  );
}

export default ModeratorPanel;
