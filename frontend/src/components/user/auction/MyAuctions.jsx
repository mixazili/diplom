import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from '../../../App.module.css';
import AuctionCard from '../../auction/AuctionCard.jsx';
import { deleteAuction, fetchMyAuctions, returnAuctionToDraft } from '../../../features/auction/auctionSlice.js';

const filterLabels = {
  unpublished: 'Неопубликованные',
  applications: 'Прием заявок',
  bidding: 'Торги',
  finished: 'Завершенные торги'
};

const statusGroups = {
  unpublished: ['draft', 'pending', 'returned'],
  applications: ['application_waiting', 'applications_open'],
  bidding: ['bidding_waiting', 'bidding_active'],
  finished: ['finished_success', 'finished_failed']
};

function MyAuctions({ canCreateLot, onCreate, onEdit }) {
  const dispatch = useDispatch();
  const { accessToken } = useSelector((state) => state.auth);
  const { items, status, message } = useSelector((state) => state.auction);
  const [activeFilter, setActiveFilter] = useState('unpublished');

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    dispatch(fetchMyAuctions({ token: accessToken }));
    const intervalId = window.setInterval(() => {
      dispatch(fetchMyAuctions({ token: accessToken }));
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [accessToken, dispatch]);

  const filteredItems = useMemo(
    () => items.filter((auction) => statusGroups[activeFilter].includes(auction.status)),
    [activeFilter, items]
  );

  const removeLot = async (id) => {
    await dispatch(deleteAuction({ id, token: accessToken }));
  };

  const moveToDraft = async (id) => {
    await dispatch(returnAuctionToDraft({ id, token: accessToken }));
  };

  return (
    <section className={styles.panel}>
      <div className={`${styles.panel__header} ${styles['panel__header--row']}`}>
        <h1 className={styles.panel__title}>Мои лоты</h1>
        <button className={`${styles.button} ${styles.panel__headerAction}`} type="button" onClick={onCreate} disabled={!canCreateLot}>
          Создать лот
        </button>
      </div>

      <div className={styles.lotToolbar}>
        {!canCreateLot && <p className={styles.message__error}>Создание лота доступно только после одобрения верификации.</p>}
      </div>

      <div className={styles.filterTabs}>
        {Object.entries(filterLabels).map(([key, label]) => (
          <button
            className={`${styles.filterTabs__button} ${activeFilter === key ? styles['filterTabs__button--active'] : ''}`}
            key={key}
            type="button"
            onClick={() => setActiveFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {status === 'loading' && <p className={styles.panel__text}>Загрузка лотов...</p>}
      {status === 'failed' && <p className={styles.message__error}>{message}</p>}
      {status !== 'loading' && filteredItems.length === 0 && (
        <p className={styles.panel__text}>В этом разделе лотов пока нет.</p>
      )}

      <div className={styles.lotGrid}>
        {filteredItems.map((auction) => (
          <AuctionCard
            auction={auction}
            isVerified={canCreateLot}
            key={auction.id}
            mode="owner"
            onDelete={removeLot}
            onEdit={onEdit}
            onReturnToDraft={moveToDraft}
          />
        ))}
      </div>
    </section>
  );
}

export default MyAuctions;
