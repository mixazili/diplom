import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateCurrentUser } from '../../features/auth/authSlice.js';
import { submitVerification } from '../../features/verification/verificationSlice.js';
import {
  accountTypeLabels,
  directorBasisLabels,
  documentTypeLabels
} from '../../constants/verificationLabels.js';
import styles from '../../App.module.css';

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
  const selectedFileName = files[name]?.[0]?.name;

  return (
    <label className={styles.field}>
      <span className={styles.field__label}>{label}{required ? '*' : ''}</span>
      <span className={`${styles.fileUpload} ${errors[name] ? styles['fileUpload--error'] : ''}`}>
        <span className={styles.fileUpload__button}>Р’С‹Р±СЂР°С‚СЊ С„Р°Р№Р»</span>
        <span className={styles.fileUpload__name}>{selectedFileName || 'Р¤Р°Р№Р» РЅРµ РІС‹Р±СЂР°РЅ'}</span>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={(event) => onFileChange(name, event.target.files)}
        />
      </span>
      <span className={styles.field__hint}>jpg, jpeg, png РёР»Рё pdf</span>
      {errors[name] && <span className={styles.field__error}>{errors[name]}</span>}
    </label>
  );
}

function PersonFields({ form, changeNested, errors, isEntrepreneur }) {
  if (isEntrepreneur) {
    return (
      <div className={styles.formGrid}>
        <Field label="Р¤РРћ" section="personalData" name="fullName" form={form} onChange={changeNested} errors={errors} required />
        <Field label="РљРѕРЅС‚Р°РєС‚РЅС‹Р№ С‚РµР»РµС„РѕРЅ" section="personalData" name="phone" form={form} onChange={changeNested} errors={errors} required />
        <Field label="Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Р№ С‚РµР»РµС„РѕРЅ" section="personalData" name="additionalPhone" form={form} onChange={changeNested} errors={errors} />
      </div>
    );
  }

  return (
    <div className={styles.formGrid}>
      <Field label="РРјСЏ" section="personalData" name="firstName" form={form} onChange={changeNested} errors={errors} required />
      <Field label="Р¤Р°РјРёР»РёСЏ" section="personalData" name="lastName" form={form} onChange={changeNested} errors={errors} required />
      <Field label="РћС‚С‡РµСЃС‚РІРѕ" section="personalData" name="middleName" form={form} onChange={changeNested} errors={errors} required={form.isResident} />
      <Field label="РњРѕР±РёР»СЊРЅС‹Р№ С‚РµР»РµС„РѕРЅ" section="personalData" name="phone" form={form} onChange={changeNested} errors={errors} required />
      <Field label="Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Р№ С‚РµР»РµС„РѕРЅ" section="personalData" name="additionalPhone" form={form} onChange={changeNested} errors={errors} />
    </div>
  );
}

function AddressBlock({ form, changeNested, errors, isLegalEntity }) {
  if (!form.isResident) {
    return (
      <div className={styles.formGrid}>
        <Field
          label={isLegalEntity ? 'РђРґСЂРµСЃ СЂРµРіРёСЃС‚СЂР°С†РёРё' : 'РђРґСЂРµСЃ РїСЂРѕР¶РёРІР°РЅРёСЏ'}
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
            <Field label="РљРѕРЅС‚Р°РєС‚РЅС‹Р№ С‚РµР»РµС„РѕРЅ" section="addressData" name="phone" form={form} onChange={changeNested} errors={errors} required />
            <Field label="Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Р№ С‚РµР»РµС„РѕРЅ" section="addressData" name="additionalPhone" form={form} onChange={changeNested} errors={errors} />
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={styles.formGrid}>
        <Field label="РћР±Р»Р°СЃС‚СЊ" section="addressData" name="region" form={form} onChange={changeNested} errors={errors} required={isLegalEntity} />
        <Field label="Р Р°Р№РѕРЅ" section="addressData" name="district" form={form} onChange={changeNested} errors={errors} required={!isLegalEntity} />
        <Field label="РќР°СЃРµР»С‘РЅРЅС‹Р№ РїСѓРЅРєС‚" section="addressData" name="locality" form={form} onChange={changeNested} errors={errors} required />
        <Field label="РџРѕС‡С‚РѕРІС‹Р№ РёРЅРґРµРєСЃ" section="addressData" name="postalCode" form={form} onChange={changeNested} errors={errors} required />
        <Field label="РЈР»РёС†Р° / Р°РґСЂРµСЃ" section="addressData" name="street" form={form} onChange={changeNested} errors={errors} required />
        <Field label="РќРѕРјРµСЂ РґРѕРјР°" section="addressData" name="house" form={form} onChange={changeNested} errors={errors} required={!isLegalEntity} />
        <Field label="РљРѕСЂРїСѓСЃ" section="addressData" name="building" form={form} onChange={changeNested} errors={errors} />
        <Field label="РљРІР°СЂС‚РёСЂР°" section="addressData" name="apartment" form={form} onChange={changeNested} errors={errors} />
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
          ? 'РџРѕС‡С‚РѕРІС‹Р№ Р°РґСЂРµСЃ СЃРѕРІРїР°РґР°РµС‚ СЃ СЋСЂРёРґРёС‡РµСЃРєРёРј Р°РґСЂРµСЃРѕРј'
          : 'РђРґСЂРµСЃ РїСЂРѕР¶РёРІР°РЅРёСЏ СЃРѕРІРїР°РґР°РµС‚ СЃ Р°РґСЂРµСЃРѕРј СЂРµРіРёСЃС‚СЂР°С†РёРё'}
      </label>
      {isLegalEntity && !form.addressData.sameAsLegalAddress && (
        <Field label="РџРѕС‡С‚РѕРІС‹Р№ Р°РґСЂРµСЃ" section="addressData" name="postalAddress" form={form} onChange={changeNested} errors={errors} required as="textarea" />
      )}
      {!isLegalEntity && !form.addressData.sameAsRegistration && (
        <Field label="РђРґСЂРµСЃ РїСЂРѕР¶РёРІР°РЅРёСЏ" section="addressData" name="residentialAddress" form={form} onChange={changeNested} errors={errors} required as="textarea" />
      )}
    </>
  );
}

function IdentityBlock({ form, changeNested, errors }) {
  return (
    <>
      <h2 className={styles.sectionTitle}>Р”РѕРєСѓРјРµРЅС‚, СѓРґРѕСЃС‚РѕРІРµСЂСЏСЋС‰РёР№ Р»РёС‡РЅРѕСЃС‚СЊ</h2>
      <div className={styles.formGrid}>
        <SelectField label="Р’РёРґ РґРѕРєСѓРјРµРЅС‚Р°" section="documentData" name="documentType" form={form} onChange={changeNested} errors={errors} options={documentTypeLabels} required />
        <Field label="РЎРµСЂРёСЏ Рё РЅРѕРјРµСЂ РґРѕРєСѓРјРµРЅС‚Р°" section="documentData" name="documentNumber" form={form} onChange={changeNested} errors={errors} required />
        {!form.isResident && (
          <Field label="Р›РёС‡РЅС‹Р№ РЅРѕРјРµСЂ" section="documentData" name="personalNumber" form={form} onChange={changeNested} errors={errors} required />
        )}
        {form.documentData.documentType !== 'id_card' && (
          <Field label="РљРµРј РІС‹РґР°РЅ" section="documentData" name="issuedBy" form={form} onChange={changeNested} errors={errors} required />
        )}
        <Field label="РљРѕРіРґР° РІС‹РґР°РЅ" section="documentData" name="issuedAt" type="date" form={form} onChange={changeNested} errors={errors} required />
        {form.isResident && (
          <Field label="РЎСЂРѕРє РґРµР№СЃС‚РІРёСЏ" section="documentData" name="expiresAt" type="date" form={form} onChange={changeNested} errors={errors} required />
        )}
      </div>
    </>
  );
}

function BankFields({ form, changeNested, errors }) {
  return (
    <div className={styles.formGrid}>
      <Field label="РќР°Р·РІР°РЅРёРµ Р±Р°РЅРєР°" section="bankData" name="bankName" form={form} onChange={changeNested} errors={errors} required />
      <Field label="РЈРќРџ Р±Р°РЅРєР°" section="bankData" name="bankUnp" form={form} onChange={changeNested} errors={errors} required />
      <Field label="РљРѕРґ Р±Р°РЅРєР° (BIC)" section="bankData" name="bankBic" form={form} onChange={changeNested} errors={errors} required />
      <Field label="РќРѕРјРµСЂ РєР°СЂС‚-СЃС‡С‘С‚Р° Р±Р°РЅРєР° IBAN" section="bankData" name="iban" form={form} onChange={changeNested} errors={errors} required />
      <Field label="РђРґСЂРµСЃ Р±Р°РЅРєР°" section="bankData" name="bankAddress" form={form} onChange={changeNested} errors={errors} required />
      {!form.isResident && (
        <>
          <Field label="РќР°Р·РІР°РЅРёРµ С‚СЂР°РЅР·РёС‚РЅРѕРіРѕ Р±Р°РЅРєР°" section="bankData" name="transitBankName" form={form} onChange={changeNested} errors={errors} required />
          <Field label="РљРѕРґ С‚СЂР°РЅР·РёС‚РЅРѕРіРѕ Р±Р°РЅРєР° (BIC)" section="bankData" name="transitBankBic" form={form} onChange={changeNested} errors={errors} required />
          <Field label="РќРѕРјРµСЂ С‚СЂР°РЅР·РёС‚РЅРѕРіРѕ СЃС‡С‘С‚Р°" section="bankData" name="transitIban" form={form} onChange={changeNested} errors={errors} required />
        </>
      )}
    </div>
  );
}

function PersonFiles({ form, files, changeFile, errors }) {
  if (form.isResident) {
    return (
      <div className={styles.formGrid}>
        <FileField label="РџСЂРѕРїРёСЃРєР°: РІСЂРµРјРµРЅРЅР°СЏ СЂРµРіРёСЃС‚СЂР°С†РёСЏ РёР»Рё 25 СЃС‚СЂР°РЅРёС†Р° РїР°СЃРїРѕСЂС‚Р°" name="documentRegistration" files={files} onFileChange={changeFile} errors={errors} required />
        <FileField label="Р›РёС†РµРІР°СЏ СЃС‚РѕСЂРѕРЅР° ID-РєР°СЂС‚С‹ РёР»Рё СЃС‚СЂР°РЅРёС†С‹ 32-33 РїР°СЃРїРѕСЂС‚Р° РЅР° РѕРґРЅРѕРј С„РѕС‚Рѕ" name="documentMain" files={files} onFileChange={changeFile} errors={errors} required />
        <FileField label="РћР±СЂР°С‚РЅР°СЏ СЃС‚РѕСЂРѕРЅР° ID-РєР°СЂС‚С‹ РёР»Рё 31 СЃС‚СЂР°РЅРёС†Р° РїР°СЃРїРѕСЂС‚Р°" name="documentBack" files={files} onFileChange={changeFile} errors={errors} />
        <FileField label="Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Р№ РґРѕРєСѓРјРµРЅС‚" name="documentExtra" files={files} onFileChange={changeFile} errors={errors} />
      </div>
    );
  }

  return (
    <div className={styles.formGrid}>
      <FileField label="РЎС‚СЂР°РЅРёС†С‹ 32-33 РїР°СЃРїРѕСЂС‚Р° РЅР° РѕРґРЅРѕРј С„РѕС‚Рѕ / Р»РёС†РµРІР°СЏ СЃС‚РѕСЂРѕРЅР° ID-РєР°СЂС‚С‹" name="documentMain" files={files} onFileChange={changeFile} errors={errors} required />
      <FileField label="РљРѕРїРёСЏ СЃС‚СЂР°РЅРёС†С‹ РґРѕРєСѓРјРµРЅС‚Р° СЃ Р»РёС‡РЅС‹Рј РЅРѕРјРµСЂРѕРј" name="documentPersonalNumberPage" files={files} onFileChange={changeFile} errors={errors} required />
      <FileField label="Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Р№ РґРѕРєСѓРјРµРЅС‚ 1" name="documentExtra" files={files} onFileChange={changeFile} errors={errors} />
      <FileField label="Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Р№ РґРѕРєСѓРјРµРЅС‚ 2" name="documentExtraSecond" files={files} onFileChange={changeFile} errors={errors} />
    </div>
  );
}

function OrganizationFields({ form, changeNested, errors, isLegalEntity }) {
  return (
    <>
      <h2 className={styles.sectionTitle}>РћСЃРЅРѕРІРЅС‹Рµ СЃРІРµРґРµРЅРёСЏ</h2>
      <div className={styles.formGrid}>
        {isLegalEntity ? (
          <>
            <Field label="РџРѕР»РЅРѕРµ РЅР°РёРјРµРЅРѕРІР°РЅРёРµ РѕСЂРіР°РЅРёР·Р°С†РёРё" section="organizationData" name="fullName" form={form} onChange={changeNested} errors={errors} required />
            <Field label="РљСЂР°С‚РєРѕРµ РЅР°РёРјРµРЅРѕРІР°РЅРёРµ РѕСЂРіР°РЅРёР·Р°С†РёРё" section="organizationData" name="shortName" form={form} onChange={changeNested} errors={errors} required />
          </>
        ) : (
          <Field label="Р¤РРћ" section="personalData" name="fullName" form={form} onChange={changeNested} errors={errors} required />
        )}
        <Field label="РЈРќРџ" section="organizationData" name="unp" form={form} onChange={changeNested} errors={errors} required />
        <Field label="Р”Р°С‚Р° СЂРµРіРёСЃС‚СЂР°С†РёРё РІ Р•Р“Р " section="organizationData" name="registrationDate" type="date" form={form} onChange={changeNested} errors={errors} required />
        <Field label="РљРѕРЅС‚Р°РєС‚РЅС‹Р№ С‚РµР»РµС„РѕРЅ" section="organizationData" name="contactPhone" form={form} onChange={changeNested} errors={errors} required />
      </div>
    </>
  );
}

function LegalManagementFields({ form, changeNested, errors }) {
  return (
    <>
      <h2 className={styles.sectionTitle}>Р СѓРєРѕРІРѕРґРёС‚РµР»СЊ</h2>
      <div className={styles.formGrid}>
        <Field label="Р¤РРћ СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ" section="organizationData" name="directorFullName" form={form} onChange={changeNested} errors={errors} required />
        <Field label="Р”РѕР»Р¶РЅРѕСЃС‚СЊ СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ" section="organizationData" name="directorPosition" form={form} onChange={changeNested} errors={errors} required />
        <SelectField
          label="РўРёРї РґРѕРєСѓРјРµРЅС‚Р° Рѕ РЅР°Р·РЅР°С‡РµРЅРёРё"
          section="organizationData"
          name="directorBasis"
          form={form}
          onChange={changeNested}
          errors={errors}
          options={directorBasisLabels}
          required
        />
        <Field label="РўРµР»РµС„РѕРЅ СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ" section="organizationData" name="directorPhone" form={form} onChange={changeNested} errors={errors} required />
        <Field label="РќРѕРјРµСЂ Рё РґР°С‚Р° РґРѕРІРµСЂРµРЅРЅРѕСЃС‚Рё" section="organizationData" name="powerOfAttorney" form={form} onChange={changeNested} errors={errors} />
      </div>
      <h2 className={styles.sectionTitle}>Р“Р»Р°РІРЅС‹Р№ Р±СѓС…РіР°Р»С‚РµСЂ</h2>
      <div className={styles.formGrid}>
        <Field label="Р¤РРћ РіР»Р°РІРЅРѕРіРѕ Р±СѓС…РіР°Р»С‚РµСЂР°" section="organizationData" name="chiefAccountantFullName" form={form} onChange={changeNested} errors={errors} />
        <Field label="РўРµР»РµС„РѕРЅ РіР»Р°РІРЅРѕРіРѕ Р±СѓС…РіР°Р»С‚РµСЂР°" section="organizationData" name="chiefAccountantPhone" form={form} onChange={changeNested} errors={errors} />
      </div>
    </>
  );
}

function OrganizationFiles({ isLegalEntity, files, changeFile, errors }) {
  return (
    <div className={styles.formGrid}>
      <FileField label={isLegalEntity ? 'РљРѕРїРёСЏ СѓСЃС‚Р°РІР° РІ РїРѕР»РЅРѕРј РѕР±СЉС‘РјРµ (pdf, zip)' : 'РЎРІРёРґРµС‚РµР»СЊСЃС‚РІРѕ Рѕ СЂРµРіРёСЃС‚СЂР°С†РёРё'} name="registrationCertificate" files={files} onFileChange={changeFile} errors={errors} required />
      {isLegalEntity && (
        <>
          <FileField label="РЎРІРёРґРµС‚РµР»СЊСЃС‚РІРѕ Рѕ СЂРµРіРёСЃС‚СЂР°С†РёРё" name="stateRegistrationCertificate" files={files} onFileChange={changeFile} errors={errors} required />
          <FileField label="Р”РѕРєСѓРјРµРЅС‚ Рѕ РЅР°Р·РЅР°С‡РµРЅРёРё СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ" name="directorAppointmentOrder" files={files} onFileChange={changeFile} errors={errors} required />
          <FileField label="Р РµР·РµСЂРІРЅС‹Р№ РґРѕРєСѓРјРµРЅС‚ Рѕ РЅР°Р·РЅР°С‡РµРЅРёРё СЂСѓРєРѕРІРѕРґРёС‚РµР»СЏ" name="directorAppointmentReserve" files={files} onFileChange={changeFile} errors={errors} />
        </>
      )}
    </div>
  );
}

function AgreementsBlock({ form, changeNested, errors }) {
  return (
    <section className={styles.agreements}>
      <p className={styles.agreements__lead}>
        <strong>РЈРІР°Р¶Р°РµРјС‹Р№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ!</strong> Р’ СЃРѕРѕС‚РІРµС‚СЃС‚РІРёРё СЃ Р—Р°РєРѕРЅРѕРј Р РµСЃРїСѓР±Р»РёРєРё Р‘РµР»Р°СЂСѓСЃСЊ В«Рћ Р·Р°С‰РёС‚Рµ РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹С…
        РґР°РЅРЅС‹С…В» РґР»СЏ РїСЂРѕРґРѕР»Р¶РµРЅРёСЏ СЂР°Р±РѕС‚С‹ РЅР° РёРЅС‚РµСЂРЅРµС‚-СЃР°Р№С‚Рµ Auction.by РїСЂРѕСЃРёРј РѕР·РЅР°РєРѕРјРёС‚СЊСЃСЏ СЃ РџРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРёРј СЃРѕРіР»Р°С€РµРЅРёРµРј
        Рё РІС‹СЂР°Р·РёС‚СЊ СЃРѕРіР»Р°СЃРёРµ РЅР° РѕР±СЂР°Р±РѕС‚РєСѓ РёРЅС„РѕСЂРјР°С†РёРё Рѕ РїРѕР»СЊР·РѕРІР°С‚РµР»Рµ, РІ С‚РѕРј С‡РёСЃР»Рµ РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹С… РґР°РЅРЅС‹С….
      </p>
      <label className={styles.agreements__item}>
        <input
          type="checkbox"
          checked={form.agreements.personalDataConsent}
          onChange={(event) => changeNested('agreements', 'personalDataConsent', event.target.checked)}
        />
        <span>
          РћР·РЅР°РєРѕРјР»РµРЅ СЃ РџРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРёРј СЃРѕРіР»Р°С€РµРЅРёРµРј Рё СЃРѕРіР»Р°СЃРµРЅ СЃ РѕР±СЂР°Р±РѕС‚РєРѕР№ РёРЅС„РѕСЂРјР°С†РёРё Рѕ РїРѕР»СЊР·РѕРІР°С‚РµР»Рµ, РІ С‚РѕРј С‡РёСЃР»Рµ
          РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹С… РґР°РЅРЅС‹С…, Р° С‚Р°РєР¶Рµ РёС… РїРµСЂРµРґР°С‡РµР№, РІ С‚РѕРј С‡РёСЃР»Рµ С‚СЂР°РЅСЃРіСЂР°РЅРёС‡РЅРѕР№, РІ СЃРѕРѕС‚РІРµС‚СЃС‚РІРёРё СЃ РЅРёРј
        </span>
      </label>
      {errors['agreements.personalDataConsent'] && <span className={styles.field__error}>{errors['agreements.personalDataConsent']}</span>}
      <label className={styles.agreements__item}>
        <input
          type="checkbox"
          checked={form.agreements.accuracyConfirmed}
          onChange={(event) => changeNested('agreements', 'accuracyConfirmed', event.target.checked)}
        />
        <span>РЇ РїРѕРґС‚РІРµСЂР¶РґР°СЋ, С‡С‚Рѕ РІРІРµРґС‘РЅРЅС‹Рµ РјРЅРѕР№ Р»РёС‡РЅС‹Рµ РґР°РЅРЅС‹Рµ РІРµСЂРЅС‹ Рё РїСЂРѕРІРµСЂРµРЅС‹ РјРЅРѕР№</span>
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
    return form.isResident ? base : `${base}, РЅРµСЂРµР·РёРґРµРЅС‚ Р Р‘`;
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
      setClientError('РЎРЅР°С‡Р°Р»Р° РІРѕР№РґРёС‚Рµ РІ Р°РєРєР°СѓРЅС‚');
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
        <p className={styles.panel__eyebrow}>Р›РёС‡РЅС‹Р№ РєР°Р±РёРЅРµС‚</p>
        <h1 className={styles.panel__title}>Р’РµСЂРёС„РёРєР°С†РёСЏ</h1>
        <p className={styles.panel__text}>{user.email} В· СЃС‚Р°С‚СѓСЃ: {user.verificationStatus}</p>
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
            РќРµСЂРµР·РёРґРµРЅС‚ Р Р‘
          </label>
        </div>

        <h2 className={styles.sectionTitle}>{title}</h2>

        {isIndividual && <PersonFields form={form} changeNested={changeNested} errors={errors} />}
        {isEntrepreneur && <OrganizationFields form={form} changeNested={changeNested} errors={errors} isLegalEntity={false} />}
        {isLegalEntity && <OrganizationFields form={form} changeNested={changeNested} errors={errors} isLegalEntity />}

        {(isIndividual || isEntrepreneur) && <IdentityBlock form={form} changeNested={changeNested} errors={errors} />}

        <h2 className={styles.sectionTitle}>{isLegalEntity ? 'Р®СЂРёРґРёС‡РµСЃРєРёР№ Р°РґСЂРµСЃ' : 'РђРґСЂРµСЃ СЂРµРіРёСЃС‚СЂР°С†РёРё'}</h2>
        <AddressBlock form={form} changeNested={changeNested} errors={errors} isLegalEntity={isLegalEntity} />

        {isLegalEntity && <LegalManagementFields form={form} changeNested={changeNested} errors={errors} />}

        <h2 className={styles.sectionTitle}>РљРѕРїРёРё РґРѕРєСѓРјРµРЅС‚РѕРІ</h2>
        {(isIndividual || isEntrepreneur) && <PersonFiles form={form} files={files} changeFile={changeFile} errors={errors} />}
        {isEntrepreneur && (
          <div className={styles.formGrid}>
            <FileField label="РЎРІРёРґРµС‚РµР»СЊСЃС‚РІРѕ Рѕ СЂРµРіРёСЃС‚СЂР°С†РёРё РРџ" name="registrationCertificate" files={files} onFileChange={changeFile} errors={errors} required />
          </div>
        )}
        {isLegalEntity && <OrganizationFiles isLegalEntity files={files} changeFile={changeFile} errors={errors} />}

        <h2 className={styles.sectionTitle}>Р‘Р°РЅРєРѕРІСЃРєРёРµ СЂРµРєРІРёР·РёС‚С‹ РґР»СЏ РІРѕР·РІСЂР°С‚Р° Р·Р°РґР°С‚РєР°</h2>
        <BankFields form={form} changeNested={changeNested} errors={errors} />

        <AgreementsBlock form={form} changeNested={changeNested} errors={errors} />

        {(verification.message || clientError) && (
          <p className={verification.status === 'failed' || clientError ? styles.message__error : styles.message__success}>
            {clientError || verification.message}
          </p>
        )}

        <button className={styles.button} type="submit" disabled={verification.status === 'loading'}>
          РћС‚РїСЂР°РІРёС‚СЊ Р·Р°СЏРІРєСѓ РЅР° РїСЂРѕРІРµСЂРєСѓ
        </button>
      </form>
    </section>
  );
}


export default VerificationForm;
