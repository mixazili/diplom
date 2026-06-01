import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Heart,
  MapPin,
  Maximize2,
  Trophy,
  X
} from 'lucide-react';
import styles from '../../App.module.css';
import { apiRequest, authHeader } from '../../api/client.js';
import { operatorInfo } from '../../constants/auctionConstants.js';
import { formatPhoneDisplay } from '../../utils/inputFormatters.js';
import { getYandexMaps } from '../../utils/yandexMaps.js';
import AuctionCard, { auctionStatusLabels } from '../auction/AuctionCard.jsx';

const finishedStatuses = new Set(['finished_success', 'finished_failed', 'cancelled']);
const tradingStatuses = new Set(['bidding_active', 'finished_success', 'finished_failed']);

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

const getTimeInfo = (auction) => {
  const schedule = auction.schedule || {};

  if (auction.status === 'application_waiting') {
    return ['До начала приема заявок', formatDuration(schedule.applicationStartAt)];
  }

  if (auction.status === 'applications_open') {
    return ['До окончания приема заявок', formatDuration(schedule.applicationEndAt)];
  }

  if (auction.status === 'bidding_waiting') {
    return ['До начала торгов', formatDuration(schedule.biddingStartAt)];
  }

  if (auction.status === 'bidding_active') {
    return ['До окончания торгов', formatDuration(schedule.biddingEndAt)];
  }

  if (finishedStatuses.has(auction.status)) {
    return ['Дата завершения торгов', formatDateTime(schedule.biddingEndAt)];
  }

  return null;
};

const getAuctionTypeLabel = (type) => (type === 'decrease' ? 'Аукцион на понижение' : 'Аукцион на повышение');

const getFailedReason = (auction, bids) => {
  if (auction.status === 'cancelled') {
    return auction.resultReason || auction.moderationComment || 'Аукцион отменен оператором торгов.';
  }

  if (auction.status !== 'finished_failed') {
    return '';
  }

  if (auction.resultReason) {
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

function AuctionStatusBanner({ auction, bids, variant = 'default' }) {
  const latestBid = bids[bids.length - 1];
  const statusText = auctionStatusLabels[auction.status] || auction.status;
  const failedReason = getFailedReason(auction, bids);
  const isFinal = finishedStatuses.has(auction.status);
  const StatusIcon = auction.status === 'finished_success' ? Trophy : AlertCircle;

  return (
    <div className={`${styles.auctionStatusBanner} ${variant === 'large' ? styles['auctionStatusBanner--large'] : ''}`}>
      <strong className={styles.auctionStatusBanner__title}>
        {isFinal && <StatusIcon size={22} />}
        {statusText}
      </strong>
      {auction.status === 'finished_success' && (
        <span>
          Победитель — участник №{latestBid?.participantNumber || 'не определен'}.
          {latestBid ? ` Последняя ставка: ${formatMoney(latestBid.amount)}.` : ''}
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

  const visibleBids = expanded ? bids : bids.slice(-1);

  return (
    <div className={styles.bidHistory}>
      <div className={styles.bidHistory__header}>
        <span>Участник</span>
        <span>Дата</span>
        <span>Время</span>
        <span>Ставка</span>
      </div>
      {visibleBids.map((bid, index) => {
        const sourceIndex = expanded ? index : bids.length - 1;
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

function TradingBlock({ auction, user, viewer, bids }) {
  const participation = viewer?.participation;
  const isLoggedIn = Boolean(user);
  const isVerified = user?.verificationStatus === 'approved';
  const isOwner = viewer?.isOwner;
  const hasPaidDeposit = participation?.depositStatus === 'paid' || participation?.status === 'approved';
  const latestBid = bids[bids.length - 1];

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
      return 'Владелец лота не может подавать заявку и участвовать в собственных торгах.';
    }

    return '';
  }, [isLoggedIn, isOwner, isVerified, user?.role]);

  return (
    <section className={styles.auctionPageBlock}>
      <h2>Проведение торгов</h2>
      <AuctionStatusBanner auction={auction} bids={bids} variant="large" />

      <section className={styles.auctionPageTradeSection}>
        <h3>Участие в торгах</h3>
        {restriction ? (
          <div className={styles.auctionPageNotice}>
            <AlertCircle size={18} />
            <p>{restriction} <a href="#" onClick={(event) => event.preventDefault()}>Открыть инструкцию по участию в торгах</a></p>
          </div>
        ) : (
          <div className={styles.auctionPageAction}>
            <p>Для участия нужно подать заявку, оплатить задаток и получить уникальный номер участника для этого аукциона.</p>
            {auction.status === 'applications_open' && !participation && (
              <button className={styles.button} type="button" disabled>Подать заявку на участие</button>
            )}
          </div>
        )}

        {!restriction && participation && (
          <div className={styles.auctionPageParticipation}>
            <InfoRow label="Статус участия" value={hasPaidDeposit ? 'Задаток оплачен' : 'Ожидается оплата задатка'} />
            <InfoRow label="Ваш номер участника" value={participation.participantNumber || 'Будет присвоен после оплаты задатка'} />
          </div>
        )}
      </section>

      {auction.status === 'bidding_active' && hasPaidDeposit && (
        <section className={styles.bidPanel}>
          <div>
            <h3>Меню ставок</h3>
            <p>Ставки будут подключены на следующем этапе разработки.</p>
          </div>
          <label className={styles.field}>
            <span className={styles.field__label}>Следующая ставка</span>
            <input className={styles.field__control} type="number" readOnly value={latestBid ? Number(latestBid.amount) + Number(auction.pricing?.minBidStep || 0) : auction.pricing?.priceWithVat || 0} />
          </label>
          <button className={styles.button} type="button" disabled>Сделать ставку</button>
        </section>
      )}

      {auction.status === 'finished_success' && participation?.participantNumber === latestBid?.participantNumber && (
        <button className={styles.button} type="button" disabled>Оплатить лот</button>
      )}

      {tradingStatuses.has(auction.status) && bids.length > 0 && (
        <section className={styles.auctionPageTradeSection}>
          <h3>Ход торгов</h3>
          <BidHistory auction={auction} bids={bids} />
        </section>
      )}
    </section>
  );
}

function SimilarAuctions({ auctionId, onOpenAuction, user }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('loading');
  const scrollRef = useRef(null);
  const isVerified = user?.verificationStatus === 'approved';
  const canLoadMore = items.length < total && status !== 'loading';

  const loadPage = (nextPage, append = true) => {
    setStatus('loading');
    apiRequest(`/auctions/public/${auctionId}/similar?limit=3&page=${nextPage}`)
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
  }, [auctionId]);

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
              <AuctionCard auction={item} isAuthenticated={Boolean(user)} isVerified={isVerified} mode="public" onOpen={() => onOpenAuction(item.id)} />
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

function AuctionPage({ id, user, accessToken, onBack, onOpenAuction }) {
  const [auction, setAuction] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [bids, setBids] = useState([]);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
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
        setBids(data.bids || []);
        setStatus('succeeded');
      })
      .catch((error) => {
        setMessage(error.message);
        setStatus('failed');
      });
  }, [accessToken, id]);

  const photos = useMemo(() => {
    const source = auction?.photos || [];
    const main = source.find((photo) => photo.isMain);
    return main ? [main, ...source.filter((photo) => photo !== main)] : source;
  }, [auction]);

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
    return <p className={styles.panel__text}>Загрузка лота...</p>;
  }

  if (status === 'failed' || !auction) {
    return (
      <section className={styles.emptyState}>
        <h1>Лот не найден</h1>
        <p>{message || 'Лот еще не опубликован или был снят с торгов.'}</p>
        <button className={styles.backButton} type="button" onClick={onBack}>← Назад</button>
      </section>
    );
  }

  const schedule = auction.schedule || {};
  const item = auction.item || {};
  const pricing = auction.pricing || {};
  const seller = auction.seller || {};
  const timeInfo = getTimeInfo(auction);
  const isDecrease = pricing.auctionType === 'decrease';

  return (
    <div className={styles.auctionPage}>
      <header className={styles.auctionPageHeader}>
        <div className={styles.auctionPageHeader__title}>
          <h1>{item.title}</h1>
          <button className={styles.auctionPageLike} type="button" aria-label="Добавить в избранное">
            <Heart size={25} />
          </button>
        </div>
        <span className={styles.auctionPageViews}>
          <Eye size={20} />
          {auction.viewsCount || 0}
        </span>
      </header>

      <section className={styles.auctionPageHero}>
        <Gallery title={item.title} photos={photos} />

        <aside className={styles.auctionPageSummary}>
          <AuctionStatusBanner auction={auction} bids={bids} variant="large" />

          {timeInfo && (
            <div className={styles.auctionPageTime}>
              <Clock size={18} />
              <span>{timeInfo[0]}:</span>
              <strong>{timeInfo[1]}</strong>
            </div>
          )}

          <div className={styles.auctionPageInfoGroup}>
            <h3>Основная информация</h3>
            <InfoRow label="Номер аукциона" value={auction.lotNumber ? `Лот №${auction.lotNumber}` : 'Не присвоен'} />
            <InfoRow label="Тип аукциона" value={getAuctionTypeLabel(pricing.auctionType)} />
          </div>

          <div className={styles.auctionPageInfoGroup}>
            <h3>Цены</h3>
            <InfoRow label="Начальная цена" value={formatMoney(pricing.priceWithVat)} />
            {isDecrease && <InfoRow label="Минимальная цена" value={formatMoney(pricing.minPriceWithVat)} />}
            <InfoRow label="Задаток" value={formatMoney(pricing.depositAmount)} />
            <InfoRow label={isDecrease ? 'Шаг торгов' : 'Минимальный шаг торгов'} value={formatMoney(isDecrease ? pricing.calculatedBidStep : pricing.minBidStep)} />
          </div>

          <div className={styles.auctionPageInfoGroup}>
            <h3>Даты</h3>
            <InfoRow label="Начало приема заявок" value={formatDateTime(schedule.applicationStartAt)} />
            <InfoRow label="Окончание приема заявок" value={formatDateTime(schedule.applicationEndAt)} />
            <InfoRow label="Начало торгов" value={formatDateTime(schedule.biddingStartAt)} />
            <InfoRow label="Окончание торгов" value={formatDateTime(schedule.biddingEndAt)} />
            <InfoRow label="Срок полной оплаты победителем" value={formatDays(schedule.paymentDeadlineDays)} />
            <InfoRow label="Срок заключения договора купли-продажи" value={formatDays(schedule.contractDeadlineDays)} />
          </div>
        </aside>
      </section>

      <TradingBlock auction={auction} user={user} viewer={viewer} bids={bids} />

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
          <InfoRow label="Продавец" value={seller.organizationName || seller.fullName} />
          <InfoRow label={seller.isResident ? 'УНП' : 'ИНН/БИН'} value={seller.unp} />
          <InfoRow label="Телефон" value={seller.phone} />
          <InfoRow label="Дополнительный телефон" value={seller.additionalPhone} />
          <InfoRow label="Юридический адрес" value={seller.legalAddress} />
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
            <li>При отказе или уклонении победителя от подписания протокола, заключения договора, возмещения затрат или оплаты лота результаты торгов аннулируются, а внесенный задаток возврату не подлежит.</li>
            <li>Отказ от приобретения предмета торгов не освобождает победителя от оплаты услуг оператора торгов.</li>
            <li>Продавец несет ответственность за достоверность сведений о предмете торгов и готовность заключить договор с победителем.</li>
          </ul>
        </div>
      </section>

      <SimilarAuctions auctionId={auction.id} user={user} onOpenAuction={onOpenAuction} />
    </div>
  );
}

export default AuctionPage;
