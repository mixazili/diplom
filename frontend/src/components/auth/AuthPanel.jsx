import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  loginUser,
  registerUser,
  requestStaffLogin,
  verifyEmail,
  verifyStaffLogin
} from '../../features/auth/authSlice.js';
import styles from '../../App.module.css';

function AuthPanel() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const [mode, setMode] = useState('register');
  const [credentials, setCredentials] = useState({ email: '', password: '', passwordRepeat: '', code: '' });
  const isLoading = auth.status === 'loading';

  const updateCredentials = (field, value) => {
    setCredentials((current) => ({ ...current, [field]: value }));
  };

  const submitRegister = (event) => {
    event.preventDefault();

    if (credentials.password !== credentials.passwordRepeat) {
      return;
    }

    dispatch(registerUser({ email: credentials.email, password: credentials.password }));
  };

  const submitCode = (event) => {
    event.preventDefault();
    dispatch(verifyEmail({ email: auth.registrationEmail || credentials.email, code: credentials.code }));
  };

  const submitLogin = (event) => {
    event.preventDefault();
    dispatch(loginUser({ email: credentials.email, password: credentials.password }));
  };

  const submitStaffLogin = (event) => {
    event.preventDefault();
    dispatch(requestStaffLogin({ email: credentials.email, password: credentials.password }));
  };

  const submitStaffCode = (event) => {
    event.preventDefault();
    dispatch(verifyStaffLogin({ email: auth.staffLoginEmail || credentials.email, code: credentials.code }));
  };

  return (
    <section className={styles.panel}>
      <div className={styles.panel__header}>
        <p className={styles.panel__eyebrow}>Auction.by</p>
        <h1 className={styles.panel__title}>Регистрация и вход</h1>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tabs__button} ${mode === 'register' ? styles['tabs__button--active'] : ''}`}
          type="button"
          onClick={() => setMode('register')}
        >
          Регистрация
        </button>
        <button
          className={`${styles.tabs__button} ${mode === 'login' ? styles['tabs__button--active'] : ''}`}
          type="button"
          onClick={() => setMode('login')}
        >
          Вход
        </button>
        <button
          className={`${styles.tabs__button} ${mode === 'staff' ? styles['tabs__button--active'] : ''}`}
          type="button"
          onClick={() => setMode('staff')}
        >
          Сотрудники
        </button>
      </div>

      {mode === 'register' && (
        <>
          <form className={styles.form} onSubmit={submitRegister}>
            <label className={styles.field}>
              <span className={styles.field__label}>Email*</span>
              <input
                className={`${styles.field__control} ${auth.errors.email ? styles['field__control--error'] : ''}`}
                type="email"
                value={credentials.email}
                onChange={(event) => updateCredentials('email', event.target.value)}
                placeholder="user@example.com"
              />
              {auth.errors.email && <span className={styles.field__error}>{auth.errors.email}</span>}
            </label>
            <label className={styles.field}>
              <span className={styles.field__label}>Пароль*</span>
              <input
                className={`${styles.field__control} ${auth.errors.password ? styles['field__control--error'] : ''}`}
                type="password"
                value={credentials.password}
                onChange={(event) => updateCredentials('password', event.target.value)}
                placeholder="Не менее 8 символов"
              />
              {auth.errors.password && <span className={styles.field__error}>{auth.errors.password}</span>}
            </label>
            <label className={styles.field}>
              <span className={styles.field__label}>Повторите пароль*</span>
              <input
                className={`${styles.field__control} ${
                  credentials.passwordRepeat && credentials.passwordRepeat !== credentials.password
                    ? styles['field__control--error']
                    : ''
                }`}
                type="password"
                value={credentials.passwordRepeat}
                onChange={(event) => updateCredentials('passwordRepeat', event.target.value)}
              />
              {credentials.passwordRepeat && credentials.passwordRepeat !== credentials.password && (
                <span className={styles.field__error}>Пароли не совпадают</span>
              )}
            </label>
            <button className={styles.button} type="submit" disabled={isLoading}>
              Отправить код
            </button>
          </form>

          {(auth.registrationEmail || auth.message) && (
            <form className={styles.form} onSubmit={submitCode}>
              <div className={styles.notice}>
                <strong>{auth.message}</strong>
                {auth.emailPreviewUrl && (
                  <a href={auth.emailPreviewUrl} target="_blank" rel="noreferrer">
                    Открыть письмо Ethereal
                  </a>
                )}
                {auth.emailCode && (
                  <span>
                    Dev-код подтверждения: <strong>{auth.emailCode}</strong>
                  </span>
                )}
                {auth.emailDeliveryError && (
                  <span>Почтовый сервис разработки ответил ошибкой: {auth.emailDeliveryError}</span>
                )}
              </div>
              <label className={styles.field}>
                <span className={styles.field__label}>Код из письма*</span>
                <input
                  className={`${styles.field__control} ${auth.errors.code ? styles['field__control--error'] : ''}`}
                  value={credentials.code}
                  onChange={(event) => updateCredentials('code', event.target.value)}
                  placeholder="6 цифр"
                />
                {auth.errors.code && <span className={styles.field__error}>{auth.errors.code}</span>}
              </label>
              <button className={styles.button} type="submit" disabled={isLoading}>
                Подтвердить email
              </button>
            </form>
          )}
        </>
      )}

      {mode === 'login' && (
        <form className={styles.form} onSubmit={submitLogin}>
          <label className={styles.field}>
            <span className={styles.field__label}>Email*</span>
            <input
              className={styles.field__control}
              type="email"
              value={credentials.email}
              onChange={(event) => updateCredentials('email', event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.field__label}>Пароль*</span>
            <input
              className={styles.field__control}
              type="password"
              value={credentials.password}
              onChange={(event) => updateCredentials('password', event.target.value)}
            />
          </label>
          <button className={styles.button} type="submit" disabled={isLoading}>
            Войти
          </button>
        </form>
      )}

      {mode === 'staff' && (
        <>
          <form className={styles.form} onSubmit={submitStaffLogin}>
            <label className={styles.field}>
              <span className={styles.field__label}>Email сотрудника*</span>
              <input
                className={styles.field__control}
                type="email"
                value={credentials.email}
                onChange={(event) => updateCredentials('email', event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.field__label}>Пароль*</span>
              <input
                className={styles.field__control}
                type="password"
                value={credentials.password}
                onChange={(event) => updateCredentials('password', event.target.value)}
              />
            </label>
            <button className={styles.button} type="submit" disabled={isLoading}>
              Получить код входа
            </button>
          </form>

          {(auth.staffLoginEmail || auth.message) && (
            <form className={styles.form} onSubmit={submitStaffCode}>
              <div className={styles.notice}>
                <strong>{auth.message}</strong>
                {auth.emailPreviewUrl && (
                  <a href={auth.emailPreviewUrl} target="_blank" rel="noreferrer">
                    Открыть письмо Ethereal
                  </a>
                )}
                {auth.emailCode && (
                  <span>
                    Dev-код входа: <strong>{auth.emailCode}</strong>
                  </span>
                )}
              </div>
              <label className={styles.field}>
                <span className={styles.field__label}>Код входа*</span>
                <input
                  className={styles.field__control}
                  value={credentials.code}
                  onChange={(event) => updateCredentials('code', event.target.value)}
                  placeholder="6 цифр"
                />
              </label>
              <button className={styles.button} type="submit" disabled={isLoading}>
                Войти в панель
              </button>
            </form>
          )}
        </>
      )}

      {auth.status === 'failed' && <p className={styles.message__error}>{auth.message}</p>}
    </section>
  );
}


export default AuthPanel;
