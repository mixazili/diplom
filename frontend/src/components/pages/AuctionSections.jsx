import React from 'react';
import styles from '../../App.module.css';
import AuctionCard from '../auction/AuctionCard.jsx';

function AuctionSections({ sections, user, isVerified, onOpenAuction }) {
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
            {section.items.map((auction) => (
              <AuctionCard
                auction={auction}
                isAuthenticated={Boolean(user)}
                isVerified={isVerified}
                key={auction.id}
                mode={section.mode || 'public'}
                onOpen={() => onOpenAuction(auction.id)}
              />
            ))}
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
