import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, logout, registerUser, updateCurrentUser, verifyEmail } from './features/auth/authSlice.js';
import { submitVerification } from './features/verification/verificationSlice.js';
import styles from './App.module.css';

const accountTypeLabels = {
  individual: 'Физическое лицо',
  legal_entity: 'Юридическое лицо',
  entrepreneur: 'Индивидуальный предприниматель'
};

const documentTypeLabels = {
  passport: 'Паспорт',
  id_card: 'ID-карта',
  residence_permit: 'Вид на жительство'
};

const emptyVerificationForm = {
  accountType: 'individual',
  isResident: true,
  personalData: {
    firstName: '',
    lastName: '',
    middleName: '',
    phone: '',
    additionalPhone: ''
  },
  addressData: {
    region: '',
    district: '',
    locality: '',
    postalCode: '',
    street: '',
    house: '',
    building: '',
    apartment: '',
    sameAsRegistration: true,
    sameAsLegalAddress: true,
    residentialAddress: '',
    postalAddress: '',
    registrationAddress: '',
    phone: '',
    additionalPhone: ''
  },
  documentData: {
    documentType: 'passport',
    documentNumber: '',
    issuedBy: '',
    issuedAt: '',
    expiresAt: ''
  },
  bankData: {
    bankDetails: ''
  },
  organizationData: {
    shortName: '',
    fullName: '',
    unp: '',
    directorFullName: '',
    directorBasis: ''
  }
};

function Field({
  label,
  section,
  name,
  form,
  onChange,
  errors,
  required = false,
  type = 'text',
  placeholder = '',
  as = 'input',
  disabled = false
}) {
  const Component = as;
  const errorKey = `${section}.${name}`;
  const value = form[section][name] || '';

  return (
    <label className={styles.field}>
      <span className={styles.field__label}>{label}{required ? '*' : ''}</span>
      <Component
        className={`${styles.field__control} ${errors[errorKey] ? styles['field__control--error'] : ''}`}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(section, name, event.target.value)}
      />
      {errors[errorKey] && <span className={styles.field__error}>{errors[errorKey]}</span>}
    </label>
  );
}

function FileField({ label, name, files, onFileChange, errors, required = false }) {
  return (
    <label className={styles.field}>
      <span className={styles.field__label}>{label}{required ? '*' : ''}</span>
      <input
        className={`${styles.field__control} ${errors[name] ? styles['field__control--error'] : ''}`}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={(event) => onFileChange(name, event.target.files)}
      />
      <span className={styles.field__hint}>
        {files[name]?.[0]?.name || 'jpg, jpeg, png или pdf'}
      </span>
      {errors[name] && <span className={styles.field__error}>{errors[name]}</span>}
    </label>
  );
}

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

      {auth.status === 'failed' && <p className={styles.message__error}>{auth.message}</p>}
    </section>
  );
}

function VerificationForm() {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((state) => state.auth);
  const verification = useSelector((state) => state.verification);
  const [form, setForm] = useState(emptyVerificationForm);
  const [files, setFiles] = useState({});
  const [clientError, setClientError] = useState('');
  const errors = verification.errors || {};
  const isIndividual = form.accountType === 'individual';
  const isLegalEntity = form.accountType === 'legal_entity';
  const isEntrepreneur = form.accountType === 'entrepreneur';

  const title = useMemo(() => {
    const base = accountTypeLabels[form.accountType];
    return form.isResident ? base : `${base}, нерезидент РБ`;
  }, [form.accountType, form.isResident]);

  const changeRoot = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const changeNested = (section, field, value) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value
      }
    }));
  };

  const changeFile = (field, fileList) => {
    setFiles((current) => ({ ...current, [field]: fileList }));
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setClientError('');

    if (!accessToken) {
      setClientError('Сначала войдите в аккаунт');
      return;
    }

    const result = await dispatch(submitVerification({ payload: form, files, token: accessToken }));

    if (submitVerification.fulfilled.match(result)) {
      dispatch(updateCurrentUser(result.payload.user));
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.panel__header}>
        <p className={styles.panel__eyebrow}>Личный кабинет</p>
        <h1 className={styles.panel__title}>Верификация</h1>
        <p className={styles.panel__text}>
          {user.email} · статус: {user.verificationStatus}
        </p>
      </div>

      <form className={styles.verification} onSubmit={submitForm}>
        <div className={styles.choiceGroup}>
          {Object.entries(accountTypeLabels).map(([value, label]) => (
            <label className={styles.choiceGroup__item} key={value}>
              <input
                type="radio"
                name="accountType"
                checked={form.accountType === value}
                onChange={() => changeRoot('accountType', value)}
              />
              {label}
            </label>
          ))}
          <label className={styles.choiceGroup__item}>
            <input
              type="checkbox"
              checked={!form.isResident}
              onChange={(event) => changeRoot('isResident', !event.target.checked)}
            />
            Нерезидент РБ
          </label>
        </div>

        <h2 className={styles.sectionTitle}>{title}</h2>

        {(isIndividual || isEntrepreneur) && (
          <div className={styles.formGrid}>
            <Field label="Имя" section="personalData" name="firstName" form={form} onChange={changeNested} errors={errors} required />
            <Field label="Фамилия" section="personalData" name="lastName" form={form} onChange={changeNested} errors={errors} required />
            <Field label="Отчество" section="personalData" name="middleName" form={form} onChange={changeNested} errors={errors} required={form.isResident} />
            <Field label="Мобильный телефон" section="personalData" name="phone" form={form} onChange={changeNested} errors={errors} required />
            <Field label="Дополнительный телефон" section="personalData" name="additionalPhone" form={form} onChange={changeNested} errors={errors} />
          </div>
        )}

        {isLegalEntity && (
          <div className={styles.formGrid}>
            <Field label="Краткое наименование" section="organizationData" name="shortName" form={form} onChange={changeNested} errors={errors} required />
            <Field label="Полное наименование" section="organizationData" name="fullName" form={form} onChange={changeNested} errors={errors} required as="textarea" />
          </div>
        )}

        <h2 className={styles.sectionTitle}>{isLegalEntity ? 'Адрес регистрации' : 'Адрес'}</h2>

        {form.isResident ? (
          <div className={styles.formGrid}>
            <Field label="Область" section="addressData" name="region" form={form} onChange={changeNested} errors={errors} required />
            <Field label="Район" section="addressData" name="district" form={form} onChange={changeNested} errors={errors} required />
            <Field label="Населённый пункт" section="addressData" name="locality" form={form} onChange={changeNested} errors={errors} required />
            <Field label="Индекс" section="addressData" name="postalCode" form={form} onChange={changeNested} errors={errors} required />
            <Field label="Улица" section="addressData" name="street" form={form} onChange={changeNested} errors={errors} required />
            <Field label="Номер дома" section="addressData" name="house" form={form} onChange={changeNested} errors={errors} required={isIndividual || isEntrepreneur} />
            <Field label="Корпус" section="addressData" name="building" form={form} onChange={changeNested} errors={errors} />
            <Field label="Квартира" section="addressData" name="apartment" form={form} onChange={changeNested} errors={errors} />
            {isLegalEntity && (
              <>
                <Field label="Контактный телефон" section="addressData" name="phone" form={form} onChange={changeNested} errors={errors} required />
                <Field label="Дополнительный телефон" section="addressData" name="additionalPhone" form={form} onChange={changeNested} errors={errors} />
              </>
            )}
          </div>
        ) : (
          <div className={styles.formGrid}>
            {isLegalEntity ? (
              <>
                <Field label="Адрес регистрации" section="addressData" name="registrationAddress" form={form} onChange={changeNested} errors={errors} required as="textarea" />
                <Field label="Контактный телефон" section="addressData" name="phone" form={form} onChange={changeNested} errors={errors} required />
                <Field label="Дополнительный телефон" section="addressData" name="additionalPhone" form={form} onChange={changeNested} errors={errors} />
              </>
            ) : (
              <Field label="Адрес проживания" section="addressData" name="residentialAddress" form={form} onChange={changeNested} errors={errors} required as="textarea" />
            )}
          </div>
        )}

        {form.isResident && !isLegalEntity && (
          <label className={styles.checkboxLine}>
            <input
              type="checkbox"
              checked={form.addressData.sameAsRegistration}
              onChange={(event) => changeNested('addressData', 'sameAsRegistration', event.target.checked)}
            />
            Адрес проживания совпадает с адресом регистрации
          </label>
        )}
        {form.isResident && isLegalEntity && (
          <label className={styles.checkboxLine}>
            <input
              type="checkbox"
              checked={form.addressData.sameAsLegalAddress}
              onChange={(event) => changeNested('addressData', 'sameAsLegalAddress', event.target.checked)}
            />
            Адрес для почтовых отправлений совпадает с юридическим адресом
          </label>
        )}
        {form.isResident && !isLegalEntity && !form.addressData.sameAsRegistration && (
          <Field label="Адрес проживания" section="addressData" name="residentialAddress" form={form} onChange={changeNested} errors={errors} required as="textarea" />
        )}
        {form.isResident && isLegalEntity && !form.addressData.sameAsLegalAddress && (
          <Field label="Адрес для почтовых отправлений" section="addressData" name="postalAddress" form={form} onChange={changeNested} errors={errors} required as="textarea" />
        )}

        {isIndividual && (
          <>
            <h2 className={styles.sectionTitle}>Документ, удостоверяющий личность</h2>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.field__label}>Вид документа*</span>
                <select
                  className={`${styles.field__control} ${errors['documentData.documentType'] ? styles['field__control--error'] : ''}`}
                  value={form.documentData.documentType}
                  onChange={(event) => changeNested('documentData', 'documentType', event.target.value)}
                >
                  {Object.entries(documentTypeLabels).map(([value, label]) => (
                    <option value={value} key={value}>{label}</option>
                  ))}
                </select>
                {errors['documentData.documentType'] && <span className={styles.field__error}>{errors['documentData.documentType']}</span>}
              </label>
              <Field label="Номер документа" section="documentData" name="documentNumber" form={form} onChange={changeNested} errors={errors} required />
              {form.documentData.documentType !== 'id_card' && (
                <Field label="Кем выдан" section="documentData" name="issuedBy" form={form} onChange={changeNested} errors={errors} required />
              )}
              <Field label="Когда выдан" section="documentData" name="issuedAt" type="date" form={form} onChange={changeNested} errors={errors} required />
              {form.isResident && (
                <Field label="Срок действия" section="documentData" name="expiresAt" type="date" form={form} onChange={changeNested} errors={errors} required />
              )}
            </div>
          </>
        )}

        {(isLegalEntity || isEntrepreneur) && (
          <>
            <h2 className={styles.sectionTitle}>Регистрационные данные</h2>
            <div className={styles.formGrid}>
              <Field label={form.isResident ? 'УНП' : 'УНП / ИНН'} section="organizationData" name="unp" form={form} onChange={changeNested} errors={errors} required />
              <Field label={isLegalEntity ? 'Банковские реквизиты организации' : 'Банковские реквизиты'} section="bankData" name="bankDetails" form={form} onChange={changeNested} errors={errors} required as="textarea" />
              {isLegalEntity && (
                <>
                  <Field label="Должность и Ф.И.О. руководителя" section="organizationData" name="directorFullName" form={form} onChange={changeNested} errors={errors} required />
                  <Field label="На основании чего действует руководитель" section="organizationData" name="directorBasis" form={form} onChange={changeNested} errors={errors} required />
                </>
              )}
            </div>
          </>
        )}

        {isIndividual && (
          <>
            <h2 className={styles.sectionTitle}>Банковские реквизиты</h2>
            <Field label="Реквизиты для возврата задатка" section="bankData" name="bankDetails" form={form} onChange={changeNested} errors={errors} required as="textarea" />
          </>
        )}

        <h2 className={styles.sectionTitle}>Копии документов</h2>
        <div className={styles.formGrid}>
          {isIndividual && (
            <>
              <FileField label="Копия документа" name="documentMain" files={files} onFileChange={changeFile} errors={errors} required />
              <FileField
                label={form.isResident ? 'Копия регистрации' : 'Дополнительная копия документа'}
                name={form.isResident ? 'documentRegistration' : 'documentAdditional'}
                files={files}
                onFileChange={changeFile}
                errors={errors}
                required
              />
              <FileField label="Дополнительный документ" name="documentExtra" files={files} onFileChange={changeFile} errors={errors} />
            </>
          )}
          {(isLegalEntity || isEntrepreneur) && (
            <FileField label="Копия свидетельства о регистрации" name="registrationCertificate" files={files} onFileChange={changeFile} errors={errors} required />
          )}
        </div>

        <label className={styles.checkboxLine}>
          <input type="checkbox" required />
          Гарантирую достоверность указанных данных
        </label>

        {(verification.message || clientError) && (
          <p className={verification.status === 'failed' || clientError ? styles.message__error : styles.message__success}>
            {clientError || verification.message}
          </p>
        )}

        <button className={styles.button} type="submit" disabled={verification.status === 'loading'}>
          Отправить на верификацию
        </button>
      </form>
    </section>
  );
}

function Cabinet() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  return (
    <div className={styles.cabinet}>
      <section className={styles.summary}>
        <div>
          <p className={styles.summary__label}>Аккаунт</p>
          <h2 className={styles.summary__title}>{user.email}</h2>
          <p className={styles.summary__text}>
            Роль: {user.role} · Email подтверждён · Верификация: {user.verificationStatus}
          </p>
        </div>
        <button className={styles.buttonSecondary} type="button" onClick={() => dispatch(logout())}>
          Выйти
        </button>
      </section>
      <VerificationForm />
    </div>
  );
}

function App() {
  const user = useSelector((state) => state.auth.user);

  return (
    <main className={styles.app}>
      <div className={styles.app__shell}>
        {user ? <Cabinet /> : <AuthPanel />}
      </div>
    </main>
  );
}

export default App;
