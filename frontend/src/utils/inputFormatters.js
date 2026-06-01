export const phoneDigits = (value = '') => String(value).replace(/\D/g, '').slice(0, 15);

export const formatPhoneDisplay = (value = '') => {
  const digits = phoneDigits(value);

  if (!digits) {
    return '';
  }

  if (digits.startsWith('375')) {
    const operator = digits.slice(3, 5);
    const first = digits.slice(5, 8);
    const second = digits.slice(8, 10);
    const third = digits.slice(10, 12);
    let result = '+375';

    if (operator) {
      result += ` (${operator}`;
      if (operator.length === 2) {
        result += ')';
      }
    }

    if (first) {
      result += ` ${first}`;
    }

    if (second) {
      result += `-${second}`;
    }

    if (third) {
      result += `-${third}`;
    }

    return result;
  }

  return `+${digits}`;
};
