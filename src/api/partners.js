import { apiRequest } from './client';

export function listPartners() {
  return apiRequest('/partners');
}

export function listAllPartners() {
  return apiRequest('/partners?status=all');
}

export function createPartner(data) {
  return apiRequest('/partners', { method: 'POST', body: data });
}

export function updatePartner(publicId, updates) {
  return apiRequest(`/partners/${encodeURIComponent(publicId)}`, { method: 'PATCH', body: updates });
}

export function resetPartnerCredentials(publicId) {
  return apiRequest(`/partners/${encodeURIComponent(publicId)}/reset-credentials`, { method: 'POST' });
}
