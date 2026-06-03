import React, { useState } from 'react';
import { Bell, Heart, Search, UserCircle } from 'lucide-react';
import { auctionCategoryGroups, auctionCategoryLabels } from '../../constants/auctionCategories.js';
import styles from './Layout.module.css';

function SiteHeader({ user, onNavigate, onAuthMode, activeCategories = [] }) {
  const [query, setQuery] = useState('');
  const isAuthenticated = Boolean(user);
  const cabinetRoute = user?.role === 'user' ? 'cabinet' : 'staff';
  const cabinetLabel = user?.role === 'user' ? 'Личный кабинет' : user?.role === 'admin' ? 'Панель админа' : 'Панель модератора';
  const selectedCategories = new Set(activeCategories);

  const submitSearch = (event) => {
    event.preventDefault();
    onNavigate('auctions', { search: query.trim() });
  };

  const toggleCategory = (value) => {
    const nextCategories = new Set(selectedCategories);
    if (nextCategories.has(value)) {
      nextCategories.delete(value);
    } else {
      nextCategories.add(value);
    }
    onNavigate('auctions', { categories: [...nextCategories], search: query.trim() });
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

    onNavigate('auctions', { categories: [...nextCategories], search: query.trim() });
  };

  return (
    <header className={styles.siteHeader}>
      <div className={styles.siteHeader__top}>
        <button className={styles.siteLogo} type="button" onClick={() => onNavigate('home')}>
          <span>Auction.by</span>
          <small>Онлайн-аукционы</small>
        </button>

        <form className={styles.siteSearch} onSubmit={submitSearch}>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти лот"
          />
          <button type="submit" aria-label="Найти">
            <Search size={20} strokeWidth={2.2} />
          </button>
        </form>

        <div className={styles.siteHeader__actions}>
          {isAuthenticated ? (
            <>
              <button className={styles.iconButton} type="button" aria-label="Уведомления">
                <Bell size={20} />
              </button>
              <button className={styles.iconButton} type="button" aria-label="Избранное">
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
    </header>
  );
}

export default SiteHeader;
