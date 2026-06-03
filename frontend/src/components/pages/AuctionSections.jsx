import React from 'react';
import AuctionCard from '../auction/AuctionCard.jsx';
import styles from './AuctionSections.module.css';

function AuctionSections({
  sections,
  user,
  isVerified,
  timeOffsetMs = 0,
  onApplyAuction,
  onOpenAuction,
  onPayDepositAuction,
  onPayLotAuction
}) {
  const visibleSections = sections.filter((section) => section.items?.length > 0);

  if (visibleSections.length === 0) {
    return null;
  }

  return (
    <div className={styles.homeSections}>
      {visibleSections.map((section) => (
        <section className={styles.homeSection} key={section.title}>
          <div className={styles.homeSection__header}>
            <h2>{section.title}</h2>
            {section.description && <p>{section.description}</p>}
          </div>
          <div className={styles.lotGrid}>
            {section.items.map((item) => {
              const auction = section.getAuction ? section.getAuction(item) : item;
              const participant = section.getParticipant ? section.getParticipant(item) : null;

              return (
                <AuctionCard
                  auction={auction}
                  isAuthenticated={Boolean(user)}
                  isVerified={isVerified}
                  currentUserId={user?.id}
                  key={auction.id}
                  mode={section.mode || 'public'}
                  timeOffsetMs={timeOffsetMs}
                  onApply={onApplyAuction}
                  onOpen={() => onOpenAuction(auction.id)}
                  onPayDeposit={onPayDepositAuction}
                  onPayLot={onPayLotAuction}
                  participant={participant}
                />
              );
            })}
          </div>
          {section.hasMore && (
            <button className={styles.showMoreButton} type="button" onClick={section.onShowMore}>
              Показать еще
            </button>
          )}
        </section>
      ))}
    </div>
  );
}

export default AuctionSections;
