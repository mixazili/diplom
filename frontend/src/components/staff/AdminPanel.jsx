import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from '../../App.module.css';
import { logout } from '../../features/auth/authSlice.js';
import ReviewList from './ReviewList.jsx';
import { createStaffRequest } from './useStaffRequest.js';

function AdminPanel() {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((state) => state.auth);
  const staffRequest = useMemo(() => createStaffRequest(accessToken), [accessToken]);
  const [moderators, setModerators] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [moderatorForm, setModeratorForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');

  const loadPanel = async () => {
    const [moderatorData, reviewData] = await Promise.all([
      staffRequest('/admin/moderators'),
      staffRequest('/admin/reviews')
    ]);
    setModerators(moderatorData.moderators);
    setReviews(reviewData.reviews);
  };

  useEffect(() => {
    loadPanel().catch((error) => setMessage(error.message));
  }, [staffRequest]);

  const createModerator = async (event) => {
    event.preventDefault();
    try {
      await staffRequest('/admin/moderators', {
        method: 'POST',
        body: JSON.stringify(moderatorForm)
      });
      setModeratorForm({ email: '', password: '' });
      setMessage('Модератор создан');
      await loadPanel();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const deleteModerator = async (id) => {
    try {
      await staffRequest(`/admin/moderators/${id}`, { method: 'DELETE' });
      setMessage('Модератор удален');
      await loadPanel();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className={styles.cabinet}>
      <section className={styles.summary}>
        <div>
          <p className={styles.summary__label}>Панель администратора</p>
          <h2 className={styles.summary__title}>{user.email}</h2>
          <p className={styles.summary__text}>Управление модераторами и общий журнал решений.</p>
        </div>
        <button className={styles.buttonSecondary} type="button" onClick={() => dispatch(logout())}>
          Выйти
        </button>
      </section>

      {message && <p className={styles.message__success}>{message}</p>}

      <section className={styles.staffSection}>
        <h2 className={styles.sectionTitle}>Модераторы</h2>
        <form className={styles.staffForm} onSubmit={createModerator}>
          <input
            className={styles.field__control}
            type="email"
            value={moderatorForm.email}
            onChange={(event) => setModeratorForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="email модератора"
          />
          <input
            className={styles.field__control}
            type="password"
            value={moderatorForm.password}
            onChange={(event) => setModeratorForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="пароль от 8 символов"
          />
          <button className={styles.button} type="submit">Создать модератора</button>
        </form>
        <div className={styles.moderatorGrid}>
          {moderators.map((moderator) => (
            <article className={styles.moderatorCard} key={moderator.id}>
              <strong>{moderator.email}</strong>
              <span className={moderator.onlineStatus === 'online' ? styles.online : styles.offline}>
                {moderator.onlineStatus === 'online' ? 'online' : 'offline'}
              </span>
              <small>Последняя активность: {moderator.lastSeenAt ? new Date(moderator.lastSeenAt).toLocaleString() : 'нет'}</small>
              <button className={styles.buttonDanger} type="button" onClick={() => deleteModerator(moderator.id)}>
                Удалить
              </button>
            </article>
          ))}
        </div>
      </section>

      <ReviewList reviews={reviews} title="Журнал решений всех модераторов" />
    </div>
  );
}

export default AdminPanel;
