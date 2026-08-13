import { apiRequest } from './client';

export function login({ username, password }) {
  return apiRequest('/auth/login', { method: 'POST', body: { username, password } });
}

export function registerPartner(payload) {
  return apiRequest('/partners/register', { method: 'POST', body: payload });
}
