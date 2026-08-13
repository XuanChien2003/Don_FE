import { apiRequest } from './client';

export function getDashboardStats() {
  return apiRequest('/dashboard/stats');
}
