import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from '../../App.module.css';
import { logout } from '../../features/auth/authSlice.js';
import ReviewList from './ReviewList.jsx';
import VerificationQueue from './VerificationQueue.jsx';
import { createStaffRequest } from './useStaffRequest.js';

function ModeratorPanel() {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((state) => state.auth);
  const staffRequest = useMemo(() => createStaffRequest(accessToken), [accessToken]);
  const [verifications, setVerifications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState('');

  const loadPanel = async () => {
    const [verificationData, reviewData] = await Promise.all([
      staffRequest('/moderation/verifications'),
      staffRequest('/moderation/reviews')
    ]);
    setVerifications(verificationData.verifications);
    setReviews(reviewData.reviews);
  };

  useEffect(() => {
    loadPanel().catch((error) => setMessage(error.message));
  }, [staffRequest]);

  const review = async (id, action, comment) => {
    try {
      await staffRequest(`/moderation/verifications/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ comment })
      });
      setMessage(action === 'approve' ? 'Заявка одобрена' : 'Заявка отклонена');
      await loadPanel();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className={styles.cabinet}>
      <section className={styles.summary}>
        <div>
          <p className={styles.summary__label}>Панель модератора</p>
          <h2 className={styles.summary__title}>{user.email}</h2>
          <p className={styles.summary__text}>Проверка заявок пользователей и журнал своих решений.</p>
        </div>
        <button className={styles.buttonSecondary} type="button" onClick={() => dispatch(logout())}>
          Выйти
        </button>
      </section>
      {message && <p className={styles.message__success}>{message}</p>}
      <VerificationQueue
        verifications={verifications}
        onApprove={(id, comment) => review(id, 'approve', comment)}
        onReject={(id, comment) => review(id, 'reject', comment)}
      />
      <ReviewList reviews={reviews} title="Мой журнал решений" />
    </div>
  );
}

export default ModeratorPanel;
