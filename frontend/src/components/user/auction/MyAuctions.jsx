import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from '../../../App.module.css';
import { auctionCategoryLabels } from '../../../constants/auctionConstants.js';
import { fetchMyAuctions } from '../../../features/auction/auctionSlice.js';

const statusLabels = {
  pending: 'Ожидает проверки',
  returned: 'Возвращен на доработку',
  published: 'Опубликован',
  active: 'Активен',
  finished: 'Завершен',
  cancelled: 'Отменен'
};

const formatMoney = (value) =>
  new Intl.NumberFormat('ru-BY', { style: 'currency', currency: 'BYN' }).format(Number(value || 0));

function MyAuctions() {
  const dispatch = useDispatch();
  const { accessToken } = useSelector((state) => state.auth);
  const { items, status, message } = useSelector((state) => state.auction);

  useEffect(() => {
    if (accessToken) {
      dispatch(fetchMyAuctions({ token: accessToken }));
    }
  }, [accessToken, dispatch]);

  return (
    <section className={styles.panel}>
      {status === 'loading' && <p className={styles.panel__text}>Загрузка лотов...</p>}
      {status === 'failed' && <p className={styles.message__error}>{message}</p>}
      {status !== 'loading' && items.length === 0 && <p className={styles.panel__text}>Лотов пока нет.</p>}

      <div className={styles.lotGrid}>
        {items.map((auction) => {
          const mainPhoto = auction.photos?.find((photo) => photo.isMain) || auction.photos?.[0];

          return (
            <article className={styles.lotCard} key={auction.id}>
              {mainPhoto && <img className={styles.lotCard__image} src={mainPhoto.url} alt={auction.item.title} />}
              <div className={styles.lotCard__body}>
                <span className={styles.statusPanel__badge}>{statusLabels[auction.status] || auction.status}</span>
                <h2>{auction.item.title}</h2>
                <p>{auction.lotNumber} · {auctionCategoryLabels[auction.item.category]}</p>
                <strong>{formatMoney(auction.pricing.priceWithVat)}</strong>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default MyAuctions;
