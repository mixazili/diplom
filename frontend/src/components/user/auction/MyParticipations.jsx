import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { apiRequest, authHeader } from '../../../api/client.js';
import AuctionCard from '../../auction/AuctionCard.jsx';
import {
  CabinetFilterPanel,
  CompactFilterGroup,
  FlatFilterChoice,
  Pagination
} from './CabinetAuctionControls.jsx';
import LoadingState from '../../ui/LoadingState.jsx';
import styles from './MyParticipations.module.css';

const auctionFilters = [
  {
    label: 'Прием заявок',
    values: ['applications_open'],
    options: [
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
    values: ['won', 'lost', 'finished_failed', 'cancelled'],
    options: [
      ['won', 'Победившие'],
      ['lost', 'Проигранные'],
      ['finished_failed', 'Не состоялись'],
      ['cancelled', 'Отменены']
    ]
  }
];
const defaultAuctionFilters = ['applications_open', 'bidding_waiting', 'bidding_active', 'won', 'lost', 'finished_failed', 'cancelled'];

const getAuctionDate = (item) => new Date(item.auction?.reviewedAt || item.auction?.updatedAt || item.auction?.createdAt || 0).getTime();

function MyParticipations({
  actionVersion = 0,
  onApplyAuction,
  onOpenAuction,
  onPayDepositAuction,
  onPayLotAuction,
  timeOffsetMs = 0
}) {
  const { accessToken, user } = useSelector((state) => state.auth);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [onlyUnapprovedApplications, setOnlyUnapprovedApplications] = useState(false);
  const [selectedAuctionFilters, setSelectedAuctionFilters] = useState(defaultAuctionFilters);
  const [sort, setSort] = useState('newest');
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);

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
  }, [limit, onlyUnapprovedApplications, selectedAuctionFilters.join('|'), sort]);

  const toggleOnlyUnapprovedApplications = () => {
    setOnlyUnapprovedApplications((current) => {
      const next = !current;
      setSelectedAuctionFilters(next ? [] : defaultAuctionFilters);
      return next;
    });
  };

  const updateAuctionFilters = (updater) => {
    setOnlyUnapprovedApplications(false);
    setSelectedAuctionFilters(updater);
  };

  const filteredItems = useMemo(() => items
    .filter((item) => {
      const isApprovedApplication = item.status === 'approved';
      if (onlyUnapprovedApplications) {
        return !isApprovedApplication;
      }

      if (selectedAuctionFilters.includes(item.auction.status)) {
        return true;
      }

      if (selectedAuctionFilters.includes('won') && item.auction.status === 'finished_success' && item.isWinner) {
        return true;
      }

      if (selectedAuctionFilters.includes('lost') && item.auction.status === 'finished_success' && !item.isWinner) {
        return true;
      }

      return false;
    })
    .sort((left, right) => {
      const diff = getAuctionDate(left) - getAuctionDate(right);
      return sort === 'newest' ? -diff : diff;
    }), [items, onlyUnapprovedApplications, selectedAuctionFilters, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / limit));
  const safePage = Math.min(page, totalPages);
  const visibleItems = filteredItems.slice((safePage - 1) * limit, safePage * limit);

  return (
    <section className={styles.panel}>
      <h1 className={styles.panel__title}>Участие в аукционах</h1>

      <CabinetFilterPanel sort={sort} onSortChange={setSort} limit={limit} onLimitChange={setLimit}>
        <FlatFilterChoice selected={onlyUnapprovedApplications} onClick={toggleOnlyUnapprovedApplications}>
          Неодобренные заявки
        </FlatFilterChoice>
        {auctionFilters.map((group) => (
          <CompactFilterGroup group={group} key={group.label} selectedValues={selectedAuctionFilters} onChange={updateAuctionFilters} />
        ))}
      </CabinetFilterPanel>

      {message && <p className={styles.message__error}>{message}</p>}
      {status === 'loading' && <LoadingState text="Загрузка заявок" />}
      {status !== 'loading' && filteredItems.length === 0 && <p className={styles.panel__text}>Подходящих заявок пока нет.</p>}

      <div className={styles.lotGrid}>
        {visibleItems.map((item) => (
          <AuctionCard
            key={`${item.auction.id}-${item.participantNumber || item.status}`}
            auction={item.auction}
            isAuthenticated
            isVerified={user?.verificationStatus === 'approved'}
            mode="public"
            timeOffsetMs={timeOffsetMs}
            onApply={onApplyAuction}
            onOpen={() => onOpenAuction?.(item.auction.id)}
            participant={item}
            onPayDeposit={onPayDepositAuction}
            onPayLot={onPayLotAuction}
          />
        ))}
      </div>

      <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}

export default MyParticipations;
