import React, { useMemo, useState } from 'react';
import styles from '../../App.module.css';
import AuctionCard from '../auction/AuctionCard.jsx';
import AuctionDetails from './AuctionDetails.jsx';
import StaffListControls, { StaffPagination, paginateItems, sortByDate } from './StaffListControls.jsx';

function AuctionQueue({ auctions, onApprove, onReturn }) {
  const [comments, setComments] = useState({});
  const [selectedAuctionId, setSelectedAuctionId] = useState(null);
  const [sort, setSort] = useState('oldest');
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const selectedAuction = auctions.find((auction) => auction.id === selectedAuctionId);
  const sortedAuctions = useMemo(
    () => sortByDate(auctions, sort, (auction) => auction.submittedAt || auction.updatedAt || auction.createdAt),
    [auctions, sort]
  );
  const { pageItems, totalPages, safePage } = paginateItems(sortedAuctions, page, limit);

  const updateComment = (id, value) => {
    setComments((current) => ({ ...current, [id]: value }));
  };

  if (selectedAuction) {
    return (
      <section className={styles.staffSection}>
        <button className={styles.backButton} type="button" onClick={() => setSelectedAuctionId(null)}>
          ← Назад
        </button>
        <AuctionDetails auction={selectedAuction} />
        <div className={styles.staffActions}>
          <textarea
            className={styles.field__control}
            value={comments[selectedAuction.id] || ''}
            onChange={(event) => updateComment(selectedAuction.id, event.target.value)}
            placeholder="Комментарий для пользователя при отказе"
          />
          <div className={styles.staffDecisionButtons}>
            <button className={styles.buttonSecondary} type="button" onClick={() => onApprove(selectedAuction.id, comments[selectedAuction.id] || '')}>
              Одобрить
            </button>
            <button className={styles.buttonDanger} type="button" onClick={() => onReturn(selectedAuction.id, comments[selectedAuction.id] || '')}>
              Отказать
            </button>
          </div>
        </div>
        <div className={styles.staffCancelActions}>
          <button className={styles.backButton} type="button" onClick={() => setSelectedAuctionId(null)}>
            ← Назад
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.staffSection}>
      <h2 className={styles.sectionTitle}>Заявки на создание лотов</h2>
      <StaffListControls sort={sort} onSortChange={(value) => { setSort(value); setPage(1); }} limit={limit} onLimitChange={(value) => { setLimit(value); setPage(1); }} />
      <div className={styles.lotGrid}>
        {pageItems.length === 0 && <p className={styles.panel__text}>Нет лотов в ожидании проверки.</p>}
        {pageItems.map((auction) => (
          <AuctionCard
            auction={auction}
            key={auction.id}
            mode="moderation"
            onOpen={() => setSelectedAuctionId(auction.id)}
          />
        ))}
      </div>
      <StaffPagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}

export default AuctionQueue;
