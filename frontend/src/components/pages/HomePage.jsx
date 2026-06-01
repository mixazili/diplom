import React, { useEffect, useMemo, useState } from 'react';
import styles from '../../App.module.css';
import { apiRequest, authHeader } from '../../api/client.js';
import AuctionSections from './AuctionSections.jsx';

const publishedOwnStatuses = new Set([
  'application_waiting',
  'applications_open',
  'bidding_waiting',
  'bidding_active'
]);

function HomePage({ user, accessToken, onOpenAuction }) {
  const [popularAuctions, setPopularAuctions] = useState({ items: [], total: 0, page: 1 });
  const [newAuctions, setNewAuctions] = useState({ items: [], total: 0, page: 1 });
  const [myAuctions, setMyAuctions] = useState({ items: [], visibleCount: 12 });
  const [message, setMessage] = useState('');
  const isVerified = user?.verificationStatus === 'approved';

  const loadAuctionSection = (scope, page = 1) =>
    apiRequest(`/auctions?scope=${scope}&limit=12&page=${page}`);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      loadAuctionSection('popular', 1),
      loadAuctionSection('home', 1)
    ])
      .then(([popularData, newData]) => {
        if (!mounted) {
          return;
        }

        setPopularAuctions({ items: popularData.auctions || [], total: popularData.total || 0, page: 1 });
        setNewAuctions({ items: newData.auctions || [], total: newData.total || 0, page: 1 });
      })
      .catch((error) => {
        if (mounted) {
          setMessage(error.message);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!accessToken || !isVerified) {
      setMyAuctions({ items: [], visibleCount: 12 });
      return undefined;
    }

    let mounted = true;
    apiRequest('/auctions/my', {
      headers: authHeader(accessToken)
    })
      .then((data) => {
        if (mounted) {
          setMyAuctions({
            items: (data.auctions || []).filter((auction) => publishedOwnStatuses.has(auction.status)),
            visibleCount: 12
          });
        }
      })
      .catch(() => {
        if (mounted) {
          setMyAuctions({ items: [], visibleCount: 12 });
        }
      });

    return () => {
      mounted = false;
    };
  }, [accessToken, isVerified]);

  const showMoreRemote = (setter, scope, currentPage) => {
    const nextPage = currentPage + 1;
    loadAuctionSection(scope, nextPage)
      .then((data) => {
        setter((latest) => ({
          items: [...latest.items, ...(data.auctions || [])],
          total: data.total || latest.total,
          page: nextPage
        }));
      })
      .catch((error) => setMessage(error.message));
  };

  const sections = useMemo(() => [
    {
      title: 'Мои опубликованные лоты',
      description: 'Лоты, которые вы выставили и которые уже доступны участникам.',
      items: myAuctions.items.slice(0, myAuctions.visibleCount),
      mode: 'owner',
      hasMore: myAuctions.items.length > myAuctions.visibleCount,
      onShowMore: () => setMyAuctions((current) => ({ ...current, visibleCount: current.visibleCount + 12 }))
    },
    {
      title: 'Популярные аукционы',
      description: 'Лоты на этапе ожидания и приема заявок.',
      items: popularAuctions.items,
      hasMore: popularAuctions.items.length < popularAuctions.total,
      onShowMore: () => showMoreRemote(setPopularAuctions, 'popular', popularAuctions.page)
    },
    {
      title: 'Новые лоты',
      description: 'Последние опубликованные предложения площадки.',
      items: newAuctions.items,
      hasMore: newAuctions.items.length < newAuctions.total,
      onShowMore: () => showMoreRemote(setNewAuctions, 'home', newAuctions.page)
    }
  ], [myAuctions, newAuctions, popularAuctions]);

  return (
    <div className={styles.publicPage}>
      <section className={styles.homeHero}>
        <div>
          <p className={styles.panel__eyebrow}>AUCTION.BY</p>
          <h1>Онлайн-аукционы для имущества, техники и бизнеса</h1>
          <p>
            Создавайте лоты, проходите модерацию, подавайте заявки и участвуйте в торгах в одном веб-приложении.
          </p>
        </div>
      </section>

      {message && <p className={styles.message__error}>{message}</p>}
      <AuctionSections sections={sections} user={user} isVerified={isVerified} onOpenAuction={onOpenAuction} />
    </div>
  );
}

export default HomePage;
