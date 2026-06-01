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
import styles from './App.module.css';

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
    return { name: 'cabinet' };
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
    return '/cabinet';
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
    if (user && route.name === 'auth') {
      navigate(user.role === 'user' ? 'cabinet' : 'staff', {}, true);
    }
  }, [route.name, user]);

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

      return <UserCabinet />;
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
          user={user}
          onOpenAuction={openAuction}
        />
      );
    }

    if (route.name === 'auction') {
      return <AuctionPage accessToken={accessToken} id={route.id} user={user} onBack={() => navigate('auctions')} onOpenAuction={openAuction} />;
    }

    return <HomePage accessToken={accessToken} user={user} onOpenAuction={openAuction} />;
  }, [accessToken, route, user]);

  return (
    <main className={styles.app}>
      <SiteHeader
        activeCategories={route.name === 'auctions' ? route.categories || [] : []}
        user={user}
        onAuthMode={openAuthMode}
        onNavigate={navigate}
      />
      <div className={styles.app__shell}>{content}</div>
      <SiteFooter onAuthMode={openAuthMode} onNavigate={navigate} />
    </main>
  );
}

export default App;
