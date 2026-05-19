import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from '../../../App.module.css';
import { auctionCategoryLabels } from '../../../constants/auctionConstants.js';
import { deleteAuction, fetchMyAuctions } from '../../../features/auction/auctionSlice.js';

const statusLabels = {
  pending: 'Ожидает проверки',
  returned: 'Возвращен на доработку',
  published: 'Опубликован',
  active: 'Активен',
  finished: 'Завершен',
  cancelled: 'Отменен'
};

const filterLabels = {
  inactive: 'Неактивные',
  active: 'Активные',
  finished: 'Завершенные'
};

const statusGroups = {
  inactive: ['pending', 'returned'],
  active: ['published', 'active'],
  finished: ['finished']
};

const formatMoney = (value) =>
  new Intl.NumberFormat('ru-BY', { style: 'currency', currency: 'BYN' }).format(Number(value || 0));

function MyAuctions({ onEdit }) {
  const dispatch = useDispatch();
  const { accessToken } = useSelector((state) => state.auth);
  const { items, status, message } = useSelector((state) => state.auction);
  const [activeFilter, setActiveFilter] = useState('inactive');

  useEffect(() => {
    if (accessToken) {
      dispatch(fetchMyAuctions({ token: accessToken }));
    }
  }, [accessToken, dispatch]);

  const filteredItems = useMemo(
    () => items.filter((auction) => statusGroups[activeFilter].includes(auction.status)),
    [activeFilter, items]
  );

  const removeLot = async (id) => {
    await dispatch(deleteAuction({ id, token: accessToken }));
  };

  return (
    <section className={styles.panel}>
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
        {filteredItems.map((auction) => {
          const mainPhoto = auction.photos?.find((photo) => photo.isMain) || auction.photos?.[0];
          const editable = ['pending', 'returned'].includes(auction.status);

          return (
            <article className={styles.lotCard} key={auction.id}>
              {mainPhoto ? (
                <img className={styles.lotCard__image} src={mainPhoto.url} alt={auction.item.title} />
              ) : (
                <div className={styles.lotCard__placeholder}>Фото не загружено</div>
              )}
              <div className={styles.lotCard__body}>
                <span className={styles.statusPanel__badge}>{statusLabels[auction.status] || auction.status}</span>
                <h2>{auction.item.title}</h2>
                <p>{auction.lotNumber} · {auctionCategoryLabels[auction.item.category]}</p>
                <strong>{formatMoney(auction.pricing.priceWithVat)}</strong>
                {auction.status === 'returned' && auction.moderationComment && (
                  <div className={styles.lotCard__comment}>
                    <strong>Причина возврата</strong>
                    <p>{auction.moderationComment}</p>
                  </div>
                )}
                {editable && (
                  <div className={styles.lotCard__actions}>
                    <button className={styles.buttonSecondary} type="button" onClick={() => onEdit?.(auction)}>
                      Редактировать
                    </button>
                    <button className={styles.buttonDanger} type="button" onClick={() => removeLot(auction.id)}>
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default MyAuctions;
