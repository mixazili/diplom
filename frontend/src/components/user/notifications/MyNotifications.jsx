import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useSelector } from 'react-redux';
import { apiRequest, authHeader } from '../../../api/client.js';
import {
  CabinetFilterPanel,
  Pagination
} from '../auction/CabinetAuctionControls.jsx';
import LoadingState from '../../ui/LoadingState.jsx';
import usePersistedState from '../../../hooks/usePersistedState.js';
import { formatDateTime } from '../../../utils/formatters.js';
import styles from './MyNotifications.module.css';

const importanceLabels = {
  normal: 'Обычное',
  important: 'Важное',
  critical: 'Критичное'
};

function MyNotifications({ realtimeVersion = 0, onCountersChange, onOpenAuction }) {
  const { accessToken } = useSelector((state) => state.auth);
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [sort, setSort] = usePersistedState('auction.cabinet.notifications.sort', 'newest');
  const [limit, setLimit] = usePersistedState('auction.cabinet.notifications.limit', 20);
  const [page, setPage] = usePersistedState('auction.cabinet.notifications.page', 1);

  const load = (silent = false) => {
    if (!accessToken) {
      return;
    }

    setStatus((current) => (silent && current === 'succeeded' ? current : 'loading'));
    const params = new URLSearchParams({
      sort,
      limit: String(limit),
      page: String(page)
    });

    apiRequest(`/notifications?${params.toString()}`, { headers: authHeader(accessToken) })
      .then((data) => {
        setNotifications(data.notifications || []);
        setPagination(data.pagination || { page, limit, total: 0, pages: 1 });
        onCountersChange?.(data.counters);
        setStatus('succeeded');
        const unreadIds = (data.notifications || []).filter((item) => !item.readAt).map((item) => item.id);

        if (unreadIds.length > 0) {
          apiRequest('/notifications/read-page', {
            method: 'POST',
            headers: authHeader(accessToken),
            body: JSON.stringify({ ids: unreadIds })
          })
            .then((readData) => {
              setNotifications((current) => current.map((item) => (
                unreadIds.includes(item.id) ? { ...item, readAt: item.readAt || new Date().toISOString() } : item
              )));
              onCountersChange?.(readData.counters);
            })
            .catch(() => {});
        }
      })
      .catch((error) => {
        setMessage(error.message);
        setStatus('failed');
      });
  };

  useEffect(() => {
    load();
  }, [accessToken, limit, page, sort, realtimeVersion]);

  useEffect(() => {
    setPage(1);
  }, [limit, sort]);

  const markRead = (notification) => {
    if (!accessToken) {
      return;
    }

    apiRequest(`/notifications/${notification.id}/read`, {
      method: 'POST',
      headers: authHeader(accessToken),
      body: JSON.stringify({})
    })
      .then((data) => {
        setNotifications((current) => current.map((item) => (item.id === notification.id ? data.notification : item)));
        onCountersChange?.(data.counters);
      })
      .catch((error) => setMessage(error.message));
  };

  const markAllRead = () => {
    if (!accessToken) {
      return;
    }

    apiRequest('/notifications/read-all', {
      method: 'POST',
      headers: authHeader(accessToken),
      body: JSON.stringify({})
    })
      .then((data) => {
        setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
        onCountersChange?.(data.counters);
      })
      .catch((error) => setMessage(error.message));
  };

  const openNotification = (notification) => {
    if (!notification.readAt) {
      markRead(notification);
    }

    if (notification.link?.startsWith('/auction/')) {
      onOpenAuction?.(notification.link.split('/').filter(Boolean)[1]);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h1 className={styles.panel__title}>Уведомления</h1>
        <button className={styles.buttonSecondary} type="button" onClick={markAllRead}>
          <CheckCheck size={18} />
          Отметить все прочитанными
        </button>
      </div>

      <CabinetFilterPanel
        sort={sort}
        onSortChange={setSort}
        limit={limit}
        onLimitChange={setLimit}
        itemLabel="Уведомлений на странице"
      />

      {message && <p className={styles.message__error}>{message}</p>}
      {status === 'loading' && <LoadingState text="Загрузка уведомлений" />}
      {status !== 'loading' && notifications.length === 0 && <p className={styles.panel__text}>Уведомлений пока нет.</p>}

      <div className={styles.notificationList}>
        {notifications.map((notification) => (
          <article
            className={`${styles.notificationCard} ${!notification.readAt ? styles['notificationCard--unread'] : ''}`}
            key={notification.id}
          >
            <button type="button" onClick={() => openNotification(notification)}>
              <span className={styles.notificationCard__icon}>
                <Bell size={18} />
              </span>
              <span className={styles.notificationCard__content}>
                <small>{importanceLabels[notification.importance] || 'Важное'} · {formatDateTime(notification.createdAt)}</small>
                <strong>{notification.title}</strong>
                {notification.body && <span>{notification.body}</span>}
              </span>
              {!notification.readAt && <b>Новое</b>}
            </button>
          </article>
        ))}
      </div>

      <Pagination page={pagination.page} totalPages={pagination.pages} onPageChange={setPage} />
    </section>
  );
}

export default MyNotifications;
