import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { refreshSession } from './features/auth/authSlice.js';
import AdminPanel from './components/staff/AdminPanel.jsx';
import ModeratorPanel from './components/staff/ModeratorPanel.jsx';
import UserCabinet from './components/user/UserCabinet.jsx';
import AuthPanel from './components/auth/AuthPanel.jsx';
import styles from './App.module.css';

let initialRefreshStarted = false;

function App() {
  const dispatch = useDispatch();
  const { user, refreshToken } = useSelector((state) => state.auth);
  let content = <AuthPanel />;

  useEffect(() => {
    if (refreshToken && !initialRefreshStarted) {
      initialRefreshStarted = true;
      dispatch(refreshSession(refreshToken));
    }
  }, [dispatch, refreshToken]);

  if (user?.role === 'admin') {
    content = <AdminPanel />;
  } else if (user?.role === 'moderator') {
    content = <ModeratorPanel />;
  } else if (user) {
    content = <UserCabinet />;
  }

  return (
    <main className={styles.app}>
      <div className={styles.app__shell}>
        {content}
      </div>
    </main>
  );
}

export default App;
