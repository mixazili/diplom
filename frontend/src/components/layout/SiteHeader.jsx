import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Heart, MessageCircle, Search, UserCircle } from 'lucide-react';
import { apiRequest } from '../../api/client.js';
import { auctionCategoryGroups, auctionCategoryLabels } from '../../constants/auctionCategories.js';
import styles from './Layout.module.css';

const publicAuctionStatuses = [
  'application_waiting',
  'applications_open',
  'bidding_waiting',
  'bidding_active',
  'finished_success',
  'finished_failed',
  'cancelled'
];

const formatMoney = (value) =>
  `${new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))} BYN`;

const getAuctionPrice = (auction) =>
  auction.status === 'finished_success'
    ? auction.winningBidAmount || auction.lastBidPrice || auction.currentPrice || auction.pricing?.priceWithVat
    : auction.currentPrice || auction.lastBidPrice || auction.pricing?.priceWithVat;

function Breadcrumbs({ items = [], onNavigate }) {
  if (!items.length) {
    return null;
  }

  return (
    <nav className={styles.breadcrumbs} aria-label="Путь по сайту">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {isLast || !item.route ? (
              <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
            ) : (
              <button type="button" onClick={() => onNavigate(item.route.name, item.route.options || {})}>
                {item.label}
              </button>
            )}
            {!isLast && <small>/</small>}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function SiteHeader({
  user,
  onNavigate,
  onAuthMode,
  activeCategories = [],
  searchQuery = '',
  breadcrumbs = [],
  counters = {}
}) {
  const [query, setQuery] = useState(searchQuery || '');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionStatus, setSuggestionStatus] = useState('idle');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const latestRequestRef = useRef(0);
  const isAuthenticated = Boolean(user);
  const cabinetRoute = user?.role === 'user' ? 'cabinet' : 'staff';
  const cabinetLabel = user?.role === 'user' ? 'Личный кабинет' : user?.role === 'admin' ? 'Панель админа' : 'Панель модератора';
  const selectedCategories = new Set(activeCategories);
  const normalizedQuery = query.trim();
  const shouldShowSuggestions = isSearchFocused && normalizedQuery.length >= 2;

  useEffect(() => {
    setQuery(searchQuery || '');
  }, [searchQuery]);

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setSuggestions([]);
      setSuggestionStatus('idle');
      return undefined;
    }

    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    const timerId = window.setTimeout(() => {
      const params = new URLSearchParams({
        scope: 'catalog',
        limit: '10',
        page: '1',
        search: normalizedQuery,
        sort: 'newest'
      });

      publicAuctionStatuses.forEach((status) => params.append('status', status));
      params.append('auctionType', 'increase');
      params.append('auctionType', 'decrease');

      setSuggestionStatus('loading');
      apiRequest(`/auctions?${params.toString()}`)
        .then((data) => {
          if (latestRequestRef.current !== requestId) {
            return;
          }

          setSuggestions(data.auctions || []);
          setSuggestionStatus('succeeded');
        })
        .catch(() => {
          if (latestRequestRef.current === requestId) {
            setSuggestions([]);
            setSuggestionStatus('failed');
          }
        });
    }, 260);

    return () => window.clearTimeout(timerId);
  }, [normalizedQuery]);

  const goToSearchResults = () => {
    if (!normalizedQuery) {
      return;
    }

    setIsSearchFocused(false);
    onNavigate('auctions', { search: normalizedQuery });
  };

  const submitSearch = (event) => {
    event.preventDefault();
    goToSearchResults();
  };

  const toggleCategory = (value) => {
    const nextCategories = new Set(selectedCategories);
    if (nextCategories.has(value)) {
      nextCategories.delete(value);
    } else {
      nextCategories.add(value);
    }
    onNavigate('auctions', { categories: [...nextCategories], search: normalizedQuery });
  };

  const toggleGroup = (values) => {
    const nextCategories = new Set(selectedCategories);
    const allSelected = values.every((value) => nextCategories.has(value));

    values.forEach((value) => {
      if (allSelected) {
        nextCategories.delete(value);
      } else {
        nextCategories.add(value);
      }
    });

    onNavigate('auctions', { categories: [...nextCategories], search: normalizedQuery });
  };

  const suggestionRows = useMemo(() => suggestions.map((auction) => ({
    id: auction.id,
    auctionNumber: auction.auctionNumber ? `Аукцион №${auction.auctionNumber}` : 'Аукцион без номера',
    title: auction.item?.title || 'Предмет торгов без названия',
    price: formatMoney(getAuctionPrice(auction))
  })), [suggestions]);
  const renderBadge = (value) => {
    const count = Number(value || 0);
    return count > 0 ? <span className={styles.iconButton__badge}>{count > 99 ? '99+' : count}</span> : null;
  };

  return (
    <header className={styles.siteHeader}>
      <div className={styles.siteHeader__top}>
        <button className={styles.siteLogo} type="button" onClick={() => onNavigate('home')}>
          <span>Auction.by</span>
          <small>Онлайн-аукционы</small>
        </button>

        <div
          className={styles.siteSearchWrap}
          onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 160)}
          onFocus={() => setIsSearchFocused(true)}
        >
          <form className={styles.siteSearch} onSubmit={submitSearch}>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти аукцион"
            />
            {query && (
              <button
                className={styles.siteSearch__clear}
                type="button"
                onClick={() => {
                  setQuery('');
                  setSuggestions([]);
                  setSuggestionStatus('idle');
                }}
                aria-label="Очистить поиск"
              >
                ×
              </button>
            )}
            <button type="submit" aria-label="Найти">
              <Search size={24} strokeWidth={2.2} />
            </button>
          </form>

          {shouldShowSuggestions && (
            <div className={styles.searchSuggest} role="listbox">
              {suggestionStatus === 'loading' && <span className={styles.searchSuggest__state}>Поиск...</span>}
              {suggestionStatus !== 'loading' && suggestionRows.length === 0 && (
                <span className={styles.searchSuggest__state}>Аукционы не найдены</span>
              )}
              {suggestionRows.map((item) => (
                <button
                  className={styles.searchSuggest__item}
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setIsSearchFocused(false);
                    onNavigate('auction', { id: item.id });
                  }}
                >
                  <span>
                    <small>{item.auctionNumber}</small>
                    <strong>{item.title}</strong>
                  </span>
                  <b>{item.price}</b>
                </button>
              ))}
              <button className={styles.searchSuggest__all} type="button" onClick={goToSearchResults}>
                Все результаты
              </button>
            </div>
          )}
        </div>

        <div className={styles.siteHeader__actions}>
          {isAuthenticated ? (
            <>
              <button
                className={styles.iconButton}
                type="button"
                aria-label="Уведомления"
                onClick={() => onNavigate(user?.role === 'user' ? 'cabinet' : 'staff', user?.role === 'user' ? { section: 'notifications' } : {})}
              >
                <Bell size={20} />
                {renderBadge(counters.unreadNotifications)}
              </button>
              <button
                className={styles.iconButton}
                type="button"
                aria-label="Чаты сделок"
                onClick={() => onNavigate(user?.role === 'user' ? 'cabinet' : 'staff', user?.role === 'user' ? { section: 'chats' } : {})}
              >
                <MessageCircle size={20} />
                {renderBadge(counters.unreadChatMessages)}
              </button>
              <button
                className={styles.iconButton}
                type="button"
                aria-label="Избранное"
                onClick={() => onNavigate(user?.role === 'user' ? 'cabinet' : 'staff', user?.role === 'user' ? { section: 'favorites' } : {})}
              >
                <Heart size={20} />
              </button>
              <button className={styles.iconButton} type="button" aria-label={cabinetLabel} title={cabinetLabel} onClick={() => onNavigate(cabinetRoute)}>
                <UserCircle size={22} />
              </button>
            </>
          ) : (
            <>
              <button className={styles.headerButtonSecondary} type="button" onClick={() => onAuthMode('login')}>
                Вход
              </button>
              <button className={styles.headerButton} type="button" onClick={() => onAuthMode('register')}>
                Регистрация
              </button>
            </>
          )}
        </div>
      </div>

      <nav className={styles.siteHeader__nav} aria-label="Основная навигация">
        <button className={styles.siteHeader__navPrimary} type="button" onClick={() => onNavigate('auctions')}>Каталог аукционов</button>
        <button type="button">Как продать/купить?</button>
        <button type="button">Информация</button>
        <button type="button">О компании</button>
        <button type="button">Контакты</button>
      </nav>

      <div className={styles.siteHeader__categories}>
        {auctionCategoryGroups.map((group) => {
          const selectedCount = group.values.filter((value) => selectedCategories.has(value)).length;

          return (
            <div className={styles.categoryGroup} key={group.label}>
              <button
                className={selectedCount > 0 ? styles['categoryGroup__button--active'] : ''}
                type="button"
                onClick={() => toggleGroup(group.values)}
              >
                {group.label}
                {selectedCount > 0 && <span>{selectedCount}</span>}
              </button>
              <div className={styles.categoryGroup__menu}>
                {group.values.map((value) => (
                  <button
                    className={selectedCategories.has(value) ? styles['siteHeader__category--active'] : ''}
                    key={value}
                    type="button"
                    onClick={() => toggleCategory(value)}
                  >
                    {auctionCategoryLabels[value]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />
    </header>
  );
}

export default SiteHeader;
