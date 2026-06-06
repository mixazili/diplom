import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/auth/authSlice.js';
import AuctionCancellationList from './AuctionCancellationList.jsx';
import AuctionQueue from './AuctionQueue.jsx';
import AuctionReviewList from './AuctionReviewList.jsx';
import ReviewList from './ReviewList.jsx';
import StaffProfile from './StaffProfile.jsx';
import VerificationQueue from './VerificationQueue.jsx';
import { createStaffRequest } from './useStaffRequest.js';
import LoadingState from '../ui/LoadingState.jsx';
import styles from './ModeratorPanel.module.css';

const menuItems = [
  ['profile', 'Профиль'],
  ['verifications', 'Заявки на верификацию'],
  ['auctions', 'Заявки на аукционы'],
  ['verificationReviews', 'Журнал верификаций'],
  ['auctionReviews', 'Журнал аукционов'],
  ['auctionCancellations', 'Журнал отмененных аукционов']
];

function ModeratorPanel() {
  const dispatch = useDispatch();
  const { accessToken } = useSelector((state) => state.auth);
  const staffRequest = useMemo(() => createStaffRequest(accessToken), [accessToken]);
  const [activeSection, setActiveSection] = useState('profile');
  const [verifications, setVerifications] = useState([]);
  const [verificationReviews, setVerificationReviews] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [auctionReviews, setAuctionReviews] = useState([]);
  const [auctionCancellations, setAuctionCancellations] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadPanel = async () => {
    setLoading((current) => current && true);
    const [verificationData, verificationReviewData, auctionData, auctionReviewData, auctionCancellationData] = await Promise.all([
      staffRequest('/moderation/verifications'),
      staffRequest('/moderation/reviews'),
      staffRequest('/moderation/auctions'),
      staffRequest('/moderation/auction-reviews'),
      staffRequest('/moderation/auction-cancellations')
    ]);
    setVerifications(verificationData.verifications);
    setVerificationReviews(verificationReviewData.reviews);
    setAuctions(auctionData.auctions);
    setAuctionReviews(auctionReviewData.reviews);
    setAuctionCancellations(auctionCancellationData.reviews);
    setLoading(false);
  };

  useEffect(() => {
    loadPanel().catch((error) => {
      setMessage(error.message);
      setLoading(false);
    });
  }, [staffRequest]);

  const reviewVerification = async (id, action, comment) => {
    try {
      await staffRequest(`/moderation/verifications/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ comment })
      });
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
      await loadPanel();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const renderSection = () => {
    if (activeSection === 'profile') {
      return <StaffProfile roleLabel="Модератор" />;
    }

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
      return <ReviewList reviews={verificationReviews} showModerator={false} title="Мой журнал решений по верификациям" />;
    }

    if (activeSection === 'auctionReviews') {
      return <AuctionReviewList reviews={auctionReviews} title="Мой журнал решений по аукционам" showModerator={false} />;
    }

    if (activeSection === 'auctionCancellations') {
      return <AuctionCancellationList reviews={auctionCancellations} title="Мой журнал отмененных аукционов" showModerator={false} />;
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
        {message && <p className={styles.message__error}>{message}</p>}
        {loading ? <LoadingState text="Загрузка панели" /> : renderSection()}
      </div>
    </div>
  );
}

export default ModeratorPanel;
