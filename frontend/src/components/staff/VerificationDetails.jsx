import React from 'react';
import styles from '../../App.module.css';
import { accountTypeLabels, directorBasisLabels } from '../../constants/verificationLabels.js';

const addressHint = 'Например: г. Минск, ул. Октябрьская, д. 10, кв. 1118';

const documentLabels = {
  registrationCertificate: 'Свидетельство о регистрации ИП',
  stateRegistrationCertificate: 'Свидетельство о государственной регистрации',
  documentRegistration: 'Прописка: временная регистрация или 25 страница паспорта',
  documentMain: 'Лицевая сторона ID-карты или страницы 32-33 паспорта на одном фото',
  documentBack: 'Обратная сторона ID-карты или 31 страница паспорта',
  documentExtra: 'Селфи с разворотом 32-33 страниц паспорта или лицевой стороной ID-карты',
  documentPersonalNumberPage: 'Копия страницы документа с личным номером',
  taxCertificate: 'Свидетельство о постановке на учет в налоговой',
  charter: 'Копия устава в полном объеме',
  directorAppointmentOrder: 'Документ о назначении руководителя'
};

const getValue = (source, path) => path.split('.').reduce((result, key) => result?.[key], source) || '';

function ReadField({ label, value, wide = false, as = 'input', hint = '' }) {
  const Control = as;

  return (
    <label className={`${styles.field} ${wide ? styles.fieldFull : ''}`}>
      <span className={styles.field__label}>{label}</span>
      <Control
        className={`${styles.field__control} ${styles['field__control--readonly']}`}
        value={value || 'Не указано'}
        disabled
        rows={as === 'textarea' ? 3 : undefined}
      />
      {hint && <span className={styles.field__hint}>{hint}</span>}
    </label>
  );
}

function ReadSection({ title, children }) {
  return (
    <section className={styles.auctionBlock}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.formGrid}>{children}</div>
    </section>
  );
}

function AccountSelectorPreview({ verification }) {
  return (
    <div className={styles.verificationChoice}>
      <div className={styles.segmentGroup}>
        {Object.entries(accountTypeLabels).map(([value, label]) => (
          <label key={value} className={styles.segmentOption}>
            <input type="radio" checked={verification.accountType === value} disabled readOnly />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <label className={`${styles.checkRow} ${styles.checkRowCard}`}>
        <input type="checkbox" checked={!verification.isResident} disabled readOnly />
        <span>Нерезидент РБ</span>
      </label>
    </div>
  );
}

function PersonPreview({ verification }) {
  const data = verification.personalData || {};
  const address = verification.addressData || {};
  const isEntrepreneur = verification.accountType === 'entrepreneur';

  return (
    <ReadSection title={isEntrepreneur ? 'Основные сведения ИП' : 'Основные сведения'}>
      <ReadField label="Имя" value={data.firstName} />
      <ReadField label="Фамилия" value={data.lastName} />
      <ReadField label="Отчество" value={data.middleName} />
      <ReadField label="Телефон" value={data.phone} />
      <ReadField label="Дополнительный телефон" value={data.additionalPhone} />
      <ReadField label="Адрес электронной почты для направления уведомлений, документов" value={data.notificationEmail} wide />
      {!verification.isResident && <ReadField label="Страна" value={address.country} />}
      <ReadField label="Почтовый адрес (адрес проживания)" value={data.postalAddress} as="textarea" wide hint={addressHint} />
    </ReadSection>
  );
}

function EntrepreneurPreview({ verification }) {
  const data = verification.organizationData || {};

  return (
    <ReadSection title="Регистрационные данные ИП">
      <ReadField label={verification.isResident ? 'УНП' : 'ИНН/БИН'} value={verification.isResident ? data.unp : data.taxId} />
      {verification.isResident && <ReadField label="Дата регистрации в ЕГР" value={data.registrationDate} />}
    </ReadSection>
  );
}

function OrganizationPreview({ verification }) {
  const data = verification.organizationData || {};
  const address = verification.addressData || {};

  return (
    <>
      <ReadSection title="Основные сведения организации">
        <ReadField label="Краткое наименование организации" value={data.shortName} wide />
        <ReadField label="Полное наименование организации" value={data.fullName} as="textarea" wide />
        <ReadField label={verification.isResident ? 'УНП' : 'ИНН/БИН'} value={verification.isResident ? data.unp : data.taxId} />
        {verification.isResident && <ReadField label="Дата регистрации в ЕГР" value={data.registrationDate} />}
        <ReadField label="Адрес электронной почты для направления уведомлений, документов" value={getValue(verification, 'personalData.notificationEmail')} wide />
      </ReadSection>
      <ReadSection title="Руководитель">
        <ReadField label="ФИО руководителя" value={data.directorFullName} />
        <ReadField label="Должность руководителя" value={data.directorPosition} />
        <ReadField label="Основание полномочий" value={directorBasisLabels[data.directorBasis] || data.directorBasis} />
      </ReadSection>
      {!verification.isResident && (
        <ReadSection title="Главный бухгалтер">
          <ReadField label="ФИО главного бухгалтера" value={data.chiefAccountantFullName} />
          <ReadField label="Телефон главного бухгалтера" value={data.chiefAccountantPhone} />
        </ReadSection>
      )}
      <ReadSection title="Адреса организации">
        {!verification.isResident && <ReadField label="Страна" value={address.country} />}
        <ReadField label="Юридический адрес" value={address.legalAddress} as="textarea" wide hint={addressHint} />
        <ReadField label="Почтовый адрес при отличии от юридического" value={address.postalAddress} as="textarea" wide hint={addressHint} />
      </ReadSection>
    </>
  );
}

function BankPreview({ verification }) {
  const data = verification.bankData || {};

  return (
    <ReadSection title="Банковские реквизиты">
      <ReadField label="Номер расчетного счета IBAN" value={data.iban} />
      <ReadField label="Название банка" value={data.bankName} />
      <ReadField label="УНП банка" value={data.bankUnp} />
      <ReadField label="Код банка (BIC)" value={data.bankBic} />
      {!verification.isResident && (
        <>
          <div className={styles.bankDivider}>Транзитный банк</div>
          <ReadField label="Номер транзитного счета" value={data.transitIban} />
          <ReadField label="Название транзитного банка" value={data.transitBankName} />
          <ReadField label="Код транзитного банка (BIC)" value={data.transitBankBic} />
        </>
      )}
    </ReadSection>
  );
}

function DocumentsPreview({ documents = [] }) {
  const visibleDocuments = documents.filter((document) => !['documentExtraSecond', 'directorAppointmentReserve'].includes(document.fieldName));

  if (visibleDocuments.length === 0) {
    return null;
  }

  return (
    <section className={styles.auctionBlock}>
      <h2 className={styles.sectionTitle}>Фотографии документов</h2>
      <div className={styles.documentGrid}>
        {visibleDocuments.map((document) => {
          const title = documentLabels[document.fieldName] || document.fieldName;
          const isImage = document.mimeType?.startsWith('image/');

          return (
            <a className={styles.documentCard} href={document.url} target="_blank" rel="noreferrer" key={`${document.fieldName}-${document.path}`}>
              <strong>{title}</strong>
              {isImage ? (
                <img className={styles.documentPreview} src={document.url} alt={title} />
              ) : (
                <span className={styles.documentPlaceholder}>PDF-документ</span>
              )}
            </a>
          );
        })}
      </div>
    </section>
  );
}

function VerificationDetails({ verification }) {
  if (!verification) {
    return <p className={styles.panel__text}>Нет данных заявки.</p>;
  }

  const isLegal = verification.accountType === 'legal_entity';
  const isEntrepreneur = verification.accountType === 'entrepreneur';

  return (
    <div className={`${styles.auctionForm} ${styles.readonlyForm}`}>
      <AccountSelectorPreview verification={verification} />
      {isLegal ? (
        <OrganizationPreview verification={verification} />
      ) : (
        <>
          <PersonPreview verification={verification} />
          {isEntrepreneur && <EntrepreneurPreview verification={verification} />}
        </>
      )}
      <DocumentsPreview documents={verification.documents} />
      <BankPreview verification={verification} />
    </div>
  );
}

export default VerificationDetails;
