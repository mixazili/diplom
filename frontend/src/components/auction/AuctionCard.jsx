import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Eye, Heart, MapPin } from 'lucide-react';
import styles from '../../App.module.css';
import { formatCardLocation } from '../../utils/location.js';
import { getYandexMaps } from '../../utils/yandexMaps.js';

export const auctionStatusLabels = {
  draft: 'Черновик',
  pending: 'Ожидает проверки',
  returned: 'Отклонен',
  application_waiting: 'Ожидание приема заявок',
  applications_open: 'Прием заявок',
  bidding_waiting: 'Ожидание торгов',
  bidding_active: 'Идут торги',
  finished_success: 'Торги состоялись',
  finished_failed: 'Торги не состоялись',
  cancelled: 'Отменен'
};

const publishedStatuses = new Set([
  'application_waiting',
  'applications_open',
  'bidding_waiting',
  'bidding_active',
  'finished_success',
  'finished_failed'
]);

const addressCache = new Map();

const formatMoneyParts = (value) => {
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));

  return [formatted, 'BYN'];
};

const formatDate = (value) => {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return 'Дата не указана';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

const formatDuration = (target) => {
  const date = target ? new Date(target) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return 'Срок не указан';
  }

  const diff = Math.max(0, date.getTime() - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (days > 0) {
    return `${days} д. ${hours} ч.`;
  }

  if (hours > 0) {
    return `${hours} ч. ${minutes} мин.`;
  }

  return `${minutes} мин.`;
};

const normalizeAddress = (address = '', item = {}) => formatCardLocation(address, item);

const getAddressFromGeoObject = (geoObject) =>
  geoObject?.properties?.get('metaDataProperty.GeocoderMetaData.text') ||
  geoObject?.getAddressLine?.() ||
  '';

function useAuctionAddress(auction) {
  const geoLocation = auction?.item?.geoLocation || {};
  const address = auction?.item?.locationAddress || '';
  const item = auction?.item || {};
  const lat = Number(geoLocation.lat);
  const lng = Number(geoLocation.lng);
  const cacheKey = Number.isFinite(lat) && Number.isFinite(lng) ? `${lat.toFixed(6)},${lng.toFixed(6)}` : '';
  const [resolvedAddress, setResolvedAddress] = useState(normalizeAddress(address));

  useEffect(() => {
    if (!cacheKey) {
      setResolvedAddress(normalizeAddress(address, item));
      return undefined;
    }

    if (addressCache.has(cacheKey)) {
      setResolvedAddress(addressCache.get(cacheKey));
      return undefined;
    }

    let mounted = true;
    getYandexMaps(import.meta.env.VITE_YANDEX_MAPS_API_KEY)
      .then((ymaps) => ymaps.geocode([lat, lng], { results: 1 }))
      .then((result) => {
        const geoObject = result.geoObjects.get(0);
        const nextAddress = normalizeAddress(getAddressFromGeoObject(geoObject) || address, item);
        addressCache.set(cacheKey, nextAddress);

        if (mounted) {
          setResolvedAddress(nextAddress);
        }
      })
      .catch(() => {
        if (mounted) {
          setResolvedAddress(normalizeAddress(address, item));
        }
      });

    return () => {
      mounted = false;
    };
  }, [address, cacheKey, item.locationCity, item.locationRegion, lat, lng]);

  return resolvedAddress;
}

const getTimeInfo = (auction) => {
  const schedule = auction.schedule || {};

  if (auction.status === 'application_waiting') {
    return ['До начала приема заявок', formatDuration(schedule.applicationStartAt)];
  }

  if (auction.status === 'applications_open') {
    return ['До конца приема заявок', formatDuration(schedule.applicationEndAt)];
  }

  if (auction.status === 'bidding_waiting') {
    return ['До начала торгов', formatDuration(schedule.biddingStartAt)];
  }

  if (auction.status === 'bidding_active') {
    return ['До конца торгов', formatDuration(schedule.biddingEndAt)];
  }

  if (['finished_success', 'finished_failed'].includes(auction.status)) {
    return ['Дата окончания торгов', formatDate(schedule.biddingEndAt)];
  }

  return null;
};

const getDisplayPrice = (auction) =>
  auction.currentPrice || auction.lastBidPrice || auction.pricing?.priceWithVat || 0;

function PhotoCarousel({ auction, showStatus, showLike, showViews, timeInfo, statusDanger = false, mediaMeta = '' }) {
  const photos = useMemo(() => {
    const source = auction.photos?.length > 0 ? auction.photos : [];
    const mainPhoto = source.find((item) => item.isMain);
    return mainPhoto ? [mainPhoto, ...source.filter((item) => item !== mainPhoto)] : source;
  }, [auction.photos]);
  const [activePhoto, setActivePhoto] = useState(0);
  const photo = photos[activePhoto] || photos.find((item) => item.isMain) || photos[0];

  const updatePhotoByMouse = (event) => {
    if (photos.length < 2) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const offset = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width);
    const index = Math.min(photos.length - 1, Math.floor((offset / bounds.width) * photos.length));
    setActivePhoto(index);
  };

  return (
    <div className={styles.auctionCard__media} onMouseMove={updatePhotoByMouse}>
      <div className={styles.auctionCard__segments}>
        {(photos.length > 0 ? photos : [null]).map((item, index) => (
          <span className={index === activePhoto ? styles['auctionCard__segment--active'] : ''} key={item?.path || index} />
        ))}
      </div>

      {photo ? (
        <img src={photo.url} alt={auction.item?.title || 'Фото лота'} />
      ) : (
        <div className={styles.auctionCard__placeholder}>Фото не загружено</div>
      )}

      {showStatus && (
        <span className={`${styles.auctionCard__status} ${statusDanger ? styles['auctionCard__status--danger'] : ''}`}>
          {auctionStatusLabels[auction.status] || auction.status}
        </span>
      )}
      {(timeInfo || mediaMeta) && (
        <span className={styles.auctionCard__time} title={timeInfo?.[0] || mediaMeta}>
          <Clock className={styles.auctionCard__icon} aria-hidden="true" size={16} strokeWidth={2.4} />
          {mediaMeta ? (
            <span className={styles.auctionCard__mediaMeta}>
              {mediaMeta.split('\n').map((line) => <span key={line}>{line}</span>)}
            </span>
          ) : (
            <strong>{timeInfo[1]}</strong>
          )}
        </span>
      )}
      {showLike && (
        <button className={styles.auctionCard__like} type="button" aria-label="Добавить в избранное">
          <Heart size={22} strokeWidth={2.1} />
        </button>
      )}
      {showViews && (
        <span className={styles.auctionCard__views} title="Количество просмотров">
          <Eye className={styles.auctionCard__icon} aria-hidden="true" size={17} strokeWidth={2.4} />
          {auction.viewsCount || 0}
        </span>
      )}
    </div>
  );
}

function ParticipationBlock({ auction, isVerified, participant }) {
  if (!publishedStatuses.has(auction.status)) {
    return null;
  }

  if (!isVerified) {
    return <div className={styles.auctionCard__participation}>Для участия нужна одобренная верификация.</div>;
  }

  if (auction.status === 'applications_open') {
    if (participant?.number) {
      return <div className={styles.auctionCard__participation}>Ваш номер участника: <strong>{participant.number}</strong></div>;
    }

    if (participant?.status === 'deposit_required') {
      return <div className={styles.auctionCard__participation}>Статус заявки: ожидается оплата задатка</div>;
    }

    return <button className={styles.button} type="button" disabled>Подать заявку</button>;
  }

  if (['bidding_waiting', 'finished_failed'].includes(auction.status) && participant?.number) {
    return <div className={styles.auctionCard__participation}>Вы участвовали под номером: <strong>{participant.number}</strong></div>;
  }

  if (auction.status === 'bidding_active') {
    return (
      <div className={styles.auctionCard__participation}>
        {participant?.number && <span>Ваш номер: <strong>{participant.number}</strong></span>}
        {auction.leadingParticipantNumber && <span>Лидер торгов: <strong>{auction.leadingParticipantNumber}</strong></span>}
        {auction.pricing?.auctionType === 'increase' && participant?.number && <button className={styles.button} type="button" disabled>Сделать ставку</button>}
      </div>
    );
  }

  if (auction.status === 'finished_success' && participant?.number) {
    return (
      <div className={styles.auctionCard__participation}>
        <span>Вы участвовали под номером: <strong>{participant.number}</strong></span>
        <span>{participant.isWinner ? 'Вы победили' : 'Вы проиграли'}</span>
      </div>
    );
  }

  return null;
}

function AuctionCard({
  auction,
  mode = 'owner',
  isAuthenticated = false,
  isVerified = false,
  participant = null,
  onEdit,
  onDelete,
  onReturnToDraft,
  onOpen,
  footerMeta = '',
  statusOverride = ''
}) {
  const address = useAuctionAddress(auction);
  const isPublished = publishedStatuses.has(auction.status);
  const isOwner = mode === 'owner';
  const showStatus = mode !== 'journal' || Boolean(statusOverride);
  const showLike = Boolean(isAuthenticated) && !isOwner && isPublished;
  const showViews = isPublished;
  const timeInfo = getTimeInfo(auction);
  const statusDanger = auction.status === 'returned' || statusOverride === auctionStatusLabels.returned;
  const editable = ['draft', 'pending', 'returned'].includes(auction.status);
  const canReturnToDraft = auction.status === 'application_waiting';
  const deletable = ['draft', 'pending', 'returned', 'application_waiting'].includes(auction.status);
  const cardTitle = auction.item?.title || 'Лот без названия';
  const clickableCard = ['journal', 'public', 'catalog', 'moderation'].includes(mode) && Boolean(onOpen);
  const [priceValue, priceCurrency] = formatMoneyParts(getDisplayPrice(auction));

  const cardActions = useMemo(() => {
    if (mode !== 'owner') {
      return null;
    }

    if (!editable && !canReturnToDraft && !deletable) {
      return null;
    }

    return (
      <>
        {editable && (
          <button className={styles.buttonSecondary} type="button" onClick={() => onEdit?.(auction)}>
            Редактировать
          </button>
        )}
        {canReturnToDraft && (
          <button className={styles.buttonSecondary} type="button" onClick={() => onReturnToDraft?.(auction.id)}>
            Вернуть в черновик
          </button>
        )}
        {deletable && (
          <button className={styles.buttonDanger} type="button" onClick={() => onDelete?.(auction.id)}>
            Удалить
          </button>
        )}
      </>
    );
  }, [auction, canReturnToDraft, deletable, editable, mode, onDelete, onEdit, onOpen, onReturnToDraft]);

  return (
    <article
      className={`${styles.auctionCard} ${clickableCard ? styles['auctionCard--clickable'] : ''}`}
      onClick={clickableCard ? onOpen : undefined}
      onKeyDown={clickableCard ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      } : undefined}
      role={clickableCard ? 'button' : undefined}
      tabIndex={clickableCard ? 0 : undefined}
    >
      <PhotoCarousel
        auction={{ ...auction, status: statusOverride || auction.status }}
        showStatus={showStatus}
        showLike={showLike}
        showViews={showViews}
        timeInfo={timeInfo}
        statusDanger={statusDanger}
        mediaMeta={mode === 'journal' ? footerMeta : ''}
      />

      <div className={styles.auctionCard__body}>
        {isPublished && auction.lotNumber && <span className={styles.auctionCard__lotNumber}>Лот №{auction.lotNumber}</span>}
        <h3>{cardTitle}</h3>
        <div className={styles.auctionCard__info}>
          <span className={styles.auctionCard__location}>
            <MapPin className={styles.auctionCard__locationIcon} aria-hidden="true" size={17} strokeWidth={2.2} />
            <span>{address}</span>
          </span>
          {auction.status === 'returned' && auction.moderationComment && (
            <div className={styles.lotCard__comment}>
              <strong>Причина отклонения</strong>
              <p>{auction.moderationComment}</p>
            </div>
          )}
          <span className={styles.auctionCard__price}>
            <strong>{priceValue}</strong> <span>{priceCurrency}</span>
          </span>
        </div>

        {!isOwner && <ParticipationBlock auction={auction} isVerified={isVerified} participant={participant} />}
        {footerMeta && mode !== 'journal' && <span className={styles.auctionCard__footerMeta}>{footerMeta}</span>}

        {cardActions && <div className={styles.auctionCard__actions}>{cardActions}</div>}
      </div>
    </article>
  );
}

export default AuctionCard;
