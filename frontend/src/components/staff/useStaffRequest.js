import { apiRequest, authHeader } from '../../api/client.js';

export const createStaffRequest = (token) => async (path, options = {}) =>
  apiRequest(path, {
    ...options,
    headers: {
      ...authHeader(token),
      ...(options.headers || {})
    }
  });
