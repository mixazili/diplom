import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AuctionCard from '../../auction/AuctionCard.jsx';
import { deleteAuction, fetchMyAuctions, returnAuctionToDraft } from '../../../features/auction/auctionSlice.js';
import {
  CabinetFilterPanel,
  CompactFilterGroup,
  Pagination
} from './CabinetAuctionControls.jsx';
import LoadingState from '../../ui/LoadingState.jsx';
import styles from './MyAuctions.module.css';

const statusGroups = [
  {
    label: 'Неопубликованные',
    values: ['draft', 'pending', 'returned'],
    options: [
      ['returned', 'Отклонен'],
      ['pending', 'Проверка'],
      ['draft', 'Черновик']
    ]
  },
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
const defaultStatuses = ['draft', 'pending', 'returned', 'application_waiting', 'applications_open'];

const publicLikeStatuses = new Set([
  'pending',
  'returned',
  'application_waiting',
  'applications_open',
  'bidding_waiting',
  'bidding_active',
  'finished_success',
  'finished_failed',
  'cancelled'
]);

const getAuctionDate = (auction) => new Date(auction.reviewedAt || auction.updatedAt || auction.createdAt || 0).getTime();

function MyAuctions({ canCreateLot, onCreate, onEdit, onOpenAuction, timeOffsetMs = 0 }) {
  const dispatch = useDispatch();
  const { accessToken } = useSelector((state) => state.auth);
  const { items, status, message } = useSelector((state) => state.auction);
  const [selectedStatuses, setSelectedStatuses] = useState(defaultStatuses);
  const [sort, setSort] = useState('newest');
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    setPage(1);
  }, [limit, selectedStatuses.join('|'), sort]);

  const filteredItems = useMemo(
    () => items
      .filter((auction) => selectedStatuses.includes(auction.status))
      .sort((left, right) => {
        const diff = getAuctionDate(left) - getAuctionDate(right);
        return sort === 'newest' ? -diff : diff;
      }),
    [items, selectedStatuses, sort]
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / limit));
  const safePage = Math.min(page, totalPages);
  const visibleItems = filteredItems.slice((safePage - 1) * limit, safePage * limit);

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

      <CabinetFilterPanel sort={sort} onSortChange={setSort} limit={limit} onLimitChange={setLimit}>
        {statusGroups.map((group) => (
          <CompactFilterGroup group={group} key={group.label} selectedValues={selectedStatuses} onChange={setSelectedStatuses} />
        ))}
      </CabinetFilterPanel>

      {status === 'loading' && items.length === 0 && <LoadingState text="Загрузка лотов" />}
      {status === 'failed' && <p className={styles.message__error}>{message}</p>}
      {status !== 'loading' && filteredItems.length === 0 && (
        <p className={styles.panel__text}>В выбранных статусах лотов пока нет.</p>
      )}

      <div className={styles.lotGrid}>
        {visibleItems.map((auction) => (
          <AuctionCard
            auction={auction}
            isVerified={canCreateLot}
            key={auction.id}
            mode="owner"
            timeOffsetMs={timeOffsetMs}
            onDelete={removeLot}
            onEdit={onEdit}
            onOpen={publicLikeStatuses.has(auction.status) ? () => onOpenAuction?.(auction.id) : undefined}
            onReturnToDraft={moveToDraft}
          />
        ))}
      </div>

      <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}

export default MyAuctions;
