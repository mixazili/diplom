import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateCurrentUser } from '../../features/auth/authSlice.js';
import { submitVerification } from '../../features/verification/verificationSlice.js';
import { accountTypeLabels, directorBasisLabels } from '../../constants/verificationLabels.js';
import { formatPhoneDisplay, phoneDigits } from '../../utils/inputFormatters.js';
import CustomSelect from '../ui/CustomSelect.jsx';
import styles from './VerificationForm.module.css';

const addressHint = 'Например: Минская область, г. Минск, ул. Октябрьская, д. 10, кв. 1118';
const phoneHint = 'Например: +375 (29) 123-45-67';
const agreementText =
  'Ознакомлен с Пользовательским соглашением интернет-сайта Auction.by и согласен с обработкой информации о пользователе, в том числе персональных данных, а также их передачей, в том числе трансграничной, в соответствии с ним';

const initialPayload = {
  accountType: 'individual',
  isResident: true,
  personalData: {
    firstName: '',
    lastName: '',
    middleName: '',
    phone: '',
    additionalPhone: '',
    notificationEmail: '',
    postalAddress: ''
  },
  addressData: {
    country: '',
    legalAddress: '',
    postalAddress: ''
  },
  organizationData: {
    shortName: '',
    fullName: '',
    unp: '',
    taxId: '',
    registrationDate: '',
    directorFullName: '',
    directorPosition: '',
    directorBasis: 'charter',
    chiefAccountantFullName: '',
    chiefAccountantPhone: ''
  },
  bankData: {
    iban: '',
    bankName: '',
    bankUnp: '',
    bankBic: '',
    transitIban: '',
    transitBankName: '',
    transitBankBic: ''
  },
  agreements: {
    personalDataConsent: false,
    accuracyConfirmed: false
  }
};

const personDocumentFields = (isResident) =>
  isResident
    ? [
        ['documentRegistration', 'Прописка: временная регистрация или 25 страница паспорта', true],
        ['documentMain', 'Лицевая сторона ID-карты или страницы 32-33 паспорта на одном фото', true],
        ['documentBack', 'Обратная сторона ID-карты или 31 страница паспорта', false],
        ['documentExtra', 'Селфи с разворотом 32-33 страниц паспорта или лицевой стороной ID-карты', false]
      ]
    : [
        ['documentMain', 'Страницы 32-33 паспорта на одном фото или лицевая сторона ID-карты', true],
        ['documentPersonalNumberPage', 'Копия страницы документа с личным номером', true],
        ['documentExtra', 'Селфи с разворотом 32-33 страниц паспорта или лицевой стороной ID-карты', false]
      ];

function getNestedValue(source, path) {
  return path.split('.').reduce((result, key) => result?.[key], source) ?? '';
}

function setNestedValue(source, path, value) {
  const keys = path.split('.');
  const next = { ...source };
  let cursor = next;

  keys.slice(0, -1).forEach((key) => {
    cursor[key] = { ...(cursor[key] || {}) };
    cursor = cursor[key];
  });

  cursor[keys[keys.length - 1]] = value;
  return next;
}

function Field({ label, path, payload, setPayload, errors, required = false, type = 'text', placeholder = '', as = 'input', wide = false }) {
  const Control = as;
  const isPhone = path.toLowerCase().includes('phone');
  const value = getNestedValue(payload, path);

  return (
    <label className={`${styles.field} ${wide ? styles.fieldFull : ''}`}>
      <span className={styles.field__label}>
        {label}{required && <span className={styles.requiredMark}>*</span>}
      </span>
      <Control
        className={`${styles.field__control} ${errors[path] ? styles['field__control--error'] : ''}`}
        type={as === 'input' ? type : undefined}
        value={isPhone ? formatPhoneDisplay(value) : value}
        onChange={(event) =>
          setPayload((current) => setNestedValue(current, path, isPhone ? phoneDigits(event.target.value) : event.target.value))
        }
        placeholder={placeholder}
        inputMode={isPhone ? 'tel' : undefined}
      />
      {errors[path] && <span className={styles.field__error}>{errors[path]}</span>}
    </label>
  );
}

function SelectField({ label, path, payload, setPayload, errors, options, required = false }) {
  return (
    <label className={styles.field}>
      <span className={styles.field__label}>
        {label}{required && <span className={styles.requiredMark}>*</span>}
      </span>
      <CustomSelect
        value={getNestedValue(payload, path)}
        options={options.map(([value, text]) => ({ value, label: text }))}
        onChange={(value) => setPayload((current) => setNestedValue(current, path, value))}
        error={Boolean(errors[path])}
      />
      {errors[path] && <span className={styles.field__error}>{errors[path]}</span>}
    </label>
  );
}

function FileField({ label, name, required, files, setFiles, errors }) {
  const selected = files[name]?.[0]?.name;

  return (
    <label className={`${styles.fileUpload} ${errors[name] ? styles['fileUpload--error'] : ''}`}>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf"
        onChange={(event) => setFiles((current) => ({ ...current, [name]: event.target.files }))}
      />
      <span className={styles.fileUpload__button}>Выбрать файл</span>
      <span className={styles.fileUpload__name}>
        {label}{required && <span className={styles.requiredMark}>*</span>}
        <small>{selected ? `Выбран: ${selected}` : 'PDF, JPG, JPEG или PNG в хорошем качестве'}</small>
      </span>
      {errors[name] && <span className={styles.field__error}>{errors[name]}</span>}
    </label>
  );
}

function Section({ title, children, wide = false }) {
  return (
    <section className={`${styles.formSection} ${wide ? styles['formSection--wide'] : ''}`}>
      <h3>{title}</h3>
      <div className={styles.formGrid}>{children}</div>
    </section>
  );
}

function AccountSelector({ payload, setPayload, errors }) {
  return (
    <div className={styles.verificationChoice}>
      <div className={styles.segmentGroup}>
        {Object.entries(accountTypeLabels).map(([value, label]) => (
          <label key={value} className={styles.segmentOption}>
            <input
              type="radio"
              name="accountType"
              checked={payload.accountType === value}
              onChange={() => setPayload((current) => ({ ...current, accountType: value }))}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <label className={`${styles.checkRow} ${styles.checkRowCard}`}>
        <input
          type="checkbox"
          checked={!payload.isResident}
          onChange={(event) => setPayload((current) => ({ ...current, isResident: !event.target.checked }))}
        />
        <span>Нерезидент РБ</span>
      </label>
      {(errors.accountType || errors.isResident) && (
        <span className={styles.field__error}>{errors.accountType || errors.isResident}</span>
      )}
    </div>
  );
}

function PersonFields({ payload, setPayload, errors, isEntrepreneur = false }) {
  return (
    <Section title={isEntrepreneur ? 'Основные сведения ИП' : 'Основные сведения'}>
      <Field label="Имя" path="personalData.firstName" payload={payload} setPayload={setPayload} errors={errors} required />
      <Field label="Фамилия" path="personalData.lastName" payload={payload} setPayload={setPayload} errors={errors} required />
      <Field label="Отчество" path="personalData.middleName" payload={payload} setPayload={setPayload} errors={errors} required />
      <Field label="Телефон" path="personalData.phone" payload={payload} setPayload={setPayload} errors={errors} required placeholder={phoneHint} />
      <Field label="Дополнительный телефон" path="personalData.additionalPhone" payload={payload} setPayload={setPayload} errors={errors} placeholder={phoneHint} />
      <Field label="Адрес электронной почты для направления уведомлений, документов" path="personalData.notificationEmail" payload={payload} setPayload={setPayload} errors={errors} required wide />
      {!payload.isResident && (
        <Field label="Страна" path="addressData.country" payload={payload} setPayload={setPayload} errors={errors} required />
      )}
      <Field
        label="Почтовый адрес (адрес проживания)"
        path="personalData.postalAddress"
        payload={payload}
        setPayload={setPayload}
        errors={errors}
        required
        as="textarea"
        placeholder={addressHint}
        wide
      />
    </Section>
  );
}

function OrganizationFields({ payload, setPayload, errors }) {
  const isResident = payload.isResident;

  return (
    <>
      <Section title="Основные сведения организации">
        <Field label="Краткое наименование организации" path="organizationData.shortName" payload={payload} setPayload={setPayload} errors={errors} required wide />
        <Field label="Полное наименование организации" path="organizationData.fullName" payload={payload} setPayload={setPayload} errors={errors} required as="textarea" wide />
        {isResident ? (
          <>
            <Field label="УНП" path="organizationData.unp" payload={payload} setPayload={setPayload} errors={errors} required />
            <Field label="Дата регистрации в ЕГР" path="organizationData.registrationDate" payload={payload} setPayload={setPayload} errors={errors} type="date" required />
          </>
        ) : (
          <Field label="ИНН/БИН" path="organizationData.taxId" payload={payload} setPayload={setPayload} errors={errors} required />
        )}
        <Field label="Адрес электронной почты для направления уведомлений, документов" path="personalData.notificationEmail" payload={payload} setPayload={setPayload} errors={errors} required wide />
      </Section>
      <Section title="Руководитель">
        <Field label="ФИО руководителя" path="organizationData.directorFullName" payload={payload} setPayload={setPayload} errors={errors} required />
        <Field label="Должность руководителя" path="organizationData.directorPosition" payload={payload} setPayload={setPayload} errors={errors} required />
        <SelectField
          label="Основание полномочий"
          path="organizationData.directorBasis"
          payload={payload}
          setPayload={setPayload}
          errors={errors}
          required
          options={Object.entries(directorBasisLabels)}
        />
      </Section>
      {!isResident && (
        <Section title="Главный бухгалтер">
          <Field label="ФИО главного бухгалтера" path="organizationData.chiefAccountantFullName" payload={payload} setPayload={setPayload} errors={errors} required />
          <Field label="Телефон главного бухгалтера" path="organizationData.chiefAccountantPhone" payload={payload} setPayload={setPayload} errors={errors} required placeholder={phoneHint} />
        </Section>
      )}
      <Section title="Адреса организации">
        {!isResident && <Field label="Страна" path="addressData.country" payload={payload} setPayload={setPayload} errors={errors} required />}
        <Field label="Юридический адрес" path="addressData.legalAddress" payload={payload} setPayload={setPayload} errors={errors} required as="textarea" placeholder={addressHint} wide />
        <Field label="Почтовый адрес при отличии от юридического" path="addressData.postalAddress" payload={payload} setPayload={setPayload} errors={errors} as="textarea" placeholder={addressHint} wide />
      </Section>
    </>
  );
}

function EntrepreneurRegistration({ payload, setPayload, errors }) {
  return (
    <Section title="Регистрационные данные ИП">
      {payload.isResident ? (
        <>
          <Field label="УНП" path="organizationData.unp" payload={payload} setPayload={setPayload} errors={errors} required />
          <Field label="Дата регистрации в ЕГР" path="organizationData.registrationDate" payload={payload} setPayload={setPayload} errors={errors} type="date" required />
        </>
      ) : (
        <Field label="ИНН/БИН" path="organizationData.taxId" payload={payload} setPayload={setPayload} errors={errors} required />
      )}
    </Section>
  );
}

function BankFields({ payload, setPayload, errors }) {
  return (
    <Section title="Банковские реквизиты">
      <Field label="Номер расчетного счета IBAN" path="bankData.iban" payload={payload} setPayload={setPayload} errors={errors} required placeholder="28 знаков" />
      <Field label="Название банка" path="bankData.bankName" payload={payload} setPayload={setPayload} errors={errors} required />
      <Field label="УНП банка" path="bankData.bankUnp" payload={payload} setPayload={setPayload} errors={errors} required />
      <Field label="Код банка (BIC)" path="bankData.bankBic" payload={payload} setPayload={setPayload} errors={errors} required />
      {!payload.isResident && (
        <>
          <div className={styles.bankDivider}>Транзитный банк</div>
          <Field label="Номер транзитного счета" path="bankData.transitIban" payload={payload} setPayload={setPayload} errors={errors} required />
          <Field label="Название транзитного банка" path="bankData.transitBankName" payload={payload} setPayload={setPayload} errors={errors} required />
          <Field label="Код транзитного банка (BIC)" path="bankData.transitBankBic" payload={payload} setPayload={setPayload} errors={errors} required />
        </>
      )}
    </Section>
  );
}

function DocumentFields({ payload, files, setFiles, errors }) {
  const fields = useMemo(() => {
    if (payload.accountType === 'legal_entity') {
      return [
        [payload.isResident ? 'charter' : 'taxCertificate', payload.isResident ? 'Копия устава в полном объеме' : 'Свидетельство о постановке на учет в налоговой', true],
        ['stateRegistrationCertificate', 'Свидетельство о государственной регистрации', true],
        ['directorAppointmentOrder', 'Документ о назначении руководителя', true]
      ];
    }

    const personFields = personDocumentFields(payload.isResident);
    return payload.accountType === 'entrepreneur'
      ? [...personFields, ['registrationCertificate', 'Свидетельство о регистрации ИП', true]]
      : personFields;
  }, [payload.accountType, payload.isResident]);

  return (
    <Section title="Фотографии документов" wide>
      {fields.map(([name, label, required]) => (
        <FileField key={name} name={name} label={label} required={required} files={files} setFiles={setFiles} errors={errors} />
      ))}
    </Section>
  );
}

function VerificationForm({ onSubmitted, onCancel }) {
  const dispatch = useDispatch();
  const { accessToken } = useSelector((state) => state.auth);
  const verification = useSelector((state) => state.verification);
  const [payload, setPayload] = useState(initialPayload);
  const [files, setFiles] = useState({});

  const errors = verification.errors || {};
  const isLegal = payload.accountType === 'legal_entity';
  const isEntrepreneur = payload.accountType === 'entrepreneur';

  const submitForm = (event) => {
    event.preventDefault();
    dispatch(submitVerification({ payload, files, token: accessToken })).then((result) => {
      if (!result.error) {
        dispatch(updateCurrentUser(result.payload.user));
        onSubmitted?.();
      }
    });
  };

  return (
    <form className={styles.verification} onSubmit={submitForm}>
      <div className={styles.panel__head}>
        <div>
          <h2>Заявка на верификацию</h2>
        </div>
      </div>

      <AccountSelector payload={payload} setPayload={setPayload} errors={errors} />

      {isLegal ? (
        <OrganizationFields payload={payload} setPayload={setPayload} errors={errors} />
      ) : (
        <>
          <PersonFields payload={payload} setPayload={setPayload} errors={errors} isEntrepreneur={isEntrepreneur} />
          {isEntrepreneur && <EntrepreneurRegistration payload={payload} setPayload={setPayload} errors={errors} />}
        </>
      )}

      <DocumentFields payload={payload} files={files} setFiles={setFiles} errors={errors} />
      <BankFields payload={payload} setPayload={setPayload} errors={errors} />

      <section className={`${styles.formSection} ${styles['formSection--wide']}`}>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={payload.agreements.personalDataConsent}
            onChange={(event) =>
              setPayload((current) => setNestedValue(current, 'agreements.personalDataConsent', event.target.checked))
            }
          />
          <span>{agreementText}</span>
        </label>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={payload.agreements.accuracyConfirmed}
            onChange={(event) =>
              setPayload((current) => setNestedValue(current, 'agreements.accuracyConfirmed', event.target.checked))
            }
          />
          <span>Подтверждаю, что введенные данные верны и проверены мной.</span>
        </label>
        {errors['agreements.personalDataConsent'] && <p className={styles.message__error}>{errors['agreements.personalDataConsent']}</p>}
      </section>

      {verification.message && verification.status === 'failed' && <p className={styles.message__error}>{verification.message}</p>}

      <div className={styles.formActions}>
        {onCancel && (
          <button className={styles.buttonSecondary} type="button" onClick={onCancel}>
            Отмена
          </button>
        )}
        <button className={styles.button} type="submit" disabled={verification.status === 'loading'}>
          Отправить заявку на проверку
        </button>
      </div>
    </form>
  );
}

export default VerificationForm;
