import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BadgeCheck, Ban, Clock, CreditCard, Eye, FileText, Heart, MapPin, Trophy } from 'lucide-react';
import { formatCardLocation } from '../../utils/location.js';
import { getClientNow } from '../../utils/time.js';
import { getYandexMaps } from '../../utils/yandexMaps.js';
import styles from './AuctionCard.module.css';

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
  'finished_failed',
  'cancelled'
]);

const cancellableStatuses = new Set(['application_waiting', 'applications_open', 'bidding_waiting', 'bidding_active']);

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

const formatDuration = (target, timeOffsetMs = 0) => {
  const date = target ? new Date(target) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return 'Срок не указан';
  }

  const diff = Math.max(0, date.getTime() - getClientNow(timeOffsetMs));
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

const getTimeInfo = (auction, timeOffsetMs = 0) => {
  const schedule = auction.schedule || {};

  if (auction.status === 'application_waiting') {
    return ['До начала приема заявок', formatDuration(schedule.applicationStartAt, timeOffsetMs)];
  }

  if (auction.status === 'applications_open') {
    return ['До конца приема заявок', formatDuration(schedule.applicationEndAt, timeOffsetMs)];
  }

  if (auction.status === 'bidding_waiting') {
    return ['До начала торгов', formatDuration(schedule.biddingStartAt, timeOffsetMs)];
  }

  if (auction.status === 'bidding_active') {
    return ['До конца торгов', formatDuration(schedule.biddingEndAt, timeOffsetMs)];
  }

  if (['finished_success', 'finished_failed', 'cancelled'].includes(auction.status)) {
    return ['Дата окончания торгов', formatDate(schedule.biddingEndAt)];
  }

  return null;
};

const getDecreaseCurrentPrice = (auction, timeOffsetMs = 0) => {
  const pricing = auction.pricing || {};
  const schedule = auction.schedule || {};
  const startPrice = Number(pricing.priceWithVat || 0);
  const minPrice = Number(pricing.minPriceWithVat || startPrice);
  const stepsCount = Math.max(Number(pricing.bidStepsCount || 0), 1);
  const step = Number(pricing.calculatedBidStep || ((startPrice - minPrice) / stepsCount));
  const start = new Date(schedule.biddingStartAt).getTime();
  const end = new Date(schedule.biddingEndAt).getTime();
  const now = getClientNow(timeOffsetMs);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || now <= start) {
    return startPrice;
  }

  if (now >= end) {
    return minPrice;
  }

  const elapsedSteps = Math.floor((now - start) / ((end - start) / stepsCount));
  return Math.max(minPrice, startPrice - elapsedSteps * step);
};

const getDisplayPrice = (auction, timeOffsetMs = 0) => {
  if (auction.status === 'finished_success') {
    return auction.winningBidAmount || auction.lastBidPrice || auction.currentPrice || auction.pricing?.priceWithVat || 0;
  }

  if (auction.status === 'bidding_active' && auction.pricing?.auctionType === 'decrease') {
    return getDecreaseCurrentPrice(auction, timeOffsetMs);
  }

  return auction.currentPrice || auction.lastBidPrice || auction.pricing?.priceWithVat || 0;
};

function PhotoCarousel({
  auction,
  showStatus,
  showLike,
  showViews,
  timeInfo,
  statusDanger = false,
  mediaMeta = '',
  isFavorite = false,
  onToggleFavorite
}) {
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
        <img src={photo.url} alt={auction.item?.title || 'Фото предмета торгов'} />
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
        <button
          className={`${styles.auctionCard__like} ${isFavorite ? styles['auctionCard__like--active'] : ''}`}
          type="button"
          aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite?.(auction);
          }}
        >
          <Heart size={23} strokeWidth={2.1} fill={isFavorite ? 'currentColor' : 'none'} />
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

function ParticipationMessage({ icon: Icon, title, text, tone = 'default', children }) {
  return (
    <div className={`${styles.auctionCard__participation} ${styles[`auctionCard__participation--${tone}`] || ''}`}>
      <div className={styles.auctionCard__participationHeader}>
        {Icon && <Icon size={18} />}
        <strong>{title}</strong>
      </div>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

function ParticipationBlock({ auction, isVerified, participant, onApply, onPayDeposit, onPayLot }) {
  if (!publishedStatuses.has(auction.status)) {
    return null;
  }

  if (!isVerified) {
    return (
      <ParticipationMessage
        icon={AlertCircle}
        title="Участие недоступно"
        text="Для участия нужна одобренная верификация."
        tone="warning"
      />
    );
  }

  const participantNumber = participant?.participantNumber || participant?.number || null;

  if (auction.status === 'finished_failed' || auction.status === 'cancelled') {
    return null;
  }

  if (auction.status === 'finished_success' && participantNumber) {
    if (participant.isWinner) {
      return (
        <ParticipationMessage icon={Trophy} title="Вы победили в торгах" tone="success">
          {participant.lotPaymentStatus === 'paid' && (
            <span className={styles.auctionCard__paidMark}>
              <BadgeCheck size={17} />
              Лот оплачен
            </span>
          )}
          {participant.lotPaymentStatus !== 'paid' && onPayLot && (
            <button className={styles.button} type="button" onClick={(event) => { event.stopPropagation(); onPayLot(auction); }}>Оплатить лот</button>
          )}
        </ParticipationMessage>
      );
    }

    return (
      <ParticipationMessage icon={AlertCircle} title="Вы проиграли в торгах" tone="muted" />
    );
  }

  if (participantNumber) {
    return (
      <ParticipationMessage icon={BadgeCheck} title="Участие в торгах одобрено" tone="success" />
    );
  }

  if (auction.status === 'applications_open') {
    if (participant?.status === 'deposit_required') {
      return (
        <ParticipationMessage
          icon={CreditCard}
          title="Требуется задаток"
          text="Для участия в торгах необходимо внести задаток."
          tone="warning"
        >
          {onPayDeposit && <button className={styles.button} type="button" onClick={(event) => { event.stopPropagation(); onPayDeposit(auction); }}>Оплатить задаток</button>}
        </ParticipationMessage>
      );
    }

    return (
      <ParticipationMessage
        icon={BadgeCheck}
        title="Вы можете участвовать в торгах"
        tone="default"
      >
        <button className={styles.button} type="button" onClick={(event) => { event.stopPropagation(); onApply?.(auction); }}>Подать заявку</button>
      </ParticipationMessage>
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
  onApply,
  onOpen,
  onPayDeposit,
  onPayLot,
  onOpenProtocol,
  onToggleFavorite,
  onCancelAuction,
  canCancelAuction = false,
  footerMeta = '',
  statusOverride = '',
  currentUserId = null,
  userRole = 'user',
  timeOffsetMs = 0
}) {
  const address = useAuctionAddress(auction);
  const isPublished = publishedStatuses.has(auction.status);
  const isOwnAuction =
    mode === 'owner' ||
    (currentUserId && String(auction.owner?.id || auction.owner || '') === String(currentUserId));
  const isOwner = mode === 'owner';
  const showStatus = mode !== 'journal' || Boolean(statusOverride);
  const showLike = Boolean(isAuthenticated) && !isOwnAuction && isPublished;
  const showViews = isPublished;
  const timeInfo = getTimeInfo(auction, timeOffsetMs);
  const statusDanger = auction.status === 'returned' || statusOverride === auctionStatusLabels.returned;
  const editable = ['draft', 'pending', 'returned'].includes(auction.status);
  const canReturnToDraft = auction.status === 'application_waiting';
  const deletable = ['draft', 'pending', 'returned', 'application_waiting'].includes(auction.status);
  const cardTitle = auction.item?.title || 'Предмет торгов без названия';
  const ownerCanOpen = mode !== 'owner' || !['draft', 'pending', 'returned'].includes(auction.status);
  const clickableCard = (['journal', 'public', 'catalog', 'moderation'].includes(mode) || mode === 'owner') && ownerCanOpen && Boolean(onOpen);
  const [priceValue, priceCurrency] = formatMoneyParts(getDisplayPrice(auction, timeOffsetMs));
  const viewerParticipation = participant || auction.viewerParticipation || auction.participation || null;
  const [favorite, setFavorite] = useState(Boolean(auction.isFavorite));
  const canCancel = canCancelAuction && cancellableStatuses.has(auction.status) && typeof onCancelAuction === 'function';

  useEffect(() => {
    setFavorite(Boolean(auction.isFavorite));
  }, [auction.isFavorite, auction.id]);

  const toggleFavorite = async () => {
    if (!onToggleFavorite) {
      return;
    }

    const result = await onToggleFavorite(auction);
    if (typeof result?.isFavorite === 'boolean') {
      setFavorite(result.isFavorite);
    } else {
      setFavorite((current) => !current);
    }
  };

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
          <button className={styles.buttonSecondary} type="button" onClick={(event) => { event.stopPropagation(); onEdit?.(auction); }}>
            Редактировать
          </button>
        )}
        {canReturnToDraft && (
          <button className={styles.buttonSecondary} type="button" onClick={(event) => { event.stopPropagation(); onReturnToDraft?.(auction.id); }}>
            Вернуть в черновик
          </button>
        )}
        {deletable && (
          <button className={styles.buttonDanger} type="button" onClick={(event) => { event.stopPropagation(); onDelete?.(auction.id); }}>
            Удалить
          </button>
        )}
      </>
    );
  }, [auction, canReturnToDraft, deletable, editable, mode, onDelete, onEdit, onReturnToDraft]);
  const hasProtocol = ['finished_success', 'finished_failed'].includes(auction.status) && typeof onOpenProtocol === 'function';

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
        isFavorite={favorite}
        onToggleFavorite={toggleFavorite}
      />

      <div className={styles.auctionCard__body}>
        {isPublished && auction.auctionNumber && <span className={styles.auctionCard__auctionNumber}>Аукцион №{auction.auctionNumber}</span>}
        <h3>{cardTitle}</h3>
        <div className={styles.auctionCard__info}>
          <span className={styles.auctionCard__location}>
            <MapPin className={styles.auctionCard__locationIcon} aria-hidden="true" size={17} strokeWidth={2.2} />
            <span>{address}</span>
          </span>
          {auction.status === 'returned' && auction.moderationComment && (
            <div className={styles.auctionCard__comment}>
              <strong>Причина отклонения</strong>
              <p>{auction.moderationComment}</p>
            </div>
          )}
          <span className={styles.auctionCard__price}>
            <strong>{priceValue}</strong> <span>{priceCurrency}</span>
          </span>
        </div>

        {!isOwnAuction && userRole !== 'admin' && userRole !== 'moderator' && (
          <ParticipationBlock
            auction={auction}
            isVerified={isVerified}
            participant={viewerParticipation}
            onApply={onApply || onOpen}
            onPayDeposit={onPayDeposit || onOpen}
            onPayLot={onPayLot || onOpen}
          />
        )}
        {hasProtocol && (
          <button
            className={styles.protocolButton}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenProtocol?.(auction);
            }}
          >
            <FileText size={18} />
            Протокол электронных торгов
          </button>
        )}
        {footerMeta && mode !== 'journal' && <span className={styles.auctionCard__footerMeta}>{footerMeta}</span>}

        {canCancel && (
          <div className={styles.auctionCard__staffActions}>
            <button
              className={styles.buttonDanger}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCancelAuction?.(auction);
              }}
            >
              <Ban size={18} />
              Отменить аукцион
            </button>
          </div>
        )}

        {cardActions && <div className={styles.auctionCard__actions}>{cardActions}</div>}
      </div>
    </article>
  );
}

export default AuctionCard;
