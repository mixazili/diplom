import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './PasswordInput.module.css';

function PasswordInput({ className = '', value, onChange, placeholder = '', disabled = false, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.passwordInput}>
      <input
        {...props}
        className={`${className} ${styles.passwordInput__control}`}
        disabled={disabled}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      <button
        className={styles.passwordInput__toggle}
        type="button"
        onClick={() => setVisible((current) => !current)}
        disabled={disabled}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export default PasswordInput;
