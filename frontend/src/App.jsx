import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  loginUser,
  logout,
  registerUser,
  requestStaffLogin,
  updateCurrentUser,
  verifyEmail,
  verifyStaffLogin
} from './features/auth/authSlice.js';
import { submitVerification } from './features/verification/verificationSlice.js';
import { apiRequest, authHeader } from './api/client.js';
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

const directorBasisLabels = {
  charter: 'Устав',
  other: 'Иной документ',
  regulation: 'Положение',
  power_of_attorney: 'Доверенность',
  law: 'Закон'
};

const emptyVerificationForm = {
  accountType: 'individual',
  isResident: true,
  personalData: {
    firstName: '',
    lastName: '',
    middleName: '',
    fullName: '',
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
    legalAddress: '',
    phone: '',
    additionalPhone: ''
  },
  documentData: {
    documentType: 'passport',
    documentNumber: '',
    personalNumber: '',
    issuedBy: '',
    issuedAt: '',
    expiresAt: ''
  },
  bankData: {
    bankName: '',
    bankUnp: '',
    bankBic: '',
    iban: '',
    bankAddress: '',
    transitBankName: '',
    transitBankBic: '',
    transitIban: ''
  },
  organizationData: {
    shortName: '',
    fullName: '',
    unp: '',
    registrationDate: '',
    contactPhone: '',
    directorFullName: '',
    directorPosition: '',
    directorBasis: 'charter',
    directorPhone: '',
    powerOfAttorney: '',
    chiefAccountantFullName: '',
    chiefAccountantPhone: ''
  },
  agreements: {
    personalDataConsent: false,
    accuracyConfirmed: false
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

function SelectField({ label, section, name, form, onChange, errors, options, required = false }) {
  const errorKey = `${section}.${name}`;

  return (
    <label className={styles.field}>
      <span className={styles.field__label}>{label}{required ? '*' : ''}</span>
      <select
        className={`${styles.field__control} ${errors[errorKey] ? styles['field__control--error'] : ''}`}
        value={form[section][name]}
        onChange={(event) => onChange(section, name, event.target.value)}
      >
        {Object.entries(options).map(([value, labelText]) => (
          <option value={value} key={value}>{labelText}</option>
        ))}
      </select>
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
      <span className={styles.field__hint}>{files[name]?.[0]?.name || 'jpg, jpeg, png или pdf'}</span>
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

function PersonFields({ form, changeNested, errors, isEntrepreneur }) {
  if (isEntrepreneur) {
    return (
      <div className={styles.formGrid}>
        <Field label="ФИО" section="personalData" name="fullName" form={form} onChange={changeNested} errors={errors} required />
        <Field label="Контактный телефон" section="personalData" name="phone" form={form} onChange={changeNested} errors={errors} required />
        <Field label="Дополнительный телефон" section="personalData" name="additionalPhone" form={form} onChange={changeNested} errors={errors} />
      </div>
    );
  }

  return (
    <div className={styles.formGrid}>
      <Field label="Имя" section="personalData" name="firstName" form={form} onChange={changeNested} errors={errors} required />
      <Field label="Фамилия" section="personalData" name="lastName" form={form} onChange={changeNested} errors={errors} required />
      <Field label="Отчество" section="personalData" name="middleName" form={form} onChange={changeNested} errors={errors} required={form.isResident} />
      <Field label="Мобильный телефон" section="personalData" name="phone" form={form} onChange={changeNested} errors={errors} required />
      <Field label="Дополнительный телефон" section="personalData" name="additionalPhone" form={form} onChange={changeNested} errors={errors} />
    </div>
  );
}

function AddressBlock({ form, changeNested, errors, isLegalEntity }) {
  if (!form.isResident) {
    return (
      <div className={styles.formGrid}>
        <Field
          label={isLegalEntity ? 'Адрес регистрации' : 'Адрес проживания'}
          section="addressData"
          name={isLegalEntity ? 'registrationAddress' : 'residentialAddress'}
          form={form}
          onChange={changeNested}
          errors={errors}
          required
          as="textarea"
        />
        {isLegalEntity && (
          <>
            <Field label="Контактный телефон" section="addressData" name="phone" form={form} onChange={changeNested} errors={errors} required />
            <Field label="Дополнительный телефон" section="addressData" name="additionalPhone" form={form} onChange={changeNested} errors={errors} />
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={styles.formGrid}>
        <Field label="Область" section="addressData" name="region" form={form} onChange={changeNested} errors={errors} required={isLegalEntity} />
        <Field label="Район" section="addressData" name="district" form={form} onChange={changeNested} errors={errors} required={!isLegalEntity} />
        <Field label="Населённый пункт" section="addressData" name="locality" form={form} onChange={changeNested} errors={errors} required />
        <Field label="Почтовый индекс" section="addressData" name="postalCode" form={form} onChange={changeNested} errors={errors} required />
        <Field label="Улица / адрес" section="addressData" name="street" form={form} onChange={changeNested} errors={errors} required />
        <Field label="Номер дома" section="addressData" name="house" form={form} onChange={changeNested} errors={errors} required={!isLegalEntity} />
        <Field label="Корпус" section="addressData" name="building" form={form} onChange={changeNested} errors={errors} />
        <Field label="Квартира" section="addressData" name="apartment" form={form} onChange={changeNested} errors={errors} />
      </div>
      <label className={styles.checkboxLine}>
        <input
          type="checkbox"
          checked={isLegalEntity ? form.addressData.sameAsLegalAddress : form.addressData.sameAsRegistration}
          onChange={(event) =>
            changeNested(
              'addressData',
              isLegalEntity ? 'sameAsLegalAddress' : 'sameAsRegistration',
              event.target.checked
            )
          }
        />
        {isLegalEntity
          ? 'Почтовый адрес совпадает с юридическим адресом'
          : 'Адрес проживания совпадает с адресом регистрации'}
      </label>
      {isLegalEntity && !form.addressData.sameAsLegalAddress && (
        <Field label="Почтовый адрес" section="addressData" name="postalAddress" form={form} onChange={changeNested} errors={errors} required as="textarea" />
      )}
      {!isLegalEntity && !form.addressData.sameAsRegistration && (
        <Field label="Адрес проживания" section="addressData" name="residentialAddress" form={form} onChange={changeNested} errors={errors} required as="textarea" />
      )}
    </>
  );
}

function IdentityBlock({ form, changeNested, errors }) {
  return (
    <>
      <h2 className={styles.sectionTitle}>Документ, удостоверяющий личность</h2>
      <div className={styles.formGrid}>
        <SelectField label="Вид документа" section="documentData" name="documentType" form={form} onChange={changeNested} errors={errors} options={documentTypeLabels} required />
        <Field label="Серия и номер документа" section="documentData" name="documentNumber" form={form} onChange={changeNested} errors={errors} required />
        {!form.isResident && (
          <Field label="Личный номер" section="documentData" name="personalNumber" form={form} onChange={changeNested} errors={errors} required />
        )}
        {form.documentData.documentType !== 'id_card' && (
          <Field label="Кем выдан" section="documentData" name="issuedBy" form={form} onChange={changeNested} errors={errors} required />
        )}
        <Field label="Когда выдан" section="documentData" name="issuedAt" type="date" form={form} onChange={changeNested} errors={errors} required />
        {form.isResident && (
          <Field label="Срок действия" section="documentData" name="expiresAt" type="date" form={form} onChange={changeNested} errors={errors} required />
        )}
      </div>
    </>
  );
}

function BankFields({ form, changeNested, errors }) {
  return (
    <div className={styles.formGrid}>
      <Field label="Название банка" section="bankData" name="bankName" form={form} onChange={changeNested} errors={errors} required />
      <Field label="УНП банка" section="bankData" name="bankUnp" form={form} onChange={changeNested} errors={errors} required />
      <Field label="Код банка (BIC)" section="bankData" name="bankBic" form={form} onChange={changeNested} errors={errors} required />
      <Field label="Номер карт-счёта банка IBAN" section="bankData" name="iban" form={form} onChange={changeNested} errors={errors} required />
      <Field label="Адрес банка" section="bankData" name="bankAddress" form={form} onChange={changeNested} errors={errors} required />
      {!form.isResident && (
        <>
          <Field label="Название транзитного банка" section="bankData" name="transitBankName" form={form} onChange={changeNested} errors={errors} required />
          <Field label="Код транзитного банка (BIC)" section="bankData" name="transitBankBic" form={form} onChange={changeNested} errors={errors} required />
          <Field label="Номер транзитного счёта" section="bankData" name="transitIban" form={form} onChange={changeNested} errors={errors} required />
        </>
      )}
    </div>
  );
}

function PersonFiles({ form, files, changeFile, errors }) {
  if (form.isResident) {
    return (
      <div className={styles.formGrid}>
        <FileField label="Прописка: временная регистрация или 25 страница паспорта" name="documentRegistration" files={files} onFileChange={changeFile} errors={errors} required />
        <FileField label="Лицевая сторона ID-карты или страницы 32-33 паспорта на одном фото" name="documentMain" files={files} onFileChange={changeFile} errors={errors} required />
        <FileField label="Обратная сторона ID-карты или 31 страница паспорта" name="documentBack" files={files} onFileChange={changeFile} errors={errors} />
        <FileField label="Дополнительный документ" name="documentExtra" files={files} onFileChange={changeFile} errors={errors} />
      </div>
    );
  }

  return (
    <div className={styles.formGrid}>
      <FileField label="Страницы 32-33 паспорта на одном фото / лицевая сторона ID-карты" name="documentMain" files={files} onFileChange={changeFile} errors={errors} required />
      <FileField label="Копия страницы документа с личным номером" name="documentPersonalNumberPage" files={files} onFileChange={changeFile} errors={errors} required />
      <FileField label="Дополнительный документ 1" name="documentExtra" files={files} onFileChange={changeFile} errors={errors} />
      <FileField label="Дополнительный документ 2" name="documentExtraSecond" files={files} onFileChange={changeFile} errors={errors} />
    </div>
  );
}

function OrganizationFields({ form, changeNested, errors, isLegalEntity }) {
  return (
    <>
      <h2 className={styles.sectionTitle}>Основные сведения</h2>
      <div className={styles.formGrid}>
        {isLegalEntity ? (
          <>
            <Field label="Полное наименование организации" section="organizationData" name="fullName" form={form} onChange={changeNested} errors={errors} required />
            <Field label="Краткое наименование организации" section="organizationData" name="shortName" form={form} onChange={changeNested} errors={errors} required />
          </>
        ) : (
          <Field label="ФИО" section="personalData" name="fullName" form={form} onChange={changeNested} errors={errors} required />
        )}
        <Field label="УНП" section="organizationData" name="unp" form={form} onChange={changeNested} errors={errors} required />
        <Field label="Дата регистрации в ЕГР" section="organizationData" name="registrationDate" type="date" form={form} onChange={changeNested} errors={errors} required />
        <Field label="Контактный телефон" section="organizationData" name="contactPhone" form={form} onChange={changeNested} errors={errors} required />
      </div>
    </>
  );
}

function LegalManagementFields({ form, changeNested, errors }) {
  return (
    <>
      <h2 className={styles.sectionTitle}>Руководитель</h2>
      <div className={styles.formGrid}>
        <Field label="ФИО руководителя" section="organizationData" name="directorFullName" form={form} onChange={changeNested} errors={errors} required />
        <Field label="Должность руководителя" section="organizationData" name="directorPosition" form={form} onChange={changeNested} errors={errors} required />
        <SelectField
          label="Тип документа о назначении"
          section="organizationData"
          name="directorBasis"
          form={form}
          onChange={changeNested}
          errors={errors}
          options={directorBasisLabels}
          required
        />
        <Field label="Телефон руководителя" section="organizationData" name="directorPhone" form={form} onChange={changeNested} errors={errors} required />
        <Field label="Номер и дата доверенности" section="organizationData" name="powerOfAttorney" form={form} onChange={changeNested} errors={errors} />
      </div>
      <h2 className={styles.sectionTitle}>Главный бухгалтер</h2>
      <div className={styles.formGrid}>
        <Field label="ФИО главного бухгалтера" section="organizationData" name="chiefAccountantFullName" form={form} onChange={changeNested} errors={errors} />
        <Field label="Телефон главного бухгалтера" section="organizationData" name="chiefAccountantPhone" form={form} onChange={changeNested} errors={errors} />
      </div>
    </>
  );
}

function OrganizationFiles({ isLegalEntity, files, changeFile, errors }) {
  return (
    <div className={styles.formGrid}>
      <FileField label={isLegalEntity ? 'Копия устава в полном объёме (pdf, zip)' : 'Свидетельство о регистрации'} name="registrationCertificate" files={files} onFileChange={changeFile} errors={errors} required />
      {isLegalEntity && (
        <>
          <FileField label="Свидетельство о регистрации" name="stateRegistrationCertificate" files={files} onFileChange={changeFile} errors={errors} required />
          <FileField label="Документ о назначении руководителя" name="directorAppointmentOrder" files={files} onFileChange={changeFile} errors={errors} required />
          <FileField label="Резервный документ о назначении руководителя" name="directorAppointmentReserve" files={files} onFileChange={changeFile} errors={errors} />
        </>
      )}
    </div>
  );
}

function AgreementsBlock({ form, changeNested, errors }) {
  return (
    <section className={styles.agreements}>
      <p className={styles.agreements__lead}>
        <strong>Уважаемый пользователь!</strong> В соответствии с Законом Республики Беларусь «О защите персональных
        данных» для продолжения работы на интернет-сайте Auction.by просим ознакомиться с Пользовательским соглашением
        и выразить согласие на обработку информации о пользователе, в том числе персональных данных.
      </p>
      <label className={styles.agreements__item}>
        <input
          type="checkbox"
          checked={form.agreements.personalDataConsent}
          onChange={(event) => changeNested('agreements', 'personalDataConsent', event.target.checked)}
        />
        <span>
          Ознакомлен с Пользовательским соглашением и согласен с обработкой информации о пользователе, в том числе
          персональных данных, а также их передачей, в том числе трансграничной, в соответствии с ним
        </span>
      </label>
      {errors['agreements.personalDataConsent'] && <span className={styles.field__error}>{errors['agreements.personalDataConsent']}</span>}
      <label className={styles.agreements__item}>
        <input
          type="checkbox"
          checked={form.agreements.accuracyConfirmed}
          onChange={(event) => changeNested('agreements', 'accuracyConfirmed', event.target.checked)}
        />
        <span>Я подтверждаю, что введённые мной личные данные верны и проверены мной</span>
      </label>
      {errors['agreements.accuracyConfirmed'] && <span className={styles.field__error}>{errors['agreements.accuracyConfirmed']}</span>}
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
        <p className={styles.panel__text}>{user.email} · статус: {user.verificationStatus}</p>
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

        {isIndividual && <PersonFields form={form} changeNested={changeNested} errors={errors} />}
        {isEntrepreneur && <OrganizationFields form={form} changeNested={changeNested} errors={errors} isLegalEntity={false} />}
        {isLegalEntity && <OrganizationFields form={form} changeNested={changeNested} errors={errors} isLegalEntity />}

        {(isIndividual || isEntrepreneur) && <IdentityBlock form={form} changeNested={changeNested} errors={errors} />}

        <h2 className={styles.sectionTitle}>{isLegalEntity ? 'Юридический адрес' : 'Адрес'}</h2>
        <AddressBlock form={form} changeNested={changeNested} errors={errors} isLegalEntity={isLegalEntity} />

        {isLegalEntity && <LegalManagementFields form={form} changeNested={changeNested} errors={errors} />}

        <h2 className={styles.sectionTitle}>Копии документов</h2>
        {(isIndividual || isEntrepreneur) && <PersonFiles form={form} files={files} changeFile={changeFile} errors={errors} />}
        {isEntrepreneur && (
          <div className={styles.formGrid}>
            <FileField label="Свидетельство о регистрации ИП" name="registrationCertificate" files={files} onFileChange={changeFile} errors={errors} required />
          </div>
        )}
        {isLegalEntity && <OrganizationFiles isLegalEntity files={files} changeFile={changeFile} errors={errors} />}

        <h2 className={styles.sectionTitle}>Банковские реквизиты для возврата задатка</h2>
        <BankFields form={form} changeNested={changeNested} errors={errors} />

        <AgreementsBlock form={form} changeNested={changeNested} errors={errors} />

        {(verification.message || clientError) && (
          <p className={verification.status === 'failed' || clientError ? styles.message__error : styles.message__success}>
            {clientError || verification.message}
          </p>
        )}

        <button className={styles.button} type="submit" disabled={verification.status === 'loading'}>
          Отправить заявку на проверку
        </button>
      </form>
    </section>
  );
}

function StaffCard({ title, meta, status, children, actions }) {
  const [open, setOpen] = useState(false);

  return (
    <article className={styles.staffCard}>
      <button className={styles.staffCard__head} type="button" onClick={() => setOpen((value) => !value)}>
        <span>
          <strong>{title}</strong>
          <small>{meta}</small>
        </span>
        {status && <span className={styles.staffCard__badge}>{status}</span>}
      </button>
      {open && (
        <div className={styles.staffCard__body}>
          {children}
          {actions}
        </div>
      )}
    </article>
  );
}

function JsonDetails({ data }) {
  return <pre className={styles.jsonDetails}>{JSON.stringify(data, null, 2)}</pre>;
}

function useStaffRequest(token) {
  return async (path, options = {}) =>
    apiRequest(path, {
      ...options,
      headers: {
        ...authHeader(token),
        ...(options.headers || {})
      }
    });
}

function ReviewList({ reviews, title }) {
  return (
    <section className={styles.staffSection}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.staffList}>
        {reviews.length === 0 && <p className={styles.panel__text}>Журнал пока пуст.</p>}
        {reviews.map((review) => (
          <StaffCard
            key={review.id}
            title={`${review.action === 'approved' ? 'Одобрено' : 'Отклонено'}: ${review.user?.email || 'пользователь'}`}
            meta={`${new Date(review.createdAt).toLocaleString()} · модератор: ${review.moderator?.email || 'не указан'}`}
            status={review.action}
          >
            {review.comment && <p className={styles.staffCard__comment}>{review.comment}</p>}
            <JsonDetails data={review.verificationRequest} />
          </StaffCard>
        ))}
      </div>
    </section>
  );
}

function VerificationQueue({ verifications, onApprove, onReject }) {
  const [comments, setComments] = useState({});

  const updateComment = (id, value) => {
    setComments((current) => ({ ...current, [id]: value }));
  };

  return (
    <section className={styles.staffSection}>
      <h2 className={styles.sectionTitle}>Заявки на верификацию</h2>
      <div className={styles.staffList}>
        {verifications.length === 0 && <p className={styles.panel__text}>Нет заявок в ожидании.</p>}
        {verifications.map((verification) => (
          <StaffCard
            key={verification.id}
            title={verification.user?.email || 'Пользователь'}
            meta={`${verification.accountType} · ${verification.isResident ? 'резидент РБ' : 'нерезидент РБ'} · ${new Date(verification.submittedAt).toLocaleString()}`}
            status={verification.status}
            actions={(
              <div className={styles.staffActions}>
                <textarea
                  className={styles.field__control}
                  value={comments[verification.id] || ''}
                  onChange={(event) => updateComment(verification.id, event.target.value)}
                  placeholder="Комментарий для пользователя при отклонении или внутренняя заметка"
                />
                <button className={styles.button} type="button" onClick={() => onApprove(verification.id, comments[verification.id] || '')}>
                  Одобрить
                </button>
                <button className={styles.buttonDanger} type="button" onClick={() => onReject(verification.id, comments[verification.id] || '')}>
                  Отклонить
                </button>
              </div>
            )}
          >
            <JsonDetails data={verification} />
          </StaffCard>
        ))}
      </div>
    </section>
  );
}

function ModeratorPanel() {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((state) => state.auth);
  const staffRequest = useStaffRequest(accessToken);
  const [verifications, setVerifications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState('');

  const loadPanel = async () => {
    const [verificationData, reviewData] = await Promise.all([
      staffRequest('/moderation/verifications'),
      staffRequest('/moderation/reviews')
    ]);
    setVerifications(verificationData.verifications);
    setReviews(reviewData.reviews);
  };

  useEffect(() => {
    loadPanel().catch((error) => setMessage(error.message));
  }, []);

  const review = async (id, action, comment) => {
    try {
      await staffRequest(`/moderation/verifications/${id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ comment })
      });
      setMessage(action === 'approve' ? 'Заявка одобрена' : 'Заявка отклонена');
      await loadPanel();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className={styles.cabinet}>
      <section className={styles.summary}>
        <div>
          <p className={styles.summary__label}>Панель модератора</p>
          <h2 className={styles.summary__title}>{user.email}</h2>
          <p className={styles.summary__text}>Проверка заявок пользователей и журнал своих решений.</p>
        </div>
        <button className={styles.buttonSecondary} type="button" onClick={() => dispatch(logout())}>
          Выйти
        </button>
      </section>
      {message && <p className={styles.message__success}>{message}</p>}
      <VerificationQueue
        verifications={verifications}
        onApprove={(id, comment) => review(id, 'approve', comment)}
        onReject={(id, comment) => review(id, 'reject', comment)}
      />
      <ReviewList reviews={reviews} title="Мой журнал решений" />
    </div>
  );
}

function AdminPanel() {
  const dispatch = useDispatch();
  const { accessToken, user } = useSelector((state) => state.auth);
  const staffRequest = useStaffRequest(accessToken);
  const [moderators, setModerators] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [moderatorForm, setModeratorForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');

  const loadPanel = async () => {
    const [moderatorData, reviewData] = await Promise.all([
      staffRequest('/admin/moderators'),
      staffRequest('/admin/reviews')
    ]);
    setModerators(moderatorData.moderators);
    setReviews(reviewData.reviews);
  };

  useEffect(() => {
    loadPanel().catch((error) => setMessage(error.message));
  }, []);

  const createModerator = async (event) => {
    event.preventDefault();
    try {
      await staffRequest('/admin/moderators', {
        method: 'POST',
        body: JSON.stringify(moderatorForm)
      });
      setModeratorForm({ email: '', password: '' });
      setMessage('Модератор создан');
      await loadPanel();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const deleteModerator = async (id) => {
    try {
      await staffRequest(`/admin/moderators/${id}`, { method: 'DELETE' });
      setMessage('Модератор удалён');
      await loadPanel();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className={styles.cabinet}>
      <section className={styles.summary}>
        <div>
          <p className={styles.summary__label}>Панель администратора</p>
          <h2 className={styles.summary__title}>{user.email}</h2>
          <p className={styles.summary__text}>Управление модераторами и общий журнал решений.</p>
        </div>
        <button className={styles.buttonSecondary} type="button" onClick={() => dispatch(logout())}>
          Выйти
        </button>
      </section>

      {message && <p className={styles.message__success}>{message}</p>}

      <section className={styles.staffSection}>
        <h2 className={styles.sectionTitle}>Модераторы</h2>
        <form className={styles.staffForm} onSubmit={createModerator}>
          <input
            className={styles.field__control}
            type="email"
            value={moderatorForm.email}
            onChange={(event) => setModeratorForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="email модератора"
          />
          <input
            className={styles.field__control}
            type="password"
            value={moderatorForm.password}
            onChange={(event) => setModeratorForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="пароль от 8 символов"
          />
          <button className={styles.button} type="submit">Создать модератора</button>
        </form>
        <div className={styles.moderatorGrid}>
          {moderators.map((moderator) => (
            <article className={styles.moderatorCard} key={moderator.id}>
              <strong>{moderator.email}</strong>
              <span className={moderator.onlineStatus === 'online' ? styles.online : styles.offline}>
                {moderator.onlineStatus === 'online' ? 'online' : 'offline'}
              </span>
              <small>Последняя активность: {moderator.lastSeenAt ? new Date(moderator.lastSeenAt).toLocaleString() : 'нет'}</small>
              <button className={styles.buttonDanger} type="button" onClick={() => deleteModerator(moderator.id)}>
                Удалить
              </button>
            </article>
          ))}
        </div>
      </section>

      <ReviewList reviews={reviews} title="Журнал решений всех модераторов" />
    </div>
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
  let content = <AuthPanel />;

  if (user?.role === 'admin') {
    content = <AdminPanel />;
  } else if (user?.role === 'moderator') {
    content = <ModeratorPanel />;
  } else if (user) {
    content = <Cabinet />;
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
