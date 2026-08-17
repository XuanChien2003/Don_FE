import { apiRequest } from './client';

export function login({ username, password }) {
  return apiRequest('/auth/login', { method: 'POST', body: { username, password } });
}

export function registerPartner(payload) {
  return apiRequest('/partners/register', { method: 'POST', body: payload });
}

export function changePassword({ currentPassword, newPassword }) {
  return apiRequest('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
}
