import { getApiBaseUrl } from '../api/client.js';

export const getSocketBaseUrl = () => {
  const apiBaseUrl = getApiBaseUrl();

  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return apiBaseUrl.replace(/\/api\/?$/, '');
  }

  if (import.meta.env.DEV) {
    return 'http://127.0.0.1:5055';
  }

  return window.location.origin;
};
