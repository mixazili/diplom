import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearAuthFlow,
  confirmPasswordReset,
  loginUser,
  registerUser,
  requestPasswordReset,
  requestStaffLogin,
  verifyEmail,
  verifyStaffLogin
} from '../../features/auth/authSlice.js';
import PasswordInput from '../ui/PasswordInput.jsx';
import styles from './AuthPanel.module.css';

const initialCredentials = {
  email: '',
  password: '',
  passwordRepeat: '',
  code: '',
  rememberMe: true,
  agreement: false
};

function Field({ label, type = 'text', value, onChange, placeholder, error, required = false }) {
  const controlClassName = `${styles.field__control} ${error ? styles['field__control--error'] : ''}`;

  return (
    <label className={styles.field}>
      <span className={styles.field__label}>
        {label}{required && <span className={styles.requiredMark}>*</span>}
      </span>
      {type === 'password' ? (
        <PasswordInput
          className={controlClassName}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={controlClassName}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      )}
      {error && <span className={styles.field__error}>{error}</span>}
    </label>
  );
}

function CodeNotice({ auth, label = 'Dev-код' }) {
  if (!auth.emailCode && !auth.emailDeliveryError && !auth.emailPreviewUrl) {
    return null;
  }

  return (
    <div className={styles.authNotice}>
      {auth.emailCode && (
        <p>
          {label}: <strong>{auth.emailCode}</strong>
        </p>
      )}
      {auth.emailPreviewUrl && (
        <a href={auth.emailPreviewUrl} target="_blank" rel="noreferrer">
          Открыть письмо Ethereal
        </a>
      )}
      {auth.emailDeliveryError && <small>Почтовый сервис недоступен, используйте dev-код.</small>}
    </div>
  );
}

function AuthPanel({ staffOnly = false, initialMode = 'register' }) {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const [mode, setMode] = useState(staffOnly ? 'staff' : initialMode);
  const [resetStep, setResetStep] = useState('email');
  const [credentials, setCredentials] = useState(initialCredentials);

  useEffect(() => {
    setMode(staffOnly ? 'staff' : initialMode);
    setCredentials(initialCredentials);
    setResetStep('email');
    dispatch(clearAuthFlow());
  }, [dispatch, initialMode, staffOnly]);

  const title = useMemo(() => {
    if (staffOnly) {
      return 'Вход для сотрудников';
    }

    if (mode === 'recover') {
      return 'Восстановление доступа';
    }

    return 'Регистрация и вход';
  }, [mode, staffOnly]);

  const updateCredentials = (field, value) => {
    setCredentials((current) => ({ ...current, [field]: value }));
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setResetStep('email');
    setCredentials((current) => ({ ...initialCredentials, email: current.email }));
    dispatch(clearAuthFlow());
  };

  const submitRegister = (event) => {
    event.preventDefault();

    if (!credentials.agreement) {
      return;
    }

    if (credentials.password !== credentials.passwordRepeat) {
      return;
    }

    dispatch(registerUser({ email: credentials.email, password: credentials.password }));
  };

  const submitEmailVerification = (event) => {
    event.preventDefault();
    dispatch(
      verifyEmail({
        email: auth.registrationEmail || credentials.email,
        code: credentials.code,
        rememberMe: credentials.rememberMe
      })
    );
  };

  const submitLogin = (event) => {
    event.preventDefault();
    dispatch(loginUser({ email: credentials.email, password: credentials.password, rememberMe: credentials.rememberMe }));
  };

  const submitStaffCodeRequest = (event) => {
    event.preventDefault();
    dispatch(requestStaffLogin({ email: credentials.email, password: credentials.password }));
  };

  const submitStaffVerification = (event) => {
    event.preventDefault();
    dispatch(verifyStaffLogin({ email: auth.staffLoginEmail || credentials.email, code: credentials.code }));
  };

  const submitResetEmail = (event) => {
    event.preventDefault();
    dispatch(requestPasswordReset({ email: credentials.email })).then((result) => {
      if (!result.error) {
        setResetStep('code');
      }
    });
  };

  const submitResetPassword = (event) => {
    event.preventDefault();

    if (credentials.password !== credentials.passwordRepeat) {
      return;
    }

    dispatch(
      confirmPasswordReset({
        email: auth.resetEmail || credentials.email,
        code: credentials.code,
        password: credentials.password,
        rememberMe: credentials.rememberMe
      })
    );
  };

  return (
    <section className={styles.panel}>
      <p className={styles.panel__eyebrow}>AUCTION.BY</p>
      <h1>{title}</h1>

      {!staffOnly && (
        <div className={styles.tabs} role="tablist">
          <button
            className={`${styles.tabs__button} ${mode === 'register' ? styles['tabs__button--active'] : ''}`}
            type="button"
            onClick={() => switchMode('register')}
          >
            Регистрация
          </button>
          <button
            className={`${styles.tabs__button} ${mode === 'login' ? styles['tabs__button--active'] : ''}`}
            type="button"
            onClick={() => switchMode('login')}
          >
            Вход
          </button>
        </div>
      )}

      {mode === 'register' && !staffOnly && (
        <>
          <form className={styles.form} onSubmit={submitRegister}>
            <Field label="Email" required value={credentials.email} onChange={(value) => updateCredentials('email', value)} error={auth.errors.email} />
            <Field
              label="Пароль"
              type="password"
              required
              value={credentials.password}
              onChange={(value) => updateCredentials('password', value)}
              placeholder="Минимум 8 символов"
              error={auth.errors.password}
            />
            <Field
              label="Повторите пароль"
              type="password"
              required
              value={credentials.passwordRepeat}
              onChange={(value) => updateCredentials('passwordRepeat', value)}
              error={credentials.passwordRepeat && credentials.passwordRepeat !== credentials.password ? 'Пароли не совпадают' : ''}
            />
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={credentials.agreement}
                onChange={(event) => updateCredentials('agreement', event.target.checked)}
              />
              <span>
                Ознакомлен с{' '}
                <a href="/information/user-agreement">
                  Пользовательским соглашением интернет-сайта Auction.by
                </a>{' '}
                и согласен с обработкой информации о пользователе, в том числе персональных данных, а также их передачей,
                в том числе трансграничной, в соответствии с ним.
              </span>
            </label>
            <button className={styles.button} type="submit" disabled={auth.status === 'loading' || !credentials.agreement}>
              Отправить код
            </button>
          </form>

          <CodeNotice auth={auth} label="Dev-код подтверждения" />

          {(auth.registrationEmail || auth.emailCode) && (
            <form className={`${styles.form} ${styles.formCompact}`} onSubmit={submitEmailVerification}>
              <Field label="Код из письма" required value={credentials.code} onChange={(value) => updateCredentials('code', value)} placeholder="6 цифр" />
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={credentials.rememberMe}
                  onChange={(event) => updateCredentials('rememberMe', event.target.checked)}
                />
                <span>Запомнить меня</span>
              </label>
              <button className={styles.button} type="submit" disabled={auth.status === 'loading'}>
                Подтвердить email
              </button>
            </form>
          )}

          <p className={styles.authLinkLine}>
            Уже есть аккаунт? <button type="button" onClick={() => switchMode('login')}>Войти</button>
          </p>
        </>
      )}

      {mode === 'login' && !staffOnly && (
        <form className={styles.form} onSubmit={submitLogin}>
          <Field label="Email" required value={credentials.email} onChange={(value) => updateCredentials('email', value)} error={auth.errors.email} />
          <Field label="Пароль" type="password" required value={credentials.password} onChange={(value) => updateCredentials('password', value)} />
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={credentials.rememberMe}
              onChange={(event) => updateCredentials('rememberMe', event.target.checked)}
            />
            <span>Запомнить меня</span>
          </label>
          <button className={styles.button} type="submit" disabled={auth.status === 'loading'}>
            Войти
          </button>
          <div className={styles.authLinks}>
            <button type="button" onClick={() => switchMode('register')}>Зарегистрироваться</button>
            <button type="button" onClick={() => switchMode('recover')}>Забыли пароль?</button>
          </div>
        </form>
      )}

      {mode === 'recover' && !staffOnly && (
        <>
          {resetStep === 'email' ? (
            <form className={styles.form} onSubmit={submitResetEmail}>
              <Field label="Email" required value={credentials.email} onChange={(value) => updateCredentials('email', value)} error={auth.errors.email} />
              <button className={styles.button} type="submit" disabled={auth.status === 'loading'}>
                Получить код
              </button>
            </form>
          ) : (
            <form className={styles.form} onSubmit={submitResetPassword}>
              <CodeNotice auth={auth} label="Dev-код восстановления" />
              <Field label="Код восстановления" required value={credentials.code} onChange={(value) => updateCredentials('code', value)} placeholder="6 цифр" />
              <Field label="Новый пароль" required type="password" value={credentials.password} onChange={(value) => updateCredentials('password', value)} />
              <Field
                label="Повторите новый пароль"
                required
                type="password"
                value={credentials.passwordRepeat}
                onChange={(value) => updateCredentials('passwordRepeat', value)}
                error={credentials.passwordRepeat && credentials.passwordRepeat !== credentials.password ? 'Пароли не совпадают' : ''}
              />
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={credentials.rememberMe}
                  onChange={(event) => updateCredentials('rememberMe', event.target.checked)}
                />
                <span>Запомнить меня</span>
              </label>
              <button className={styles.button} type="submit" disabled={auth.status === 'loading'}>
                Сменить пароль и войти
              </button>
            </form>
          )}
          <p className={styles.authLinkLine}>
            Вспомнили пароль? <button type="button" onClick={() => switchMode('login')}>Войти</button>
          </p>
        </>
      )}

      {staffOnly && (
        <>
          <form className={styles.form} onSubmit={submitStaffCodeRequest}>
            <Field label="Email сотрудника" required value={credentials.email} onChange={(value) => updateCredentials('email', value)} />
            <Field label="Пароль" required type="password" value={credentials.password} onChange={(value) => updateCredentials('password', value)} />
            <button className={styles.button} type="submit" disabled={auth.status === 'loading'}>
              Получить код входа
            </button>
          </form>

          <CodeNotice auth={auth} label="Dev-код входа" />

          {(auth.staffLoginEmail || auth.emailCode) && (
            <form className={`${styles.form} ${styles.formCompact}`} onSubmit={submitStaffVerification}>
              <Field label="Код входа" required value={credentials.code} onChange={(value) => updateCredentials('code', value)} placeholder="6 цифр" />
              <button className={styles.button} type="submit" disabled={auth.status === 'loading'}>
                Войти в панель
              </button>
            </form>
          )}
        </>
      )}

      {auth.message && auth.status === 'failed' && <p className={styles.message__error}>{auth.message}</p>}
    </section>
  );
}

export default AuthPanel;
