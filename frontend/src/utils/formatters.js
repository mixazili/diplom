export const formatDateTime = (value) => {
  if (!value) {
    return 'не указано';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(value));
};

export const getVerificationTitle = (verification = {}) => {
  if (verification.accountType === 'legal_entity') {
    return verification.organizationData?.shortName || verification.organizationData?.fullName || 'Юридическое лицо';
  }

  const personal = verification.personalData || {};
  const name = [personal.lastName, personal.firstName, personal.middleName].filter(Boolean).join(' ');

  return name || (verification.accountType === 'entrepreneur' ? 'Индивидуальный предприниматель' : 'Физическое лицо');
};
