const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const validateRegisterPayload = ({ email, password }) => {
  const errors = {};

  if (!email || !isEmail(email)) {
    errors.email = 'Введите корректный email';
  }

  if (!password || password.length < 8) {
    errors.password = 'Пароль должен быть не короче 8 символов';
  }

  return errors;
};

const validateVerificationCodePayload = ({ email, code }) => {
  const errors = {};

  if (!email || !isEmail(email)) {
    errors.email = 'Введите корректный email';
  }

  if (!code || !/^\d{6}$/.test(String(code))) {
    errors.code = 'Код должен состоять из 6 цифр';
  }

  return errors;
};

module.exports = {
  validateRegisterPayload,
  validateVerificationCodePayload
};
