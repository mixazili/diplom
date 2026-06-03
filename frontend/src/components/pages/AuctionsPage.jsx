import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest, authHeader } from '../../api/client.js';
import { auctionCategoryLabels } from '../../constants/auctionCategories.js';
import { citiesByRegion, regions } from '../../utils/location.js';
import AuctionCard from '../auction/AuctionCard.jsx';
import CustomSelect from '../ui/CustomSelect.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import styles from './AuctionsPage.module.css';

const statusGroups = [
  {
    label: 'Прием заявок',
    values: ['application_waiting', 'applications_open'],
    options: [
      ['application_waiting', 'Ожидание приема заявок'],
      ['applications_open', 'Прием заявок']
    ]
  },
  {
    label: 'Торги',
    values: ['bidding_waiting', 'bidding_active'],
    options: [
      ['bidding_waiting', 'Ожидание торгов'],
      ['bidding_active', 'Идут торги']
    ]
  },
  {
    label: 'Завершенные торги',
    values: ['finished_success', 'finished_failed', 'cancelled'],
    options: [
      ['finished_success', 'Торги состоялись'],
      ['finished_failed', 'Торги не состоялись'],
      ['cancelled', 'Отменен']
    ]
  }
];

const auctionTypes = [
  ['increase', 'На повышение'],
  ['decrease', 'На понижение']
];

const sortOptions = [
  ['newest', 'Более новые'],
  ['oldest', 'Более старые'],
  ['price_asc', 'Цена по возрастанию'],
  ['price_desc', 'Цена по убыванию'],
  ['views_desc', 'Просмотры по убыванию'],
  ['views_asc', 'Просмотры по возрастанию']
];

const pageSizeOptions = [20, 40, 60];
const defaultStatuses = ['application_waiting', 'applications_open'];
const defaultAuctionTypes = ['increase', 'decrease'];

const toggleValue = (values, value) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

const toggleRequiredValue = (values, value) => {
  const nextValues = toggleValue(values, value);
  return nextValues.length > 0 ? nextValues : values;
};

const toggleGroupValues = (values, groupValues) => {
  const allSelected = groupValues.every((value) => values.includes(value));
  return allSelected
    ? values.filter((value) => !groupValues.includes(value))
    : [...new Set([...values, ...groupValues])];
};

const toggleRequiredGroupValues = (values, groupValues) => {
  const nextValues = toggleGroupValues(values, groupValues);
  return nextValues.length > 0 ? nextValues : values;
};

const formatMoneyInput = (value) => String(Math.round(Number(value || 0)));

const getPaginationPages = (current, total) => {
  if (total <= 9) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set([1, total, current]);
  for (let offset = -3; offset <= 3; offset += 1) {
    const nextPage = current + offset;
    if (nextPage > 1 && nextPage < total) {
      pages.add(nextPage);
    }
  }

  return [...pages].sort((left, right) => left - right);
};

function PriceRangeFilter({ bounds, value, onChange }) {
  const minBound = Math.floor(bounds.min || 0);
  const maxBound = Math.max(Math.ceil(bounds.max || 0), minBound + 1);
  const minValue = Math.min(Math.max(Number(value.min ?? minBound), minBound), maxBound);
  const maxValue = Math.max(Math.min(Number(value.max ?? maxBound), maxBound), minBound);

  const updateMin = (nextValue) => {
    const nextMin = Math.min(Number(nextValue), maxValue);
    onChange({ min: nextMin, max: maxValue });
  };

  const updateMax = (nextValue) => {
    const nextMax = Math.max(Number(nextValue), minValue);
    onChange({ min: minValue, max: nextMax });
  };

  const left = ((minValue - minBound) / (maxBound - minBound)) * 100;
  const right = 100 - ((maxValue - minBound) / (maxBound - minBound)) * 100;

  return (
    <div className={styles.catalogPriceFilter}>
      <div className={styles.catalogPriceFilter__inputs}>
        <label>
          <span>От</span>
          <input
            className={styles.field__control}
            min={minBound}
            max={maxBound}
            type="number"
            value={formatMoneyInput(minValue)}
            onChange={(event) => updateMin(event.target.value)}
          />
        </label>
        <label>
          <span>До</span>
          <input
            className={styles.field__control}
            min={minBound}
            max={maxBound}
            type="number"
            value={formatMoneyInput(maxValue)}
            onChange={(event) => updateMax(event.target.value)}
          />
        </label>
      </div>
      <div className={styles.dualRange}>
        <div className={styles.rangeTrack}>
          <span className={styles.rangeTrack__fill} style={{ left: `${left}%`, right: `${right}%` }} />
        </div>
        <input min={minBound} max={maxBound} type="range" value={minValue} onChange={(event) => updateMin(event.target.value)} />
        <input min={minBound} max={maxBound} type="range" value={maxValue} onChange={(event) => updateMax(event.target.value)} />
      </div>
      <div className={styles.timeMarks}>
        <span>{minBound.toLocaleString('ru-RU')} BYN</span>
        <span>{maxBound.toLocaleString('ru-RU')} BYN</span>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }) {
  return (
    <section className={styles.catalogFilterGroup}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function AuctionsPage({
  user,
  accessToken,
  actionVersion = 0,
  categories = [],
  search = '',
  timeOffsetMs = 0,
  onApplyAuction,
  onOpenAuction,
  onPayDepositAuction,
  onPayLotAuction
}) {
  const [auctions, setAuctions] = useState([]);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState('newest');
  const [selectedStatuses, setSelectedStatuses] = useState(defaultStatuses);
  const [selectedAuctionTypes, setSelectedAuctionTypes] = useState(defaultAuctionTypes);
  const [priceBounds, setPriceBounds] = useState({ min: 0, max: 0 });
  const [priceRange, setPriceRange] = useState(null);
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [personalFilter, setPersonalFilter] = useState('');
  const isVerified = user?.verificationStatus === 'approved';
  const regionOptions = useMemo(() => [{ value: '', label: 'Все области' }, ...regions.map(([value, label]) => ({ value, label }))], []);
  const cityOptions = useMemo(
    () => [{ value: '', label: 'Все города' }, ...(citiesByRegion[region] || []).map((item) => ({ value: item, label: item }))],
    [region]
  );

  useEffect(() => {
    setPage(1);
  }, [categories.join('|'), search, selectedStatuses.join('|'), selectedAuctionTypes.join('|'), sort, limit, personalFilter, region, city, priceRange?.min, priceRange?.max]);

  useEffect(() => {
    setPriceRange(null);
  }, [categories.join('|'), search, selectedStatuses.join('|'), selectedAuctionTypes.join('|'), personalFilter, region, city]);

  useEffect(() => {
    if (selectedStatuses.length === 0 || selectedAuctionTypes.length === 0) {
      setAuctions([]);
      setTotal(0);
      setStatus('succeeded');
      return;
    }

    const params = new URLSearchParams({
      scope: 'catalog',
      limit: String(limit),
      page: String(page),
      sort
    });

    categories.forEach((category) => params.append('category', category));
    selectedStatuses.forEach((item) => params.append('status', item));
    selectedAuctionTypes.forEach((item) => params.append('auctionType', item));

    if (search.trim()) {
      params.set('search', search.trim());
    }

    if (priceRange) {
      params.set('minPrice', String(priceRange.min));
      params.set('maxPrice', String(priceRange.max));
    }

    if (region) {
      params.set('region', region);
    }

    if (city) {
      params.set('city', city);
    }

    if (personalFilter === 'own') {
      params.set('onlyOwn', 'true');
    }

    if (personalFilter === 'participating') {
      params.set('onlyParticipating', 'true');
    }

    setStatus('loading');
    apiRequest(`/auctions?${params.toString()}`, {
      headers: accessToken ? authHeader(accessToken) : undefined
    })
      .then((data) => {
        setAuctions(data.auctions || []);
        setTotal(data.total || 0);
        setPriceBounds(data.priceBounds || { min: 0, max: 0 });
        setPriceRange((current) => current || data.priceBounds || { min: 0, max: 0 });
        setStatus('succeeded');
      })
      .catch((error) => {
        setMessage(error.message);
        setStatus('failed');
      });
  }, [
    accessToken,
    actionVersion,
    categories.join('|'),
    limit,
    page,
    personalFilter,
    priceRange?.min,
    priceRange?.max,
    region,
    search,
    city,
    selectedAuctionTypes.join('|'),
    selectedStatuses.join('|'),
    sort
  ]);

  const filteredAuctions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return auctions;
    }

    return auctions.filter((auction) =>
      `${auction.item?.title || ''} ${auction.item?.locationAddress || ''}`.toLowerCase().includes(normalizedSearch)
    );
  }, [auctions, search]);

  const categoryLabel = categories.length > 0
    ? categories.map((category) => auctionCategoryLabels[category]).filter(Boolean).join(', ')
    : 'Аукционы';
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const updateStatusGroup = (values) => {
    setSelectedStatuses((current) => toggleRequiredGroupValues(current, values));
  };

  const updatePersonalFilter = (value) => {
    setPersonalFilter((current) => (current === value ? '' : value));
  };

  const resetFilters = () => {
    setSelectedStatuses(defaultStatuses);
    setSelectedAuctionTypes(defaultAuctionTypes);
    setRegion('');
    setCity('');
    setPriceRange(priceBounds);
    setPersonalFilter('');
    setSort('newest');
    setLimit(20);
    setPage(1);
  };

  const paginationPages = getPaginationPages(page, totalPages);

  return (
    <div className={styles.publicPage}>
      <header className={styles.catalogPlainHeader}>
        <h1>{categoryLabel}</h1>
      </header>

      <div className={styles.catalogLayout}>
        <aside className={styles.catalogFilters}>
          <FilterGroup title="Статус аукциона">
            {statusGroups.map((group) => {
              const selectedCount = group.values.filter((value) => selectedStatuses.includes(value)).length;

              return (
                <div className={styles.catalogFilterNested} key={group.label}>
                  <label className={`${styles.checkRow} ${styles.filterChoice}`}>
                    <input
                      checked={selectedCount === group.values.length}
                      type="checkbox"
                      onChange={() => updateStatusGroup(group.values)}
                    />
                    <span>{group.label}</span>
                  </label>
                  <div className={styles.catalogFilterNested__items}>
                    {group.options.map(([value, label]) => (
                      <label className={`${styles.checkRow} ${styles.filterChoice}`} key={value}>
                        <input
                          checked={selectedStatuses.includes(value)}
                          type="checkbox"
                          onChange={() => setSelectedStatuses((current) => toggleRequiredValue(current, value))}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </FilterGroup>

          <FilterGroup title="Тип аукциона">
            {auctionTypes.map(([value, label]) => (
              <label className={`${styles.checkRow} ${styles.filterChoice}`} key={value}>
                <input
                  checked={selectedAuctionTypes.includes(value)}
                  type="checkbox"
                  onChange={() => setSelectedAuctionTypes((current) => toggleRequiredValue(current, value))}
                />
                <span>{label}</span>
              </label>
            ))}
          </FilterGroup>

          <FilterGroup title="Местоположение">
            <label className={styles.field}>
              <span className={styles.field__label}>Область</span>
              <CustomSelect value={region} options={regionOptions} onChange={(value) => {
                setRegion(value);
                setCity('');
              }} />
            </label>
            <label className={styles.field}>
              <span className={styles.field__label}>Город</span>
              <CustomSelect value={city} options={cityOptions} disabled={!region} onChange={setCity} />
            </label>
          </FilterGroup>

          <FilterGroup title="Начальная цена">
            <PriceRangeFilter
              bounds={priceBounds}
              value={priceRange || priceBounds}
              onChange={(nextRange) => setPriceRange(nextRange)}
            />
          </FilterGroup>

          <FilterGroup title="Мои фильтры">
            <label className={`${styles.checkRow} ${styles.filterChoice}`}>
              <input
                checked={personalFilter === 'participating'}
                type="checkbox"
                onChange={() => updatePersonalFilter('participating')}
              />
              <span>Я участвую в торгах</span>
            </label>
            <label className={`${styles.checkRow} ${styles.filterChoice}`}>
              <input
                checked={personalFilter === 'own'}
                type="checkbox"
                onChange={() => updatePersonalFilter('own')}
              />
              <span>Только мои аукционы</span>
            </label>
          </FilterGroup>

          <button className={`${styles.buttonSecondary} ${styles.catalogResetButton}`} type="button" onClick={resetFilters}>
            Сбросить все фильтры
          </button>
        </aside>

        <section className={styles.catalogResults}>
          <div className={styles.catalogToolbar}>
            <label>
              <span>Сортировка</span>
              <CustomSelect value={sort} options={sortOptions.map(([value, label]) => ({ value, label }))} onChange={setSort} />
            </label>
            <label>
              <span>Лотов на странице</span>
              <CustomSelect value={limit} options={pageSizeOptions.map((value) => ({ value, label: String(value) }))} onChange={(value) => setLimit(Number(value))} />
            </label>
          </div>

          {status === 'loading' && <LoadingState text="Загрузка лотов" />}
          {status === 'failed' && <p className={styles.message__error}>{message}</p>}
          {status !== 'loading' && filteredAuctions.length === 0 && (
            <section className={styles.emptyState}>
              <h2>Лоты не найдены</h2>
              <p>Попробуйте изменить фильтры или поисковый запрос.</p>
            </section>
          )}
          {filteredAuctions.length > 0 && (
            <div className={styles.lotGrid}>
              {filteredAuctions.map((auction) => (
                <AuctionCard
                  auction={auction}
                  isAuthenticated={Boolean(user)}
                  isVerified={isVerified}
                  currentUserId={user?.id}
                  key={auction.id}
                  mode="catalog"
                  timeOffsetMs={timeOffsetMs}
                  onApply={onApplyAuction}
                  onOpen={() => onOpenAuction(auction.id)}
                  onPayDeposit={onPayDepositAuction}
                  onPayLot={onPayLotAuction}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Пагинация каталога">
              <button className={styles.pagination__button} type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                Назад
              </button>
              {paginationPages.map((item) => (
                <button
                  className={`${styles.pagination__page} ${item === page ? styles['pagination__page--active'] : ''}`}
                  type="button"
                  key={item}
                  onClick={() => setPage(item)}
                  aria-current={item === page ? 'page' : undefined}
                >
                  {item}
                </button>
              ))}
              <button className={styles.pagination__button} type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                Вперед
              </button>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}

export default AuctionsPage;
