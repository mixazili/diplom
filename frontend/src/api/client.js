const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (import.meta.env.DEV && window.location.port !== '5173') {
    return 'http://127.0.0.1:5055/api';
  }

  return '/api';
};

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Ошибка запроса');
    error.status = response.status;
    error.errors = data.errors || {};
    throw error;
  }

  return data;
};

export const apiRequest = async (path, options = {}) => {
  const headers = options.body instanceof FormData ? options.headers || {} : {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers
  });

  return parseResponse(response);
};

export const authHeader = (token) => (token ? { Authorization: `Bearer ${token}` } : {});
