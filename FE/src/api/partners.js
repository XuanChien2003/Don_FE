import { apiRequest } from './client';

export function listPartners() {
  return apiRequest('/partners');
}
