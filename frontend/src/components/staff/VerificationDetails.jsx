import React from 'react';
import styles from '../../App.module.css';
import {
  accountTypeLabels,
  directorBasisLabels,
  documentTypeLabels,
  verificationStatusLabels
} from '../../constants/verificationLabels.js';

const fieldLabels = {
  email: 'Email',
  role: 'Роль',
  verificationStatus: 'Статус верификации',
  accountType: 'Тип участника',
  isResident: 'Резидентство',
  firstName: 'Имя',
  lastName: 'Фамилия',
  middleName: 'Отчество',
  fullName: 'ФИО',
  phone: 'Телефон',
  additionalPhone: 'Дополнительный телефон',
  shortName: 'Краткое наименование',
  unp: 'УНП',
  contactPhone: 'Контактный телефон',
  registrationDate: 'Дата регистрации',
  directorFullName: 'ФИО руководителя',
  directorPosition: 'Должность руководителя',
  directorBasis: 'Основание полномочий',
  directorPhone: 'Телефон руководителя',
  powerOfAttorney: 'Доверенность',
  chiefAccountantFullName: 'ФИО главного бухгалтера',
  chiefAccountantPhone: 'Телефон главного бухгалтера',
  documentType: 'Вид документа',
  documentNumber: 'Номер документа',
  personalNumber: 'Личный номер',
  issuedBy: 'Кем выдан',
  issuedAt: 'Когда выдан',
  expiresAt: 'Срок действия',
  region: 'Область',
  district: 'Район',
  locality: 'Населенный пункт',
  postalCode: 'Индекс',
  street: 'Улица',
  house: 'Номер дома',
  building: 'Корпус',
  apartment: 'Квартира',
  residentialAddress: 'Адрес проживания',
  postalAddress: 'Почтовый адрес',
  registrationAddress: 'Адрес регистрации',
  legalAddress: 'Юридический адрес',
  sameAsRegistration: 'Совпадает с адресом регистрации',
  sameAsLegalAddress: 'Совпадает с юридическим адресом',
  bankName: 'Название банка',
  bankUnp: 'УНП банка',
  bankBic: 'Код банка (BIC)',
  iban: 'Номер карт-счета банка IBAN',
  bankAddress: 'Адрес банка',
  transitBankName: 'Название транзитного банка',
  transitBankBic: 'Код транзитного банка (BIC)',
  transitIban: 'Номер транзитного счета'
};

const documentLabels = {
  registrationCertificate: 'Свидетельство о регистрации',
  residenceRegistration: 'Прописка / временная регистрация',
  identityFront: 'Лицевая сторона ID-карты / страницы 32-33 паспорта',
  identityBack: 'Обратная сторона ID-карты / страница 31 паспорта',
  identityExtra: 'Дополнительный документ',
  identityExtraTwo: 'Дополнительный документ 2',
  personalNumberPage: 'Страница документа с личным номером',
  taxCertificate: 'Свидетельство о постановке на учет в налоговой',
  charter: 'Устав',
  appointmentOrder: 'Приказ о назначении руководителя',
  appointmentOrderExtra: 'Дополнительный документ о назначении',
  powerOfAttorney: 'Доверенность',
  organizationCertificate: 'Свидетельство о регистрации организации'
};

const formatValue = (key, value) => {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  if (typeof value === 'boolean') {
    return value ? 'Да' : 'Нет';
  }

  if (key === 'documentType') {
    return documentTypeLabels[value] || value;
  }

  if (key === 'directorBasis') {
    return directorBasisLabels[value] || value;
  }

  if (key === 'accountType') {
    return accountTypeLabels[value] || value;
  }

  if (key === 'verificationStatus') {
    return verificationStatusLabels[value] || value;
  }

  return value;
};

const toPairs = (data = {}) =>
  Object.entries(data)
    .map(([key, value]) => [fieldLabels[key] || key, formatValue(key, value)])
    .filter(([, value]) => value !== '');

function DetailSection({ title, data }) {
  const pairs = toPairs(data);

  if (pairs.length === 0) {
    return null;
  }

  return (
    <section className={styles.detailSection}>
      <h3 className={styles.detailSection__title}>{title}</h3>
      <dl className={styles.detailList}>
        {pairs.map(([label, value]) => (
          <div className={styles.detailItem} key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DocumentPreview({ document }) {
  const fileUrl = document.url || '';
  const isImage = document.mimeType?.startsWith('image/');
  const title = documentLabels[document.fieldName] || document.fieldName || document.originalName;

  return (
    <article className={styles.documentCard}>
      <strong>{title}</strong>
      <span>{document.originalName}</span>
      {isImage && fileUrl && <img className={styles.documentPreview} src={fileUrl} alt={title} />}
      {fileUrl && (
        <a className={styles.documentLink} href={fileUrl} target="_blank" rel="noreferrer">
          Открыть файл
        </a>
      )}
    </article>
  );
}

function VerificationDetails({ verification }) {
  if (!verification) {
    return <p className={styles.panel__text}>Нет данных заявки.</p>;
  }

  const userData = {
    email: verification.user?.email,
    role: verification.user?.role,
    verificationStatus: verification.user?.verificationStatus,
    accountType: verification.accountType,
    isResident: verification.isResident ? 'Резидент РБ' : 'Нерезидент РБ'
  };

  return (
    <div className={styles.detailGrid}>
      <DetailSection title="Пользователь" data={userData} />
      <DetailSection title="Основные сведения" data={verification.personalData} />
      <DetailSection title="Организация" data={verification.organizationData} />
      <DetailSection title="Документ, удостоверяющий личность" data={verification.documentData} />
      <DetailSection title="Адрес" data={verification.addressData} />
      <DetailSection title="Банковские реквизиты" data={verification.bankData} />

      {verification.documents?.length > 0 && (
        <section className={styles.detailSection}>
          <h3 className={styles.detailSection__title}>Копии документов</h3>
          <div className={styles.documentGrid}>
            {verification.documents.map((document) => (
              <DocumentPreview key={`${document.fieldName}-${document.originalName}`} document={document} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default VerificationDetails;
