const allowedAccountTypes = ['individual', 'legal_entity', 'entrepreneur'];
const allowedDocumentTypes = ['passport', 'id_card', 'residence_permit'];

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

const hasFile = (files, fieldName) => files.some((file) => file.fieldName === fieldName);

const requireFiles = (files, fields, errors) => {
  fields.forEach((field) => {
    if (!hasFile(files, field)) {
      errors[field] = 'Загрузите документ';
    }
  });
};

const requireBankFields = (payload, errors) => {
  const fields = [
    'bankData.bankName',
    'bankData.bankUnp',
    'bankData.bankBic',
    'bankData.iban',
    'bankData.bankAddress'
  ];

  if (!payload.isResident) {
    fields.push('bankData.transitBankName', 'bankData.transitBankBic', 'bankData.transitIban');
  }

  requireFields(payload, fields, errors);
};

const requireResidentAddress = (payload, errors, { legalEntity = false } = {}) => {
  const fields = [
    'addressData.locality',
    'addressData.postalCode',
    'addressData.street'
  ];

  if (legalEntity) {
    fields.push('addressData.region');
  } else {
    fields.push('addressData.region', 'addressData.district', 'addressData.house');
  }

  requireFields(payload, fields, errors);

  if (legalEntity && !payload.addressData.sameAsLegalAddress) {
    requireFields(payload, ['addressData.postalAddress'], errors);
  }

  if (!legalEntity && !payload.addressData.sameAsRegistration) {
    requireFields(payload, ['addressData.residentialAddress'], errors);
  }
};

const requireIdentity = (payload, errors) => {
  requireFields(payload, ['documentData.documentType', 'documentData.documentNumber', 'documentData.issuedAt'], errors);

  if (!allowedDocumentTypes.includes(getValue(payload, 'documentData.documentType'))) {
    errors['documentData.documentType'] = 'Выберите корректный вид документа';
  }

  if (getValue(payload, 'documentData.documentType') !== 'id_card') {
    requireFields(payload, ['documentData.issuedBy'], errors);
  }

  if (payload.isResident) {
    requireFields(payload, ['documentData.expiresAt'], errors);
  } else {
    requireFields(payload, ['documentData.personalNumber'], errors);
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
  requireFields(payload, ['personalData.firstName', 'personalData.lastName', 'personalData.phone'], errors);

  if (payload.isResident) {
    requireFields(payload, ['personalData.middleName'], errors);
    requireResidentAddress(payload, errors);
  } else {
    requireFields(payload, ['addressData.residentialAddress'], errors);
  }

  requireIdentity(payload, errors);
  requireIdentityFiles(payload, files, errors);
  requireBankFields(payload, errors);
};

const validateEntrepreneur = (payload, files, errors) => {
  requireFields(
    payload,
    [
      'personalData.fullName',
      'organizationData.unp',
      'organizationData.registrationDate',
      'organizationData.contactPhone'
    ],
    errors
  );

  if (payload.isResident) {
    requireResidentAddress(payload, errors);
  } else {
    requireFields(payload, ['addressData.residentialAddress'], errors);
  }

  requireIdentity(payload, errors);
  requireIdentityFiles(payload, files, errors);
  requireBankFields(payload, errors);
  requireFiles(files, ['registrationCertificate'], errors);
};

const validateLegalEntity = (payload, files, errors) => {
  requireFields(
    payload,
    [
      'organizationData.shortName',
      'organizationData.fullName',
      'organizationData.unp',
      'organizationData.registrationDate',
      'organizationData.contactPhone',
      'organizationData.directorFullName',
      'organizationData.directorPosition',
      'organizationData.directorBasis',
      'organizationData.directorPhone'
    ],
    errors
  );

  if (payload.isResident) {
    requireResidentAddress(payload, errors, { legalEntity: true });
  } else {
    requireFields(payload, ['addressData.registrationAddress', 'addressData.phone'], errors);
  }

  requireBankFields(payload, errors);
  requireFiles(files, ['registrationCertificate', 'stateRegistrationCertificate', 'directorAppointmentOrder'], errors);
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
