import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest, authHeader } from '../../api/client.js';
import AuctionSections from './AuctionSections.jsx';
import styles from './HomePage.module.css';

const publishedOwnStatuses = new Set([
  'application_waiting',
  'applications_open',
  'bidding_waiting',
  'bidding_active'
]);

const activeParticipationStatuses = new Set([
  'application_waiting',
  'applications_open',
  'bidding_waiting',
  'bidding_active'
]);

function HomePage({
  user,
  accessToken,
  actionVersion = 0,
  timeOffsetMs = 0,
  onApplyAuction,
  onOpenAuction,
  onPayDepositAuction,
  onPayLotAuction,
  onOpenProtocolAuction,
  onToggleFavoriteAuction,
  onCancelAuction,
  canCancelAuction = false
}) {
  const [popularAuctions, setPopularAuctions] = useState({ items: [], total: 0, page: 1 });
  const [newAuctions, setNewAuctions] = useState({ items: [], total: 0, page: 1 });
  const [myAuctions, setMyAuctions] = useState({ items: [], visibleCount: 12 });
  const [myParticipations, setMyParticipations] = useState({ items: [], visibleCount: 12 });
  const [message, setMessage] = useState('');
  const isVerified = user?.verificationStatus === 'approved';

  const loadAuctionSection = (scope, page = 1, limit = 12) =>
    apiRequest(`/auctions?scope=${scope}&limit=${limit}&page=${page}`, {
      headers: accessToken ? authHeader(accessToken) : undefined
    });

  useEffect(() => {
    let mounted = true;

    Promise.all([
      loadAuctionSection('popular', 1, 6),
      loadAuctionSection('home', 1, 6)
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
  }, [accessToken, actionVersion]);

  useEffect(() => {
    if (!accessToken || !isVerified) {
      setMyAuctions({ items: [], visibleCount: 12 });
      setMyParticipations({ items: [], visibleCount: 12 });
      return undefined;
    }

    let mounted = true;
    Promise.all([
      apiRequest('/auctions/my', {
        headers: authHeader(accessToken)
      }),
      apiRequest('/auctions/participations/my', {
        headers: authHeader(accessToken)
      })
    ])
      .then(([ownData, participationData]) => {
        if (!mounted) {
          return;
        }

        setMyAuctions({
          items: (ownData.auctions || []).filter((auction) => publishedOwnStatuses.has(auction.status)),
          visibleCount: 12
        });
        setMyParticipations({
          items: (participationData.participations || []).filter((item) => activeParticipationStatuses.has(item.auction?.status)),
          visibleCount: 12
        });
      })
      .catch(() => {
        if (mounted) {
          setMyAuctions({ items: [], visibleCount: 12 });
          setMyParticipations({ items: [], visibleCount: 12 });
        }
      });

    return () => {
      mounted = false;
    };
  }, [accessToken, actionVersion, isVerified]);

  const showMoreRemote = (setter, scope, currentPage) => {
    const nextPage = currentPage + 1;
    loadAuctionSection(scope, nextPage, scope === 'popular' || scope === 'home' ? 6 : 12)
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
      title: 'Мои опубликованные аукционы',
      description: 'Аукционы, которые вы запустили и которые уже доступны участникам.',
      items: myAuctions.items.slice(0, myAuctions.visibleCount),
      mode: 'owner',
      hasMore: myAuctions.items.length > myAuctions.visibleCount,
      onShowMore: () => setMyAuctions((current) => ({ ...current, visibleCount: current.visibleCount + 12 }))
    },
    {
      title: 'Участие в аукционах',
      description: 'Аукционы, где у вас уже есть заявка или номер участника.',
      items: myParticipations.items.slice(0, myParticipations.visibleCount),
      getAuction: (item) => item.auction,
      getParticipant: (item) => item,
      hasMore: myParticipations.items.length > myParticipations.visibleCount,
      onShowMore: () => setMyParticipations((current) => ({ ...current, visibleCount: current.visibleCount + 12 }))
    },
    {
      title: 'Популярные аукционы',
      description: 'Аукционы на этапе ожидания и приема заявок.',
      items: popularAuctions.items,
      hasMore: popularAuctions.items.length < popularAuctions.total,
      onShowMore: () => showMoreRemote(setPopularAuctions, 'popular', popularAuctions.page)
    },
    {
      title: 'Новые аукционы',
      description: 'Последние опубликованные предложения площадки.',
      items: newAuctions.items,
      hasMore: newAuctions.items.length < newAuctions.total,
      onShowMore: () => showMoreRemote(setNewAuctions, 'home', newAuctions.page)
    }
  ], [myAuctions, myParticipations, newAuctions, popularAuctions]);

  return (
    <div className={styles.publicPage}>
      <section className={styles.homeHero}>
        <div>
          <p className={styles.panel__eyebrow}>AUCTION.BY</p>
          <h1>Онлайн-аукционы для имущества, техники и бизнеса</h1>
          <p>
            Создавайте аукционы, проходите модерацию, подавайте заявки и участвуйте в торгах в одном веб-приложении.
          </p>
        </div>
      </section>

      {message && <p className={styles.message__error}>{message}</p>}
      <AuctionSections
        sections={sections}
        user={user}
        isVerified={isVerified}
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
    </div>
  );
}

export default HomePage;
