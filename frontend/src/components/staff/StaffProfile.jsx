import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { changePassword } from '../../features/auth/authSlice.js';
import PasswordInput from '../ui/PasswordInput.jsx';
import styles from './StaffProfile.module.css';

function StaffProfile({ roleLabel }) {
  const dispatch = useDispatch();
  const { user, status: authStatus, errors: authErrors } = useSelector((state) => state.auth);
  const [passwordForm, setPasswordForm] = useState({ password: '', passwordRepeat: '' });
  const [passwordError, setPasswordError] = useState('');

  const submitPassword = (event) => {
    event.preventDefault();
    setPasswordError('');

    if (passwordForm.password !== passwordForm.passwordRepeat) {
      setPasswordError('Пароли не совпадают');
      return;
    }

    dispatch(changePassword({ password: passwordForm.password })).then((result) => {
      if (!result.error) {
        setPasswordForm({ password: '', passwordRepeat: '' });
      }
    });
  };

  return (
    <section className={styles.panel}>
      <h1 className={styles.panel__title}>Профиль</h1>

      <div className={styles.profileStack}>
        <div className={styles.profileLine}>
          <span>Email</span>
          <strong>{user.email}</strong>
        </div>
        <div className={styles.profileLine}>
          <span>Роль</span>
          <strong>{roleLabel}</strong>
        </div>
      </div>

      <form className={styles.passwordForm} onSubmit={submitPassword}>
        <h2>Смена пароля</h2>
        <label className={styles.field}>
          <span className={styles.field__label}>Новый пароль<span className={styles.requiredMark}>*</span></span>
          <PasswordInput
            className={styles.field__control}
            value={passwordForm.password}
            onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Минимум 8 символов"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.field__label}>Повторите новый пароль<span className={styles.requiredMark}>*</span></span>
          <PasswordInput
            className={styles.field__control}
            value={passwordForm.passwordRepeat}
            onChange={(event) => setPasswordForm((current) => ({ ...current, passwordRepeat: event.target.value }))}
          />
        </label>
        {(passwordError || authErrors.password) && <p className={styles.message__error}>{passwordError || authErrors.password}</p>}
        <button className={styles.buttonSecondary} type="submit" disabled={authStatus === 'loading'}>
          Сменить пароль
        </button>
      </form>
    </section>
  );
}

export default StaffProfile;
