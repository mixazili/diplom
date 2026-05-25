const allowedAccountTypes = ['individual', 'legal_entity', 'entrepreneur'];
const allowedDirectorBasisTypes = ['charter', 'other', 'regulation', 'power_of_attorney', 'law'];

const getValue = (payload, path) => {
  const value = path.split('.').reduce((result, key) => result && result[key], payload);
  return typeof value === 'string' ? value.trim() : value;
};

const requireFields = (payload, fields, errors) => {
  fields.forEach((field) => {
    if (!getValue(payload, field)) {
      errors[field] = 'Поле обязательно для заполнения';
    }
  });
};

const requireBoolean = (payload, field, errors) => {
  if (getValue(payload, field) !== true) {
    errors[field] = 'Необходимо подтвердить';
  }
};

const requirePhone = (payload, field, errors) => {
  const value = String(getValue(payload, field) || '');

  if (!/^\d{7,15}$/.test(value)) {
    errors[field] = 'Введите телефон цифрами, без плюса и пробелов';
  }
};

const requireEmail = (payload, field, errors) => {
  const value = String(getValue(payload, field) || '');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    errors[field] = 'Введите корректный email';
  }
};

const requireIban = (payload, field, errors) => {
  const value = String(getValue(payload, field) || '').replace(/\s/g, '');

  if (!/^[A-Z]{2}[0-9A-Z]{26}$/i.test(value)) {
    errors[field] = 'Введите IBAN в формате 28 знаков';
  }
};

const hasFile = (files, fieldName) => files.some((file) => file.fieldName === fieldName);

const requireFiles = (files, fields, errors) => {
  fields.forEach((field) => {
    if (!hasFile(files, field)) {
      errors[field] = 'Загрузите документ';
    }
  });
};

const requireCommonPerson = (payload, errors) => {
  requireFields(payload, ['personalData.firstName', 'personalData.lastName', 'personalData.middleName', 'personalData.postalAddress'], errors);
  if (!payload.isResident) {
    requireFields(payload, ['addressData.country'], errors);
  }
  requirePhone(payload, 'personalData.phone', errors);
  requireEmail(payload, 'personalData.notificationEmail', errors);
};

const requireBankFields = (payload, errors) => {
  requireFields(payload, ['bankData.bankName', 'bankData.bankUnp', 'bankData.bankBic'], errors);
  requireIban(payload, 'bankData.iban', errors);

  if (!payload.isResident) {
    requireFields(payload, ['bankData.transitBankName', 'bankData.transitBankBic'], errors);
    requireIban(payload, 'bankData.transitIban', errors);
  }
};

const requireIdentityFiles = (payload, files, errors) => {
  if (payload.isResident) {
    requireFiles(files, ['documentRegistration', 'documentMain'], errors);
    return;
  }

  requireFiles(files, ['documentMain', 'documentPersonalNumberPage'], errors);
};

const validateIndividual = (payload, files, errors) => {
  requireCommonPerson(payload, errors);

  requireIdentityFiles(payload, files, errors);
  requireBankFields(payload, errors);
};

const validateEntrepreneur = (payload, files, errors) => {
  requireCommonPerson(payload, errors);

  if (payload.isResident) {
    requireFields(payload, ['organizationData.unp', 'organizationData.registrationDate'], errors);
  } else {
    requireFields(payload, ['organizationData.taxId'], errors);
  }

  requireIdentityFiles(payload, files, errors);
  requireFiles(files, ['registrationCertificate'], errors);
  requireBankFields(payload, errors);
};

const validateLegalEntity = (payload, files, errors) => {
  requireFields(
    payload,
    [
      'organizationData.shortName',
      'organizationData.fullName',
      'organizationData.directorFullName',
      'organizationData.directorPosition',
      'organizationData.directorBasis',
      'addressData.legalAddress'
    ],
    errors
  );
  requireEmail(payload, 'personalData.notificationEmail', errors);

  if (!allowedDirectorBasisTypes.includes(getValue(payload, 'organizationData.directorBasis'))) {
    errors['organizationData.directorBasis'] = 'Выберите основание полномочий';
  }

  if (payload.isResident) {
    requireFields(payload, ['organizationData.unp', 'organizationData.registrationDate'], errors);
    requireFiles(files, ['charter', 'stateRegistrationCertificate', 'directorAppointmentOrder'], errors);
  } else {
    requireFields(
      payload,
      [
        'organizationData.taxId',
        'organizationData.chiefAccountantFullName',
        'organizationData.chiefAccountantPhone',
        'addressData.country'
      ],
      errors
    );
    requirePhone(payload, 'organizationData.chiefAccountantPhone', errors);
    requireFiles(files, ['taxCertificate', 'stateRegistrationCertificate', 'directorAppointmentOrder'], errors);
  }

  requireBankFields(payload, errors);
};

const validateAgreements = (payload, errors) => {
  requireBoolean(payload, 'agreements.personalDataConsent', errors);
  requireBoolean(payload, 'agreements.accuracyConfirmed', errors);
};

const validateVerificationPayload = (payload, files) => {
  const errors = {};

  if (!allowedAccountTypes.includes(payload.accountType)) {
    errors.accountType = 'Выберите тип пользователя';
  }

  if (typeof payload.isResident !== 'boolean') {
    errors.isResident = 'Укажите резидентство';
  }

  if (payload.accountType === 'individual') {
    validateIndividual(payload, files, errors);
  }

  if (payload.accountType === 'entrepreneur') {
    validateEntrepreneur(payload, files, errors);
  }

  if (payload.accountType === 'legal_entity') {
    validateLegalEntity(payload, files, errors);
  }

  validateAgreements(payload, errors);

  return errors;
};

module.exports = {
  validateVerificationPayload
};
