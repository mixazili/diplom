import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { apiRequest, authHeader } from '../../../api/client.js';
import AuctionCard from '../../auction/AuctionCard.jsx';
import {
  CabinetFilterPanel,
  CompactFilterGroup,
  Pagination
} from './CabinetAuctionControls.jsx';
import LoadingState from '../../ui/LoadingState.jsx';
import usePersistedState from '../../../hooks/usePersistedState.js';
import styles from './MyParticipations.module.css';

const statusGroups = [
  {
    label: 'Прием заявок',
    values: ['application_waiting', 'applications_open'],
    options: [
      ['application_waiting', 'Ожидание приема заявок'],
      ['applications_open', 'Прием заявок']
    ]
  },
  {
    label: 'Торги',
    values: ['bidding_waiting', 'bidding_active'],
    options: [
      ['bidding_waiting', 'Ожидание торгов'],
      ['bidding_active', 'Идут торги']
    ]
  },
  {
    label: 'Завершенные торги',
    values: ['finished_success', 'finished_failed', 'cancelled'],
    options: [
      ['finished_success', 'Торги состоялись'],
      ['finished_failed', 'Торги не состоялись'],
      ['cancelled', 'Отменен']
    ]
  }
];

const defaultStatuses = statusGroups.flatMap((group) => group.values);

function MyFavorites({
  actionVersion = 0,
  onApplyAuction,
  onOpenAuction,
  onOpenProtocolAuction,
  onPayDepositAuction,
  onPayLotAuction,
  onToggleFavoriteAuction,
  timeOffsetMs = 0
}) {
  const { accessToken, user } = useSelector((state) => state.auth);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [selectedStatuses, setSelectedStatuses] = usePersistedState('auction.cabinet.favorites.statuses', defaultStatuses);
  const [sort, setSort] = usePersistedState('auction.cabinet.favorites.sort', 'newest');
  const [limit, setLimit] = usePersistedState('auction.cabinet.favorites.limit', 20);
  const [page, setPage] = usePersistedState('auction.cabinet.favorites.page', 1);
  const isVerified = user?.verificationStatus === 'approved';

  const load = (silent = false) => {
    if (!accessToken || selectedStatuses.length === 0) {
      setItems([]);
      return;
    }

    const params = new URLSearchParams({
      sort,
      limit: String(limit),
      page: String(page)
    });
    selectedStatuses.forEach((item) => params.append('status', item));

    setStatus((current) => (silent && current === 'succeeded' ? current : 'loading'));
    apiRequest(`/auctions/favorites/my?${params.toString()}`, { headers: authHeader(accessToken) })
      .then((data) => {
        setItems(data.auctions || []);
        setTotal(data.total || 0);
        setStatus('succeeded');
      })
      .catch((error) => {
        setMessage(error.message);
        setStatus('failed');
      });
  };

  useEffect(() => {
    load();
  }, [accessToken, actionVersion, limit, page, selectedStatuses.join('|'), sort]);

  useEffect(() => {
    setPage(1);
  }, [limit, selectedStatuses.join('|'), sort]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const toggleFavorite = async (auction) => {
    const result = await onToggleFavoriteAuction?.(auction);
    if (result?.isFavorite === false) {
      setItems((current) => current.filter((item) => item.id !== auction.id));
      setTotal((current) => Math.max(0, current - 1));
    }
    return result;
  };

  return (
    <section className={styles.panel}>
      <h1 className={styles.panel__title}>Избранные аукционы</h1>

      <CabinetFilterPanel sort={sort} onSortChange={setSort} limit={limit} onLimitChange={setLimit}>
        {statusGroups.map((group) => (
          <CompactFilterGroup group={group} key={group.label} selectedValues={selectedStatuses} onChange={setSelectedStatuses} />
        ))}
      </CabinetFilterPanel>

      {message && <p className={styles.message__error}>{message}</p>}
      {status === 'loading' && <LoadingState text="Загрузка избранного" />}
      {status !== 'loading' && items.length === 0 && <p className={styles.panel__text}>В избранном пока нет аукционов.</p>}

      <div className={styles.auctionGrid}>
        {items.map((auction) => (
          <AuctionCard
            key={auction.id}
            auction={auction}
            isAuthenticated
            isVerified={isVerified}
            currentUserId={user?.id}
            mode="public"
            timeOffsetMs={timeOffsetMs}
            onApply={onApplyAuction}
            onOpen={() => onOpenAuction?.(auction.id)}
            onOpenProtocol={onOpenProtocolAuction}
            onPayDeposit={onPayDepositAuction}
            onPayLot={onPayLotAuction}
            onToggleFavorite={toggleFavorite}
          />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}

export default MyFavorites;
