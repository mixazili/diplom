import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/auth/authSlice.js';
import { formatDateTime } from '../../utils/formatters.js';
import AuctionCancellationList from './AuctionCancellationList.jsx';
import AuctionReviewList from './AuctionReviewList.jsx';
import ReviewList from './ReviewList.jsx';
import { createStaffRequest } from './useStaffRequest.js';
import LoadingState from '../ui/LoadingState.jsx';
import styles from './AdminPanel.module.css';

const isDevBuild = import.meta.env.DEV;

const menuItems = [
  ['moderators', 'Модераторы'],
  ['verificationReviews', 'Журнал верификаций'],
  ['auctionReviews', 'Журнал аукционов'],
  ['auctionCancellations', 'Журнал отмененных аукционов'],
  ...(isDevBuild ? [['devTime', 'Dev-время']] : [])
];

const toLocalInputValue = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

const offsetLabels = [
  ['15 минут', 15 * 60 * 1000],
  ['1 час', 60 * 60 * 1000],
  ['1 день', 24 * 60 * 60 * 1000],
  ['1 неделя', 7 * 24 * 60 * 60 * 1000]
];

function AdminPanel() {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((state) => state.auth);
  const staffRequest = useMemo(() => createStaffRequest(accessToken), [accessToken]);
  const [activeSection, setActiveSection] = useState('moderators');
  const [moderators, setModerators] = useState([]);
  const [verificationReviews, setVerificationReviews] = useState([]);
  const [auctionReviews, setAuctionReviews] = useState([]);
  const [auctionCancellations, setAuctionCancellations] = useState([]);
  const [moderatorForm, setModeratorForm] = useState({ email: '', password: '' });
  const [devTime, setDevTime] = useState(null);
  const [timeForm, setTimeForm] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadPanel = async () => {
    const requests = [
      staffRequest('/admin/moderators'),
      staffRequest('/admin/reviews'),
      staffRequest('/admin/auction-reviews'),
      staffRequest('/admin/auction-cancellations')
    ];

    if (isDevBuild) {
      requests.push(staffRequest('/admin/dev-time'));
    }

    const [moderatorData, verificationReviewData, auctionReviewData, auctionCancellationData, devTimeData] = await Promise.all(requests);
    setModerators(moderatorData.moderators);
    setVerificationReviews(verificationReviewData.reviews);
    setAuctionReviews(auctionReviewData.reviews);
    setAuctionCancellations(auctionCancellationData.reviews);

    if (devTimeData?.time) {
      setDevTime(devTimeData.time);
      setTimeForm(toLocalInputValue(devTimeData.time.currentTime));
    }

    setLoading(false);
  };

  useEffect(() => {
    loadPanel().catch((error) => {
      setMessage(error.message);
      setLoading(false);
    });
  }, [staffRequest]);

  const createModerator = async (event) => {
    event.preventDefault();
    try {
      await staffRequest('/admin/moderators', {
        method: 'POST',
        body: JSON.stringify(moderatorForm)
      });
      setModeratorForm({ email: '', password: '' });
      await loadPanel();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const deleteModerator = async (id) => {
    try {
      await staffRequest(`/admin/moderators/${id}`, { method: 'DELETE' });
      await loadPanel();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updateDevTime = async (path, body = {}) => {
    try {
      const data = await staffRequest(path, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      setDevTime(data.time);
      setTimeForm(toLocalInputValue(data.time.currentTime));
      window.dispatchEvent(new Event('auction:dev-time-changed'));
      setMessage('');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const adjustDevTime = (deltaMs) => updateDevTime('/admin/dev-time/advance', { deltaMs });

  const submitExactTime = (event) => {
    event.preventDefault();

    if (!timeForm) {
      setMessage('Укажите дату и время');
      return;
    }

    updateDevTime('/admin/dev-time/set', { currentTime: new Date(timeForm).toISOString() });
  };

  const renderModerators = () => (
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
            <small>Последняя активность: {moderator.lastSeenAt ? formatDateTime(moderator.lastSeenAt) : 'нет'}</small>
            <button className={styles.buttonDanger} type="button" onClick={() => deleteModerator(moderator.id)}>
              Удалить
            </button>
          </article>
        ))}
      </div>
    </section>
  );

  const renderDevTime = () => (
    <section className={styles.staffSection}>
      <div className={styles.devTimePanel}>
        <div>
          <h2 className={styles.sectionTitle}>Виртуальное время</h2>
          <p className={styles.panel__text}>
            Инструмент доступен только в dev-сборке. После изменения времени backend сразу пересчитывает статусы аукционов и просроченные заявки.
          </p>
        </div>

        <div className={styles.devTimeGrid}>
          <article className={styles.devTimeCard}>
            <span>Текущее время Auction.by</span>
            <strong>{devTime ? formatDateTime(devTime.currentTime) : <LoadingState compact text="Загрузка" />}</strong>
          </article>
          <article className={styles.devTimeCard}>
            <span>Реальное время</span>
            <strong>{devTime ? formatDateTime(devTime.realTime) : <LoadingState compact text="Загрузка" />}</strong>
          </article>
          <article className={styles.devTimeCard}>
            <span>Оффсет</span>
            <strong>{devTime ? `${devTime.offsetHours} ч` : <LoadingState compact text="Загрузка" />}</strong>
          </article>
        </div>

        <div className={styles.devTimeActions}>
          {offsetLabels.map(([label, value]) => (
            <div className={styles.devTimeActionGroup} key={label}>
              <span>{label}</span>
              <button className={styles.backButton} type="button" onClick={() => adjustDevTime(value)}>
                + добавить
              </button>
              <button className={styles.backButton} type="button" onClick={() => adjustDevTime(-value)}>
                - отнять
              </button>
            </div>
          ))}
        </div>

        <form className={styles.devTimeExact} onSubmit={submitExactTime}>
          <label className={styles.field}>
            <span className={styles.field__label}>Задать точное виртуальное время</span>
            <input
              className={styles.field__control}
              type="datetime-local"
              value={timeForm}
              onChange={(event) => setTimeForm(event.target.value)}
            />
          </label>
          <button className={styles.button} type="submit">Применить</button>
          <button className={styles.backButton} type="button" onClick={() => updateDevTime('/admin/dev-time/reset')}>
            Сбросить
          </button>
        </form>
      </div>
    </section>
  );

  const renderSection = () => {
    if (activeSection === 'verificationReviews') {
      return <ReviewList reviews={verificationReviews} title="Журнал решений всех модераторов по верификациям" />;
    }

    if (activeSection === 'auctionReviews') {
      return <AuctionReviewList reviews={auctionReviews} title="Журнал решений всех модераторов по аукционам" />;
    }

    if (activeSection === 'auctionCancellations') {
      return <AuctionCancellationList reviews={auctionCancellations} title="Журнал отмененных аукционов" />;
    }

    if (activeSection === 'devTime' && isDevBuild) {
      return renderDevTime();
    }

    return renderModerators();
  };

  return (
    <div className={styles.cabinetLayout}>
      <aside className={styles.cabinetSidebar}>
        <p className={styles.cabinetSidebar__title}>Администратор</p>
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
            <p className={styles.summary__label}>Панель администратора</p>
            <h2 className={styles.summary__title}>{user.email}</h2>
            <p className={styles.summary__text}>Управление модераторами и общий журнал решений по верификациям и аукционам.</p>
          </div>
        </section>

        {message && <p className={styles.message__error}>{message}</p>}
        {loading ? <LoadingState text="Загрузка панели" /> : renderSection()}
      </div>
    </div>
  );
}

export default AdminPanel;
