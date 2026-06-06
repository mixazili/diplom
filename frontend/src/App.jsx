import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { refreshSession } from './features/auth/authSlice.js';
import AdminPanel from './components/staff/AdminPanel.jsx';
import ModeratorPanel from './components/staff/ModeratorPanel.jsx';
import UserCabinet from './components/user/UserCabinet.jsx';
import AuthPanel from './components/auth/AuthPanel.jsx';
import SiteHeader from './components/layout/SiteHeader.jsx';
import SiteFooter from './components/layout/SiteFooter.jsx';
import HomePage from './components/pages/HomePage.jsx';
import AuctionsPage from './components/pages/AuctionsPage.jsx';
import AuctionPage from './components/pages/AuctionPage.jsx';
import AuctionActionModals from './components/auction/AuctionActionModals.jsx';
import AuctionProtocolModal from './components/auction/AuctionProtocolModal.jsx';
import { apiRequest, authHeader } from './api/client.js';
import { auctionCategoryLabels } from './constants/auctionCategories.js';
import styles from './AppShell.module.css';

let initialRefreshStarted = false;

const routeFromLocation = () => {
  const { pathname, search } = window.location;
  const params = new URLSearchParams(search);

  if (pathname === '/staff') {
    return { name: 'staff' };
  }

  if (pathname === '/login') {
    return { name: 'auth', authMode: 'login' };
  }

  if (pathname === '/register') {
    return { name: 'auth', authMode: 'register' };
  }

  if (pathname === '/cabinet') {
    return { name: 'cabinet', section: params.get('section') || '' };
  }

  if (pathname.startsWith('/auction/')) {
    return { name: 'auction', id: pathname.split('/').filter(Boolean)[1] };
  }

  if (pathname === '/auctions') {
    return {
      name: 'auctions',
      categories: params.getAll('category'),
      search: params.get('search') || ''
    };
  }

  return { name: 'home' };
};

const pathForRoute = (route) => {
  if (route.name === 'auth') {
    return route.authMode === 'login' ? '/login' : '/register';
  }

  if (route.name === 'cabinet') {
    return route.section ? `/cabinet?section=${encodeURIComponent(route.section)}` : '/cabinet';
  }

  if (route.name === 'staff') {
    return '/staff';
  }

  if (route.name === 'auctions') {
    const params = new URLSearchParams();
    if (Array.isArray(route.categories)) {
      route.categories.forEach((category) => params.append('category', category));
    } else if (route.category) {
      params.append('category', route.category);
    }
    if (route.search) {
      params.set('search', route.search);
    }
    const query = params.toString();
    return query ? `/auctions?${query}` : '/auctions';
  }

  if (route.name === 'auction') {
    return `/auction/${route.id}`;
  }

  return '/';
};

function App() {
  const dispatch = useDispatch();
  const { user, refreshToken, accessToken } = useSelector((state) => state.auth);
  const [route, setRoute] = useState(routeFromLocation);
  const [timeOffsetMs, setTimeOffsetMs] = useState(0);
  const [actionModal, setActionModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionVersion, setActionVersion] = useState(0);
  const [clockTick, setClockTick] = useState(0);
  const [auctionBreadcrumb, setAuctionBreadcrumb] = useState(null);
  const [protocolAuction, setProtocolAuction] = useState(null);

  useEffect(() => {
    if (refreshToken && !initialRefreshStarted) {
      initialRefreshStarted = true;
      dispatch(refreshSession(refreshToken));
    }
  }, [dispatch, refreshToken]);

  useEffect(() => {
    const handlePopState = () => setRoute(routeFromLocation());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadTime = () => {
      apiRequest('/system/time')
        .then((data) => {
          if (mounted) {
            const nextOffset = Number(data.time?.offsetMs || 0);
            setTimeOffsetMs((current) => {
              if (current !== nextOffset) {
                setActionVersion((value) => value + 1);
              }
              return nextOffset;
            });
          }
        })
        .catch(() => {});
    };

    loadTime();
    const intervalId = window.setInterval(loadTime, 10000);
    const tickId = window.setInterval(() => setClockTick((value) => value + 1), 30000);
    window.addEventListener('auction:dev-time-changed', loadTime);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.clearInterval(tickId);
      window.removeEventListener('auction:dev-time-changed', loadTime);
    };
  }, []);

  useEffect(() => {
    if (user && route.name === 'auth') {
      navigate(user.role === 'user' ? 'cabinet' : 'staff', {}, true);
    }
  }, [route.name, user]);

  useEffect(() => {
    if (route.name !== 'auction') {
      setAuctionBreadcrumb(null);
    }
  }, [route.name, route.id]);

  const navigate = (name, options = {}, replace = false) => {
    const nextRoute = { name, ...options };
    const path = pathForRoute(nextRoute);
    if (replace) {
      window.history.replaceState(null, '', path);
    } else {
      window.history.pushState(null, '', path);
    }
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAuthMode = (authMode) => navigate('auth', { authMode });
  const openAuction = (id) => navigate('auction', { id });

  const requireUserAction = (auction, type) => {
    if (!user || !accessToken) {
      openAuthMode('login');
      return;
    }

    setActionError('');
    setActionModal({ type, auction });
  };

  const openAuctionApplication = (auction) => requireUserAction(auction, 'apply');
  const openDepositPayment = (auction) => requireUserAction(auction, 'deposit');
  const openLotPayment = (auction) => requireUserAction(auction, 'lot');
  const openAuctionProtocol = (auction) => setProtocolAuction(auction);
  const canStaffCancelAuctions = user?.role === 'admin' || user?.role === 'moderator';
  const toggleFavoriteAuction = async (auction) => {
    if (!user || !accessToken) {
      openAuthMode('login');
      return { isFavorite: Boolean(auction?.isFavorite) };
    }

    const data = await apiRequest(`/auctions/${auction.id}/favorite`, {
      method: 'POST',
      headers: authHeader(accessToken),
      body: JSON.stringify({})
    });
    setActionVersion((value) => value + 1);
    return data;
  };

  const cancelAuction = async (auction) => {
    if (!accessToken || !canStaffCancelAuctions || !auction?.id) {
      return;
    }

    const confirmed = window.confirm('Отменить аукцион? Это действие переведет аукцион в статус "Отменен".');

    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/moderation/auctions/${auction.id}/cancel`, {
        method: 'POST',
        headers: authHeader(accessToken),
        body: JSON.stringify({})
      });
      setActionVersion((value) => value + 1);
    } catch (error) {
      window.alert(error.message);
    }
  };

  const breadcrumbs = useMemo(() => {
    const home = { label: 'Главная', route: { name: 'home' } };
    const catalog = { label: 'Каталог аукционов', route: { name: 'auctions' } };

    if (route.name === 'home') {
      return [{ label: 'Главная' }];
    }

    if (route.name === 'auth') {
      return [home, { label: route.authMode === 'login' ? 'Вход' : 'Регистрация' }];
    }

    if (route.name === 'cabinet') {
      return [home, { label: user?.role === 'admin' ? 'Панель админа' : user?.role === 'moderator' ? 'Панель модератора' : 'Личный кабинет' }];
    }

    if (route.name === 'staff') {
      return [home, { label: user?.role === 'admin' ? 'Панель админа' : user?.role === 'moderator' ? 'Панель модератора' : 'Вход для сотрудников' }];
    }

    if (route.name === 'auctions') {
      return [home, { label: 'Каталог аукционов' }];
    }

    if (route.name === 'auction') {
      const category = auctionBreadcrumb?.category;
      const categoryLabel = category ? auctionCategoryLabels[category] : '';
      return [
        home,
        catalog,
        ...(categoryLabel ? [{ label: categoryLabel, route: { name: 'auctions', options: { categories: [category] } } }] : []),
        { label: auctionBreadcrumb?.title || 'Аукцион' }
      ];
    }

    return [home];
  }, [auctionBreadcrumb, route, user?.role]);

  const runCardAction = async ({ path, body }) => {
    if (!accessToken) {
      openAuthMode('login');
      return;
    }

    setActionLoading(true);
    setActionError('');

    try {
      await apiRequest(path, {
        method: 'POST',
        headers: authHeader(accessToken),
        body: JSON.stringify(body || {})
      });
      setActionModal(null);
      setActionVersion((value) => value + 1);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const content = useMemo(() => {
    if (route.name === 'staff') {
      if (user?.role === 'admin') {
        return <AdminPanel />;
      }

      if (user?.role === 'moderator') {
        return <ModeratorPanel />;
      }

      return <AuthPanel staffOnly />;
    }

    if (route.name === 'cabinet') {
      if (!user) {
        return <AuthPanel initialMode="login" />;
      }

      if (user.role === 'admin') {
        return <AdminPanel />;
      }

      if (user.role === 'moderator') {
        return <ModeratorPanel />;
      }

      return (
        <UserCabinet
          actionVersion={actionVersion}
          initialSection={route.section}
          timeOffsetMs={timeOffsetMs}
          onApplyAuction={openAuctionApplication}
          onOpenAuction={openAuction}
          onPayDepositAuction={openDepositPayment}
          onPayLotAuction={openLotPayment}
          onOpenProtocolAuction={openAuctionProtocol}
          onToggleFavoriteAuction={toggleFavoriteAuction}
          onCancelAuction={cancelAuction}
          canCancelAuction={canStaffCancelAuctions}
        />
      );
    }

    if (route.name === 'auth') {
      return <AuthPanel initialMode={route.authMode || 'register'} />;
    }

    if (route.name === 'auctions') {
      return (
        <AuctionsPage
          accessToken={accessToken}
          categories={route.categories || []}
          search={route.search}
          timeOffsetMs={timeOffsetMs}
          user={user}
          actionVersion={actionVersion}
          onApplyAuction={openAuctionApplication}
          onClearSearch={() => navigate('auctions', { categories: route.categories || [] })}
          onOpenAuction={openAuction}
          onPayDepositAuction={openDepositPayment}
          onPayLotAuction={openLotPayment}
          onOpenProtocolAuction={openAuctionProtocol}
          onToggleFavoriteAuction={toggleFavoriteAuction}
          onCancelAuction={cancelAuction}
          canCancelAuction={canStaffCancelAuctions}
        />
      );
    }

    if (route.name === 'auction') {
      return (
        <AuctionPage
          accessToken={accessToken}
          actionVersion={actionVersion}
          id={route.id}
          timeOffsetMs={timeOffsetMs}
          user={user}
          onApplyAuction={openAuctionApplication}
          onBack={() => navigate('auctions')}
          onMetaChange={setAuctionBreadcrumb}
          onOpenAuction={openAuction}
          onPayDepositAuction={openDepositPayment}
          onPayLotAuction={openLotPayment}
          onOpenProtocolAuction={openAuctionProtocol}
          onToggleFavoriteAuction={toggleFavoriteAuction}
          onCancelAuction={cancelAuction}
          canCancelAuction={canStaffCancelAuctions}
        />
      );
    }

    return (
      <HomePage
        accessToken={accessToken}
        actionVersion={actionVersion}
        timeOffsetMs={timeOffsetMs}
        user={user}
        onApplyAuction={openAuctionApplication}
        onOpenAuction={openAuction}
        onPayDepositAuction={openDepositPayment}
        onPayLotAuction={openLotPayment}
        onOpenProtocolAuction={openAuctionProtocol}
        onToggleFavoriteAuction={toggleFavoriteAuction}
        onCancelAuction={cancelAuction}
        canCancelAuction={canStaffCancelAuctions}
      />
    );
  }, [accessToken, actionVersion, clockTick, route, timeOffsetMs, user]);

  return (
    <main className={styles.app}>
      <SiteHeader
        activeCategories={route.name === 'auctions' ? route.categories || [] : []}
        breadcrumbs={breadcrumbs}
        searchQuery={route.name === 'auctions' ? route.search || '' : ''}
        user={user}
        onAuthMode={openAuthMode}
        onNavigate={navigate}
      />
      <div className={styles.app__shell}>{content}</div>
      <SiteFooter onAuthMode={openAuthMode} onNavigate={navigate} />
      <AuctionActionModals
        action={actionModal}
        error={actionError}
        loading={actionLoading}
        onCancel={() => {
          setActionModal(null);
          setActionError('');
        }}
        onConfirmApply={() => runCardAction({ path: `/auctions/${actionModal.auction.id}/applications` })}
        onPayDeposit={(payload) => runCardAction({ path: `/auctions/${actionModal.auction.id}/deposit/pay`, body: payload })}
        onPayLot={(payload) => runCardAction({ path: `/auctions/${actionModal.auction.id}/lot/pay`, body: payload })}
      />
      <AuctionProtocolModal auction={protocolAuction} onClose={() => setProtocolAuction(null)} />
    </main>
  );
}

export default App;
