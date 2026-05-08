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

const hasFile = (files, fieldName) => files.some((file) => file.fieldName === fieldName);

const requireFiles = (files, fields, errors) => {
  fields.forEach((field) => {
    if (!hasFile(files, field)) {
      errors[field] = 'Загрузите документ';
    }
  });
};

const validateIndividual = (payload, files, errors) => {
  const baseFields = [
    'personalData.firstName',
    'personalData.lastName',
    'personalData.phone',
    'documentData.documentType',
    'documentData.documentNumber',
    'documentData.issuedAt',
    'bankData.bankDetails'
  ];

  requireFields(payload, baseFields, errors);

  if (!allowedDocumentTypes.includes(getValue(payload, 'documentData.documentType'))) {
    errors['documentData.documentType'] = 'Выберите корректный вид документа';
  }

  if (getValue(payload, 'documentData.documentType') !== 'id_card') {
    requireFields(payload, ['documentData.issuedBy'], errors);
  }

  if (payload.isResident) {
    requireFields(
      payload,
      [
        'personalData.middleName',
        'addressData.region',
        'addressData.district',
        'addressData.locality',
        'addressData.postalCode',
        'addressData.street',
        'addressData.house',
        'documentData.expiresAt'
      ],
      errors
    );

    if (!payload.addressData.sameAsRegistration) {
      requireFields(payload, ['addressData.residentialAddress'], errors);
    }

    requireFiles(files, ['documentMain', 'documentRegistration'], errors);
  } else {
    requireFields(payload, ['addressData.residentialAddress'], errors);
    requireFiles(files, ['documentMain', 'documentAdditional'], errors);
  }
};

const validateEntrepreneur = (payload, files, errors) => {
  requireFields(
    payload,
    [
      'personalData.firstName',
      'personalData.lastName',
      'personalData.phone',
      'organizationData.unp',
      'bankData.bankDetails'
    ],
    errors
  );

  if (payload.isResident) {
    requireFields(
      payload,
      [
        'personalData.middleName',
        'addressData.region',
        'addressData.district',
        'addressData.locality',
        'addressData.postalCode',
        'addressData.street',
        'addressData.house'
      ],
      errors
    );

    if (!payload.addressData.sameAsRegistration) {
      requireFields(payload, ['addressData.residentialAddress'], errors);
    }
  } else {
    requireFields(payload, ['addressData.residentialAddress'], errors);
  }

  requireFiles(files, ['registrationCertificate'], errors);
};

const validateLegalEntity = (payload, files, errors) => {
  requireFields(
    payload,
    [
      'organizationData.shortName',
      'organizationData.fullName',
      'organizationData.unp',
      'organizationData.directorFullName',
      'organizationData.directorBasis',
      'bankData.bankDetails'
    ],
    errors
  );

  if (payload.isResident) {
    requireFields(
      payload,
      [
        'addressData.region',
        'addressData.district',
        'addressData.locality',
        'addressData.postalCode',
        'addressData.street',
        'addressData.phone'
      ],
      errors
    );

    if (!payload.addressData.sameAsLegalAddress) {
      requireFields(payload, ['addressData.postalAddress'], errors);
    }
  } else {
    requireFields(payload, ['addressData.registrationAddress', 'addressData.phone'], errors);
  }

  requireFiles(files, ['registrationCertificate'], errors);
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

  return errors;
};

module.exports = {
  validateVerificationPayload
};
