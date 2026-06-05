import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { apiRequest, authHeader } from '../../../api/client.js';
import AuctionCard from '../../auction/AuctionCard.jsx';
import {
  CabinetFilterPanel,
  FlatFilterChoice,
  Pagination,
  toggleRequiredValue
} from './CabinetAuctionControls.jsx';
import LoadingState from '../../ui/LoadingState.jsx';
import usePersistedState from '../../../hooks/usePersistedState.js';
import styles from './MyParticipations.module.css';

const paymentFilters = [
  ['unpaid', 'Предмет торгов не оплачен'],
  ['paid', 'Предмет торгов оплачен']
];

const defaultPaymentFilters = ['unpaid', 'paid'];

const getAuctionDate = (item) => new Date(item.auction?.reviewedAt || item.auction?.updatedAt || item.auction?.createdAt || 0).getTime();

function MyWins({ actionVersion = 0, onOpenAuction, onOpenProtocolAuction, onPayLotAuction, onToggleFavoriteAuction, timeOffsetMs = 0 }) {
  const { accessToken, user } = useSelector((state) => state.auth);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [selectedPaymentFilters, setSelectedPaymentFilters] = usePersistedState('auction.cabinet.wins.paymentFilters', defaultPaymentFilters);
  const [sort, setSort] = usePersistedState('auction.cabinet.wins.sort', 'newest');
  const [limit, setLimit] = usePersistedState('auction.cabinet.wins.limit', 20);
  const [page, setPage] = usePersistedState('auction.cabinet.wins.page', 1);

  const load = (silent = false) => {
    if (!accessToken) {
      return;
    }

    setStatus((current) => (silent && current === 'succeeded' ? current : 'loading'));
    apiRequest('/auctions/participations/my', { headers: authHeader(accessToken) })
      .then((data) => {
        setItems(data.participations || []);
        setStatus('succeeded');
      })
      .catch((error) => {
        setMessage(error.message);
        setStatus('failed');
      });
  };

  useEffect(() => {
    load();
    const intervalId = window.setInterval(() => load(true), 30000);
    return () => window.clearInterval(intervalId);
  }, [accessToken, actionVersion]);

  useEffect(() => {
    setPage(1);
  }, [limit, selectedPaymentFilters.join('|'), sort]);

  const filteredItems = useMemo(() => items
    .filter((item) => item.isWinner && item.auction?.status === 'finished_success')
    .filter((item) => selectedPaymentFilters.includes(item.lotPaymentStatus === 'paid' ? 'paid' : 'unpaid'))
    .sort((left, right) => {
      const diff = getAuctionDate(left) - getAuctionDate(right);
      return sort === 'newest' ? -diff : diff;
    }), [items, selectedPaymentFilters, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / limit));
  const safePage = Math.min(page, totalPages);
  const visibleItems = filteredItems.slice((safePage - 1) * limit, safePage * limit);

  return (
    <section className={styles.panel}>
      <h1 className={styles.panel__title}>Победы в торгах</h1>

      <CabinetFilterPanel sort={sort} onSortChange={setSort} limit={limit} onLimitChange={setLimit}>
        {paymentFilters.map(([value, label]) => (
          <FlatFilterChoice
            key={value}
            selected={selectedPaymentFilters.includes(value)}
            onClick={() => setSelectedPaymentFilters((current) => toggleRequiredValue(current, value))}
          >
            {label}
          </FlatFilterChoice>
        ))}
      </CabinetFilterPanel>

      {message && <p className={styles.message__error}>{message}</p>}
      {status === 'loading' && <LoadingState text="Загрузка побед" />}
      {status !== 'loading' && filteredItems.length === 0 && <p className={styles.panel__text}>Побед в выбранных статусах оплаты пока нет.</p>}

      <div className={styles.auctionGrid}>
        {visibleItems.map((item) => (
          <AuctionCard
            key={`${item.auction.id}-${item.participantNumber || item.status}`}
            auction={item.auction}
            isAuthenticated
            isVerified={user?.verificationStatus === 'approved'}
            mode="public"
            timeOffsetMs={timeOffsetMs}
            onOpen={() => onOpenAuction?.(item.auction.id)}
            onOpenProtocol={onOpenProtocolAuction}
            participant={item}
            onPayLot={onPayLotAuction}
            onToggleFavorite={onToggleFavoriteAuction}
          />
        ))}
      </div>

      <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}

export default MyWins;
