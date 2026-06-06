import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  AlertCircle,
  Ban,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Heart,
  MapPin,
  Maximize2,
  BadgeCheck,
  Banknote,
  Gavel,
  Users,
  Trophy,
  X
} from 'lucide-react';
import { apiRequest, authHeader } from '../../api/client.js';
import { getSocketBaseUrl } from '../../utils/socket.js';
import { operatorInfo } from '../../constants/auctionConstants.js';
import { formatPhoneDisplay } from '../../utils/inputFormatters.js';
import { getClientNow } from '../../utils/time.js';
import { getYandexMaps } from '../../utils/yandexMaps.js';
import AuctionActionModals from '../auction/AuctionActionModals.jsx';
import AuctionCard, { auctionStatusLabels } from '../auction/AuctionCard.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import styles from './AuctionPage.module.css';

const finishedStatuses = new Set(['finished_success', 'finished_failed', 'cancelled']);
const tradingStatuses = new Set(['bidding_active', 'finished_success', 'finished_failed']);
const cancellableStatuses = new Set(['application_waiting', 'applications_open', 'bidding_waiting', 'bidding_active']);

const formatDateTime = (value, withMs = false) => {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return 'Не указано';
  }

  const formatted = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: withMs ? '2-digit' : undefined,
    hour12: false
  }).format(date);

  return withMs ? `${formatted}.${String(date.getMilliseconds()).padStart(3, '0')}` : formatted;
};

const formatBidDate = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return 'Не указано';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

const formatBidTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return 'Не указано';
  }

  const time = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);

  return `${time}.${String(date.getMilliseconds()).padStart(3, '0')}`;
};

const formatMoney = (value) =>
  `${new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))} BYN`;

const formatDays = (value) => {
  const days = Number(value || 0);

  if (!days) {
    return 'Не указано';
  }

  if (days % 10 === 1 && days % 100 !== 11) {
    return `${days} день`;
  }

  if ([2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100)) {
    return `${days} дня`;
  }

  return `${days} дней`;
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

const getTimeInfo = (auction, timeOffsetMs = 0) => {
  const schedule = auction.schedule || {};

  if (auction.status === 'application_waiting') {
    return ['До начала приема заявок', formatDuration(schedule.applicationStartAt, timeOffsetMs)];
  }

  if (auction.status === 'applications_open') {
    return ['До окончания приема заявок', formatDuration(schedule.applicationEndAt, timeOffsetMs)];
  }

  if (auction.status === 'bidding_waiting') {
    return ['До начала торгов', formatDuration(schedule.biddingStartAt, timeOffsetMs)];
  }

  if (auction.status === 'bidding_active') {
    return ['До окончания торгов', formatDuration(schedule.biddingEndAt, timeOffsetMs)];
  }

  if (finishedStatuses.has(auction.status)) {
    return ['Дата завершения торгов', formatDateTime(schedule.biddingEndAt)];
  }

  return null;
};

const getAuctionTypeLabel = (type) => (type === 'decrease' ? 'Аукцион на понижение' : 'Аукцион на повышение');

const getDecreasePriceState = (auction, timeOffsetMs = 0) => {
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
    return {
      currentPrice: startPrice,
      nextDropAt: new Date(start),
      reductions: []
    };
  }

  const stepDuration = (end - start) / stepsCount;
  const elapsedSteps = Math.min(stepsCount, Math.max(0, Math.floor((now - start) / stepDuration)));
  const currentPrice = Math.max(minPrice, startPrice - elapsedSteps * step);
  const nextDropAt = elapsedSteps < stepsCount ? new Date(start + (elapsedSteps + 1) * stepDuration) : null;
  const reductions = Array.from({ length: stepsCount + 1 }, (_, index) => ({
    at: new Date(start + Math.min(index, stepsCount) * stepDuration),
    amount: Math.max(minPrice, startPrice - index * step),
    active: index === elapsedSteps
  }));

  return { currentPrice, nextDropAt, reductions };
};

const getFailedReason = (auction, bids) => {
  if (auction.status === 'cancelled') {
    return auction.resultReason || auction.moderationComment || 'Аукцион отменен оператором торгов.';
  }

  if (auction.status !== 'finished_failed') {
    return '';
  }

  if (auction.resultReason) {
    if (auction.resultReason.toLowerCase().includes('не было')) {
      return 'Не было сделано ни одной ставки.';
    }

    return auction.resultReason;
  }

  return bids.length === 0
    ? 'Не было сделано ни одной ставки.'
    : 'Условия признания торгов состоявшимися не выполнены.';
};

function InfoRow({ label, value }) {
  const displayValue = /телефон/i.test(label) ? formatPhoneDisplay(value) : value;

  return (
    <div className={styles.auctionPage__infoRow}>
      <span>{label}</span>
      <strong>{displayValue || 'Не указано'}</strong>
    </div>
  );
}

function SellerInfoRows({ seller = {} }) {
  const taxLabel = seller.isResident ? 'УНП' : 'ИНН/БИН';

  if (seller.accountType === 'legal_entity') {
    return (
      <>
        <InfoRow label="Краткое наименование" value={seller.organizationName} />
        <InfoRow label={taxLabel} value={seller.unp} />
        <InfoRow label="Юридический адрес" value={seller.legalAddress} />
      </>
    );
  }

  if (seller.accountType === 'entrepreneur') {
    return (
      <>
        <InfoRow label="ФИО" value={seller.fullName} />
        <InfoRow label={taxLabel} value={seller.unp} />
        <InfoRow label="Телефон" value={seller.phone} />
      </>
    );
  }

  return (
    <>
      <InfoRow label="ФИО" value={seller.fullName} />
      <InfoRow label="Телефон" value={seller.phone} />
      <InfoRow label="Дополнительный телефон" value={seller.additionalPhone} />
    </>
  );
}

function AuctionStatusBanner({ auction, bids, variant = 'default', timeInfo = null }) {
  const latestBid = bids[bids.length - 1];
  const winningAmount = latestBid?.amount || auction.winningBidAmount;
  const statusText = auctionStatusLabels[auction.status] || auction.status;
  const failedReason = getFailedReason(auction, bids);
  const isFinal = finishedStatuses.has(auction.status);
  const StatusIcon = auction.status === 'finished_success' ? Trophy : AlertCircle;

  return (
    <div className={`${styles.auctionStatusBanner} ${variant === 'large' ? styles['auctionStatusBanner--large'] : ''}`}>
      <div className={styles.auctionStatusBanner__top}>
        <strong className={styles.auctionStatusBanner__title}>
          {isFinal && <StatusIcon size={22} />}
          {statusText}
        </strong>
        {timeInfo && (
          <span className={styles.auctionStatusBanner__time} title={timeInfo[0]}>
            <Clock size={18} />
            <strong>{timeInfo[1]}</strong>
          </span>
        )}
      </div>
      {auction.status === 'finished_success' && (
        <span>
          Победитель — участник №{latestBid?.participantNumber || auction.winnerParticipantNumber || 'не определен'}.
          {winningAmount ? ` Ставка: ${formatMoney(winningAmount)}.` : ''}
        </span>
      )}
      {['finished_failed', 'cancelled'].includes(auction.status) && (
        <span>Причина: {failedReason}</span>
      )}
    </div>
  );
}

function PublicAuctionMap({ geoLocation }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const fitTimersRef = useRef([]);
  const [loadError, setLoadError] = useState('');
  const lat = Number(geoLocation?.lat);
  const lng = Number(geoLocation?.lng);
  const coords = Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;

  useEffect(() => {
    if (!coords) {
      return undefined;
    }

    let mounted = true;

    getYandexMaps(import.meta.env.VITE_YANDEX_MAPS_API_KEY)
      .then((ymaps) => {
        if (!mounted || !mapRef.current || mapInstanceRef.current) {
          return;
        }

        const map = new ymaps.Map(
          mapRef.current,
          { center: coords, zoom: 15, controls: [] },
          { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true }
        );

        map.behaviors.disable(['dblClickZoom', 'rightMouseButtonMagnifier']);
        map.geoObjects.add(new ymaps.Placemark(coords, {}, { preset: 'islands#redIcon', draggable: false }));
        mapInstanceRef.current = map;

        const fitMapToViewport = () => {
          map.container.fitToViewport();
        };

        const scheduleFit = () => {
          window.requestAnimationFrame(fitMapToViewport);
          fitTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
          fitTimersRef.current = [
            window.setTimeout(fitMapToViewport, 80),
            window.setTimeout(fitMapToViewport, 250)
          ];
        };

        resizeObserverRef.current = new ResizeObserver(scheduleFit);
        resizeObserverRef.current.observe(mapRef.current);
        window.addEventListener('resize', scheduleFit);
        mapInstanceRef.current.__scheduleFit = scheduleFit;
        scheduleFit();
      })
      .catch((error) => {
        if (mounted) {
          setLoadError(error.message || 'Не удалось загрузить карту');
        }
      });

    return () => {
      mounted = false;
    };
  }, [coords?.[0], coords?.[1]]);

  useEffect(() => () => {
    if (mapInstanceRef.current) {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      fitTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      fitTimersRef.current = [];
      window.removeEventListener('resize', mapInstanceRef.current.__scheduleFit);
      mapInstanceRef.current.destroy();
      mapInstanceRef.current = null;
    }
  }, []);

  if (!coords) {
    return (
      <div className={styles.auctionPageMap}>
        <span>Геометка не указана</span>
      </div>
    );
  }

  return (
    <div className={styles.auctionPageMap} ref={mapRef}>
      {loadError && <span>{loadError}</span>}
    </div>
  );
}

function Gallery({ title, photos }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const activePhoto = photos[activeIndex];

  const go = (direction) => {
    setActiveIndex((current) => {
      if (photos.length === 0) {
        return 0;
      }

      return (current + direction + photos.length) % photos.length;
    });
  };

  return (
    <>
      <section className={styles.auctionPageGallery}>
        <div className={styles.auctionPageGallery__main}>
          {activePhoto ? (
            <img src={activePhoto.url} alt={title} />
          ) : (
            <div className={styles.auctionCard__placeholder}>Фото не загружено</div>
          )}

          {activePhoto && (
            <button className={styles.auctionPageGallery__fullscreen} type="button" onClick={() => setFullscreen(true)} aria-label="Открыть фото">
              <Maximize2 size={20} />
            </button>
          )}

          {photos.length > 1 && (
            <>
              <button className={styles.auctionPageGallery__arrow} type="button" onClick={() => go(-1)} aria-label="Предыдущее фото">
                <ChevronLeft size={22} />
              </button>
              <button className={`${styles.auctionPageGallery__arrow} ${styles['auctionPageGallery__arrow--next']}`} type="button" onClick={() => go(1)} aria-label="Следующее фото">
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>

        {photos.length > 1 && (
          <div className={styles.auctionPageGallery__thumbs}>
            {photos.map((photo, index) => (
              <button
                className={index === activeIndex ? styles['auctionPageGallery__thumb--active'] : ''}
                type="button"
                key={photo.path || photo.url}
                onClick={() => setActiveIndex(index)}
              >
                <img src={photo.url} alt={title} />
              </button>
            ))}
          </div>
        )}
      </section>

      {fullscreen && activePhoto && (
        <div className={styles.imageModal} role="dialog" aria-modal="true">
          <button className={styles.imageModal__close} type="button" onClick={() => setFullscreen(false)} aria-label="Закрыть просмотр">
            <X size={24} />
          </button>
          {photos.length > 1 && (
            <button className={styles.imageModal__arrow} type="button" onClick={() => go(-1)} aria-label="Предыдущее фото">
              <ChevronLeft size={34} />
            </button>
          )}
          <img src={activePhoto.url} alt={title} />
          {photos.length > 1 && (
            <button className={`${styles.imageModal__arrow} ${styles['imageModal__arrow--next']}`} type="button" onClick={() => go(1)} aria-label="Следующее фото">
              <ChevronRight size={34} />
            </button>
          )}
        </div>
      )}
    </>
  );
}

function BidHistory({ auction, bids }) {
  const [expanded, setExpanded] = useState(false);

  if (bids.length === 0) {
    return <p className={styles.panel__text}>Ставок пока нет.</p>;
  }

  const newestFirst = [...bids].reverse();
  const visibleBids = expanded ? newestFirst : newestFirst.slice(0, 1);

  return (
    <div className={styles.bidHistory}>
      <div className={styles.bidHistory__header}>
        <span>Участник</span>
        <span>Дата</span>
        <span>Время</span>
        <span>Ставка</span>
      </div>
      {visibleBids.map((bid) => {
        const sourceIndex = bids.findIndex((item) => item.id === bid.id);
        const previous = bids[sourceIndex - 1]?.amount || auction.pricing?.priceWithVat || 0;
        const delta = Math.max(Number(bid.amount || 0) - Number(previous || 0), 0);

        return (
          <div className={styles.bidHistory__row} key={bid.id}>
            <strong>№{bid.participantNumber || sourceIndex + 1}</strong>
            <span>{formatBidDate(bid.createdAt)}</span>
            <span>{formatBidTime(bid.createdAt)}</span>
            <b>{formatMoney(bid.amount)} <small>+{formatMoney(delta)}</small></b>
          </div>
        );
      })}
      {bids.length > 1 && (
        <button className={styles.buttonSecondary} type="button" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Свернуть ход торгов' : 'Показать весь ход торгов'}
        </button>
      )}
    </div>
  );
}

function TradingBlock({
  auction,
  user,
  viewer,
  bids,
  timeOffsetMs = 0,
  onApply,
  onPayDeposit,
  onPayLot,
  onPlaceBid,
  onOpenProtocol,
  onCancelAuction,
  canCancelAuction = false,
  actionLoading
}) {
  const participation = viewer?.participation;
  const [bidAmount, setBidAmount] = useState('');
  const isLoggedIn = Boolean(user);
  const isVerified = user?.verificationStatus === 'approved';
  const isOwner = viewer?.isOwner;
  const hasPaidDeposit = participation?.depositStatus === 'paid' || participation?.status === 'approved';
  const latestBid = bids[bids.length - 1];
  const isWinner = Boolean(participation?.participantNumber && auction.winnerParticipantNumber === participation.participantNumber);
  const isLeader = Boolean(participation?.participantNumber && latestBid?.participantNumber === participation.participantNumber);
  const isDecrease = auction.pricing?.auctionType === 'decrease';
  const decreaseState = useMemo(() => getDecreasePriceState(auction, timeOffsetMs), [auction, timeOffsetMs]);
  const currentPrice = isDecrease ? decreaseState.currentPrice : latestBid?.amount || auction.pricing?.priceWithVat || 0;
  const bidStep = auction.pricing?.minBidStep || 0;
  const nextBid = isDecrease ? currentPrice : Number(currentPrice || 0) + Number(bidStep || 0);
  const admittedCount = auction.participantStats?.admittedCount || 0;
  const bidDifference = Math.max(Number(bidAmount || 0) - Number(currentPrice || 0), 0);

  useEffect(() => {
    setBidAmount(nextBid ? String(nextBid) : '');
  }, [nextBid]);

  const changeBidByStep = (direction) => {
    const step = Math.max(Number(bidStep || 0), 1);
    const current = Number(bidAmount || nextBid || 0);
    const next = Math.max(Number(nextBid || 0), current + direction * step);
    setBidAmount(String(next));
  };

  const restriction = useMemo(() => {
    if (!isLoggedIn) {
      return 'Для участия в торгах необходимо войти или зарегистрироваться.';
    }

    if (user.role !== 'user') {
      return 'Сотрудники могут просматривать аукционы, но не участвуют в торгах.';
    }

    if (!isVerified) {
      return 'Для участия нужна одобренная верификация.';
    }

    if (isOwner) {
      return 'Продавец не может подавать заявку и участвовать в собственном аукционе.';
    }

    return '';
  }, [isLoggedIn, isOwner, isVerified, user?.role]);

  return (
    <section className={`${styles.auctionPageBlock} ${styles.auctionPageTradingBlock}`}>
      <h2>Проведение торгов</h2>
      {['finished_success', 'finished_failed'].includes(auction.status) && (
        <button className={styles.protocolInlineButton} type="button" onClick={() => onOpenProtocol?.(auction)}>
          <FileText size={20} />
          Посмотреть протокол электронных торгов
        </button>
      )}

      {canCancelAuction && cancellableStatuses.has(auction.status) && (
        <button className={styles.cancelAuctionButton} type="button" onClick={() => onCancelAuction?.(auction)} disabled={actionLoading}>
          <Ban size={20} />
          Отменить аукцион
        </button>
      )}

      {!['finished_failed', 'cancelled'].includes(auction.status) && (
        <section className={styles.auctionPageTradeSection}>
          <div className={styles.tradeSectionHeader}>
            <h3><Users size={20} />Участие в торгах</h3>
            <span>Допущено участников: <strong>{admittedCount}</strong></span>
          </div>
          {restriction ? (
            <div className={styles.auctionPageNotice}>
              <AlertCircle size={18} />
              <p>{restriction} <a href="#" onClick={(event) => event.preventDefault()}>Открыть инструкцию по участию в торгах</a></p>
            </div>
          ) : !participation && auction.status === 'applications_open' ? (
            <div className={styles.auctionPageAction}>
              <p>Вы можете подать заявку и оплатить задаток до окончания приема заявок.</p>
              <button className={styles.button} type="button" onClick={onApply} disabled={actionLoading}>Подать заявку на участие</button>
            </div>
          ) : !participation ? (
            <div className={styles.auctionPageNotice}>
              <AlertCircle size={18} />
              <p>Подача заявки сейчас недоступна. <a href="#" onClick={(event) => event.preventDefault()}>Открыть инструкцию по участию в торгах</a></p>
            </div>
          ) : (
            null
          )}

          {!restriction && participation && (
            <div className={styles.auctionPageParticipation}>
              <div className={styles.tradeStateLine}>
                <span><BadgeCheck size={17} />Статус участия</span>
                <strong>{hasPaidDeposit ? 'Участие одобрено' : 'Ожидается оплата задатка'}</strong>
              </div>
              {hasPaidDeposit && (
                <div className={styles.tradeStateLine}>
                  <span><Users size={17} />Ваш номер участника</span>
                  <strong>№{participation.participantNumber}</strong>
                </div>
              )}
              {participation.status === 'deposit_required' && auction.status === 'applications_open' && (
                <button className={styles.button} type="button" onClick={onPayDeposit} disabled={actionLoading}>Оплатить задаток</button>
              )}
            </div>
          )}
        </section>
      )}

      {auction.status === 'bidding_active' && hasPaidDeposit && (
        <section className={styles.bidPanel}>
          <div className={styles.bidPanel__summary}>
            <h3><Gavel size={20} />Меню ставок</h3>
            <p>{isLeader ? 'Вы лидируете в торгах.' : isDecrease ? `Текущая цена приобретения: ${formatMoney(currentPrice)}.` : `Текущая цена: ${formatMoney(currentPrice)}. Минимальная следующая ставка: ${formatMoney(nextBid)}.`}</p>
            {isDecrease && decreaseState.nextDropAt && <p>Следующее снижение цены: {formatDateTime(decreaseState.nextDropAt)}.</p>}
            {auction.extendedAt && <p>Торги продлены до {formatDateTime(auction.schedule?.biddingEndAt)}.</p>}
          </div>
          {isDecrease ? (
            <button
              className={`${styles.button} ${styles.bidPanel__mainButton}`}
              type="button"
              disabled={actionLoading}
              onClick={() => onPlaceBid(Number(currentPrice))}
            >
              Приобрести предмет торгов
            </button>
          ) : (
            <>
              <div className={styles.bidAmountControl}>
                <button className={styles.bidAmountControl__step} type="button" onClick={() => changeBidByStep(-1)} disabled={isLeader || actionLoading}>
                  -{formatMoney(bidStep)}
                </button>
                <label className={styles.field}>
                  <span className={styles.field__label}>Следующая ставка</span>
                  <input
                    className={styles.field__control}
                    type="number"
                    min={nextBid}
                    step={bidStep || 1}
                    value={bidAmount}
                    onChange={(event) => setBidAmount(event.target.value)}
                    disabled={isLeader}
                  />
                </label>
                <button className={styles.bidAmountControl__step} type="button" onClick={() => changeBidByStep(1)} disabled={isLeader || actionLoading}>
                  +{formatMoney(bidStep)}
                </button>
              </div>
              <div className={styles.bidPanel__delta}>
                Разница с текущей ценой: <strong>+{formatMoney(bidDifference)}</strong>
              </div>
              <button
                className={`${styles.button} ${styles.bidPanel__mainButton}`}
                type="button"
                disabled={isLeader || actionLoading}
                onClick={() => onPlaceBid(Number(bidAmount))}
              >
                Сделать ставку
              </button>
            </>
          )}
        </section>
      )}

      {auction.status === 'finished_success' && participation?.participantNumber && (
        <section className={styles.auctionPageTradeSection}>
          <h3><Trophy size={20} />Результат участия</h3>
          {isWinner ? (
            <>
              <p>{participation.lotPaymentStatus === 'paid' ? 'Вы победили. Лот оплачен.' : 'Вы победили. Ожидается полная оплата лота.'}</p>
              {participation.lotPaymentStatus !== 'paid' && (
                <button className={styles.button} type="button" onClick={onPayLot} disabled={actionLoading}>Оплатить лот</button>
              )}
            </>
          ) : (
            <p>Победителем стал другой участник.</p>
          )}
        </section>
      )}

      {tradingStatuses.has(auction.status) && (bids.length > 0 || (isDecrease && auction.status === 'bidding_active')) && (
        <section className={styles.auctionPageTradeSection}>
          <h3>Ход торгов</h3>
          {isDecrease && (
            <div className={styles.decreaseTimeline}>
              {decreaseState.reductions.map((row) => (
                <div className={row.active ? styles['decreaseTimeline__row--active'] : ''} key={`${row.at.toISOString()}-${row.amount}`}>
                  <span>{row.at.getTime() <= getClientNow(timeOffsetMs) ? formatDateTime(row.at) : `Снижение в ${formatDateTime(row.at)}`}</span>
                  <strong>{formatMoney(row.amount)}</strong>
                </div>
              ))}
            </div>
          )}
          {bids.length > 0 && !isDecrease && <BidHistory auction={auction} bids={bids} />}
        </section>
      )}
    </section>
  );
}

function SimilarAuctions({
  auctionId,
  actionVersion = 0,
  onApplyAuction,
  onOpenAuction,
  onPayDepositAuction,
  onPayLotAuction,
  onOpenProtocolAuction,
  onToggleFavoriteAuction,
  onCancelAuction,
  canCancelAuction = false,
  user,
  accessToken,
  timeOffsetMs = 0
}) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading');
  const scrollRef = useRef(null);
  const isVerified = user?.verificationStatus === 'approved';
  const canLoadMore = items.length < total && status !== 'loading';

  const loadPage = (nextPage, append = true) => {
    setStatus('loading');
    apiRequest(`/auctions/public/${auctionId}/similar?limit=3&page=${nextPage}`, {
      headers: accessToken ? authHeader(accessToken) : undefined
    })
      .then((data) => {
        setItems((current) => (append ? [...current, ...(data.auctions || [])] : data.auctions || []));
        setTotal(data.total || 0);
        setPage(nextPage);
        setStatus('succeeded');
      })
      .catch(() => setStatus('failed'));
  };

  useEffect(() => {
    setItems([]);
    setPage(1);
    setTotal(0);
    loadPage(1, false);
  }, [accessToken, actionVersion, auctionId]);

  const handleScroll = () => {
    const rail = scrollRef.current;
    if (!rail || !canLoadMore) {
      return;
    }

    if (rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 420) {
      loadPage(page + 1);
    }
  };

  const scroll = (direction) => {
    const rail = scrollRef.current;
    if (!rail) {
      return;
    }

    rail.scrollBy({ left: direction * rail.clientWidth, behavior: 'smooth' });
    window.setTimeout(handleScroll, 300);
  };

  if (items.length === 0 && status !== 'loading') {
    return null;
  }

  return (
    <section className={styles.similarAuctions}>
      <h2>Похожие аукционы</h2>
      <div className={styles.similarAuctions__carousel}>
        <button className={styles.similarAuctions__arrow} type="button" onClick={() => scroll(-1)} aria-label="Листать влево">
          <ChevronLeft size={24} />
        </button>
        <div className={styles.similarAuctions__rail} ref={scrollRef} onScroll={handleScroll}>
          {items.map((item) => (
            <div className={styles.similarAuctions__item} key={item.id}>
              <AuctionCard
                auction={item}
                isAuthenticated={Boolean(user)}
                isVerified={isVerified}
                currentUserId={user?.id}
                userRole={user?.role}
                mode="public"
                timeOffsetMs={timeOffsetMs}
                onApply={onApplyAuction}
                onOpen={() => onOpenAuction(item.id)}
                onPayDeposit={onPayDepositAuction}
                onPayLot={onPayLotAuction}
                onOpenProtocol={onOpenProtocolAuction}
                onToggleFavorite={onToggleFavoriteAuction}
                onCancelAuction={onCancelAuction}
                canCancelAuction={canCancelAuction}
              />
            </div>
          ))}
        </div>
        <button className={`${styles.similarAuctions__arrow} ${styles['similarAuctions__arrow--next']}`} type="button" onClick={() => scroll(1)} aria-label="Листать вправо">
          <ChevronRight size={24} />
        </button>
      </div>
    </section>
  );
}

function AuctionPage({
  id,
  user,
  accessToken,
  actionVersion = 0,
  timeOffsetMs = 0,
  onApplyAuction,
  onBack,
  onMetaChange,
  onOpenAuction,
  onOpenProtocolAuction,
  onPayDepositAuction,
  onPayLotAuction,
  onToggleFavoriteAuction,
  onCancelAuction,
  canCancelAuction = false
}) {
  const [auction, setAuction] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [bids, setBids] = useState([]);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [pageAction, setPageAction] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const subjectInfoRef = useRef(null);
  const [mapPanelHeight, setMapPanelHeight] = useState(null);

  useEffect(() => {
    setStatus('loading');
    setMessage('');

    apiRequest(`/auctions/public/${id}`, {
      headers: accessToken ? authHeader(accessToken) : undefined
    })
      .then((data) => {
        setAuction(data.auction);
        setViewer(data.viewer || null);
        setIsFavorite(Boolean(data.auction?.isFavorite || data.viewer?.isFavorite));
        setBids(data.bids || []);
        setStatus('succeeded');
      })
      .catch((error) => {
        setMessage(error.message);
        setStatus('failed');
      });
  }, [accessToken, actionVersion, id]);

  useEffect(() => {
    if (!id) {
      return undefined;
    }

    const socket = io(getSocketBaseUrl(), {
      auth: accessToken ? { token: accessToken } : undefined
    });

    socket.emit('auction:join', id);
    socket.on('auction:update', (payload) => {
      if (payload.auction) {
        setAuction(payload.auction);
      }
      if (Array.isArray(payload.bids)) {
        setBids(payload.bids);
      }
    });

    return () => {
      socket.emit('auction:leave', id);
      socket.disconnect();
    };
  }, [accessToken, id]);

  const applyPayload = (data) => {
    if (data.auction) {
      setAuction(data.auction);
    }
    if (data.viewer) {
      setViewer(data.viewer);
    }
    if (Array.isArray(data.bids)) {
      setBids(data.bids);
    }
  };

  const runAuctionAction = async ({ path, method = 'POST', body }) => {
    setActionLoading(true);
    setActionError('');

    try {
      const data = await apiRequest(path, {
        method,
        headers: authHeader(accessToken),
        body: body ? JSON.stringify(body) : JSON.stringify({})
      });
      applyPayload(data);
      return true;
    } catch (error) {
      setActionError(error.message);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const submitApplication = async () => {
    const ok = await runAuctionAction({
      path: `/auctions/${id}/applications`
    });

    if (ok) {
      setPageAction(null);
    }
  };

  const payDeposit = async (payload) => {
    const ok = await runAuctionAction({
      path: `/auctions/${id}/deposit/pay`,
      body: payload
    });

    if (ok) {
      setPageAction(null);
    }
  };

  const payLot = async (payload) => {
    const ok = await runAuctionAction({
      path: `/auctions/${id}/lot/pay`,
      body: payload
    });

    if (ok) {
      setPageAction(null);
    }
  };

  const placeBid = (amount) =>
    runAuctionAction({
      path: `/auctions/${id}/bids`,
      body: { amount }
    });

  const photos = useMemo(() => {
    const source = auction?.photos || [];
    const main = source.find((photo) => photo.isMain);
    return main ? [main, ...source.filter((photo) => photo !== main)] : source;
  }, [auction]);

  useEffect(() => {
    if (!auction) {
      return;
    }

    onMetaChange?.({
      category: auction.item?.category || '',
      title: auction.item?.title || 'Аукцион'
    });
  }, [auction?.id, auction?.item?.category, auction?.item?.title, onMetaChange]);

  const toggleFavorite = async () => {
    if (!auction || !onToggleFavoriteAuction) {
      return;
    }

    const result = await onToggleFavoriteAuction(auction);
    if (typeof result?.isFavorite === 'boolean') {
      setIsFavorite(result.isFavorite);
      setAuction((current) => (current ? { ...current, isFavorite: result.isFavorite } : current));
    }
  };

  useLayoutEffect(() => {
    if (!auction || !subjectInfoRef.current) {
      return undefined;
    }

    const updateHeight = () => {
      const shouldStack = window.matchMedia('(max-width: 980px)').matches;

      if (shouldStack) {
        setMapPanelHeight(null);
        return;
      }

      setMapPanelHeight(subjectInfoRef.current.offsetHeight);
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(subjectInfoRef.current);
    window.addEventListener('resize', updateHeight);
    const timerId = window.setTimeout(updateHeight, 120);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
      window.clearTimeout(timerId);
    };
  }, [auction, auction?.item?.description, auction?.item?.characteristics?.length]);

  if (status === 'loading') {
    return <LoadingState text="Загрузка аукциона" />;
  }

  if (status === 'failed' || !auction) {
    return (
      <section className={styles.emptyState}>
        <h1>Аукцион не найден</h1>
        <p>{message || 'Аукцион еще не опубликован или был снят с торгов.'}</p>
        <button className={styles.backButton} type="button" onClick={onBack}>← Назад</button>
      </section>
    );
  }

  const schedule = auction.schedule || {};
  const item = auction.item || {};
  const pricing = auction.pricing || {};
  const seller = auction.seller || {};
  const isDecrease = pricing.auctionType === 'decrease';
  const timeInfo = getTimeInfo(auction, timeOffsetMs);

  return (
    <div className={styles.auctionPage}>
      <header className={styles.auctionPageHeader}>
        <div className={styles.auctionPageHeader__title}>
          <h1>{item.title}</h1>
          {!viewer?.isOwner && (
            <button
              className={`${styles.auctionPageLike} ${isFavorite ? styles['auctionPageLike--active'] : ''}`}
              type="button"
              aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
              onClick={toggleFavorite}
            >
              <Heart size={25} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
        <span className={styles.auctionPageViews}>
          <Eye size={20} />
          {auction.viewsCount || 0}
        </span>
      </header>

      <section className={styles.auctionPageHero}>
        <Gallery title={item.title} photos={photos} />

        <aside className={styles.auctionPageSummary}>
          <AuctionStatusBanner auction={auction} bids={bids} variant="large" timeInfo={timeInfo} />

          <div className={styles.auctionPageInfoGroup}>
            <InfoRow label="Номер аукциона" value={auction.auctionNumber ? `Аукцион №${auction.auctionNumber}` : 'Не присвоен'} />
            <InfoRow label="Тип аукциона" value={getAuctionTypeLabel(pricing.auctionType)} />
          </div>

          <div className={styles.auctionPageInfoGroup}>
            <InfoRow label="Начальная цена" value={formatMoney(pricing.priceWithVat)} />
            {isDecrease && <InfoRow label="Минимальная цена" value={formatMoney(pricing.minPriceWithVat)} />}
            <InfoRow label="Задаток" value={formatMoney(pricing.depositAmount)} />
            <InfoRow label={isDecrease ? 'Шаг торгов' : 'Минимальный шаг торгов'} value={formatMoney(isDecrease ? pricing.calculatedBidStep : pricing.minBidStep)} />
          </div>

          <div className={styles.auctionPageInfoGroup}>
            <InfoRow label="Начало приема заявок" value={formatDateTime(schedule.applicationStartAt)} />
            <InfoRow label="Окончание приема заявок" value={formatDateTime(schedule.applicationEndAt)} />
            <InfoRow label="Начало торгов" value={formatDateTime(schedule.biddingStartAt)} />
            <InfoRow label="Окончание торгов" value={formatDateTime(schedule.biddingEndAt)} />
            <InfoRow label="Срок полной оплаты победителем" value={formatDays(schedule.paymentDeadlineDays)} />
            <InfoRow label="Срок заключения договора купли-продажи" value={formatDays(schedule.contractDeadlineDays)} />
          </div>
        </aside>
      </section>

      {actionError && (
        <div className={styles.auctionPageFlash}>
          <p className={styles.message__error}>{actionError}</p>
        </div>
      )}

      <TradingBlock
        auction={auction}
        user={user}
        viewer={viewer}
        bids={bids}
        actionLoading={actionLoading}
        onApply={() => setPageAction({ type: 'apply', auction })}
        onPayDeposit={() => setPageAction({ type: 'deposit', auction })}
        onPayLot={() => setPageAction({ type: 'lot', auction })}
        onPlaceBid={placeBid}
        onOpenProtocol={onOpenProtocolAuction}
        onCancelAuction={onCancelAuction}
        canCancelAuction={canCancelAuction}
        timeOffsetMs={timeOffsetMs}
      />

      <section className={styles.auctionPageSubject} id="auction-instruction">
        <div className={styles.auctionPageBlock} ref={subjectInfoRef}>
          <h2>Информация о предмете торгов</h2>
          {(item.characteristics || []).length > 0 && (
            <table className={styles.characteristicsTable}>
              <tbody>
                {(item.characteristics || []).map((row) => (
                  <tr key={`${row.name}-${row.value}`}>
                    <th>{row.name}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {item.description && (
            <>
              <h3>Описание предмета торгов</h3>
              <p>{item.description}</p>
            </>
          )}
        </div>

        <aside className={styles.auctionPageMapPanel} style={mapPanelHeight ? { height: `${mapPanelHeight}px` } : undefined}>
          <h3>Адрес местонахождения предмета торгов</h3>
          <p className={styles.auctionPage__location}><MapPin size={18} />{item.locationAddress || 'Местоположение не указано'}</p>
          <PublicAuctionMap geoLocation={item.geoLocation} />
        </aside>
      </section>

      <section className={styles.auctionPageSingleColumn}>
        <div className={styles.auctionPageBlock}>
          <h2>Осмотр предмета торгов</h2>
          <InfoRow label="Контактное лицо" value={auction.inspection?.contactName} />
          <InfoRow label="Телефон" value={auction.inspection?.contactPhone} />
          <InfoRow label="Электронная почта" value={auction.inspection?.contactEmail} />
        </div>

        <div className={styles.auctionPageBlock}>
          <h2>Информация о продавце</h2>
          <SellerInfoRows seller={seller} />
        </div>

        <div className={styles.auctionPageBlock}>
          <h2>Оператор торгов</h2>
          <InfoRow label="Наименование" value={operatorInfo.name} />
          <InfoRow label="Адрес" value={operatorInfo.address} />
          <InfoRow label="Контактное лицо" value={operatorInfo.contactPerson} />
          <InfoRow label="Телефон" value={operatorInfo.phone} />
          <InfoRow label="Электронная почта" value={operatorInfo.email} />
          <InfoRow label="УНП" value={operatorInfo.unp} />
        </div>

        <div className={styles.auctionPageBlock}>
          <h2>Обязанности и ответственность сторон</h2>
          <h3>Обязанности покупателя и продавца</h3>
          <ul className={styles.termsList}>
            <li>Победитель торгов обязан полностью оплатить выигранный лот и возместить затраты на организацию и проведение аукциона.</li>
            <li>Победитель торгов и продавец обязаны подписать протокол по результатам торгов.</li>
            <li>Победитель торгов и продавец обязаны заключить договор купли-продажи предмета торгов.</li>
          </ul>
          <h3>Ответственность покупателя и продавца</h3>
          <ul className={styles.termsList}>
            <li>При отказе или уклонении победителя от подписания протокола, заключения договора, возмещения затрат или оплаты предмета торгов результаты торгов аннулируются, а внесенный задаток возврату не подлежит.</li>
            <li>Отказ от приобретения предмета торгов не освобождает победителя от оплаты услуг оператора торгов.</li>
            <li>Продавец несет ответственность за достоверность сведений о предмете торгов и готовность заключить договор с победителем.</li>
          </ul>
        </div>
      </section>

      <SimilarAuctions
        auctionId={auction.id}
        actionVersion={actionVersion}
        user={user}
        accessToken={accessToken}
        timeOffsetMs={timeOffsetMs}
        onApplyAuction={onApplyAuction}
        onOpenAuction={onOpenAuction}
        onPayDepositAuction={onPayDepositAuction}
        onPayLotAuction={onPayLotAuction}
        onOpenProtocolAuction={onOpenProtocolAuction}
        onToggleFavoriteAuction={onToggleFavoriteAuction}
        onCancelAuction={onCancelAuction}
        canCancelAuction={canCancelAuction}
      />

      <AuctionActionModals
        action={pageAction}
        error=""
        loading={actionLoading}
        onCancel={() => {
          setPageAction(null);
          setActionError('');
        }}
        onConfirmApply={submitApplication}
        onPayDeposit={payDeposit}
        onPayLot={payLot}
      />
    </div>
  );
}

export default AuctionPage;
