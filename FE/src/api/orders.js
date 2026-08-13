import { apiRequest } from './client';

export function listOrders(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  ).toString();
  return apiRequest(`/orders${query ? `?${query}` : ''}`);
}

export function getOrderDetail(internalCode) {
  return apiRequest(`/orders/${encodeURIComponent(internalCode)}`);
}

export function importOrders({ file, partnerId }) {
  const form = new FormData();
  form.append('file', file);
  if (partnerId) form.append('partnerId', partnerId);
  return apiRequest('/orders/import', { method: 'POST', body: form, isFormData: true });
}

export function fetchLabelPdf(internalCode, format = 'code128') {
  return apiRequest(`/orders/${encodeURIComponent(internalCode)}/label?format=${format}`, { responseType: 'blob' });
}

export function fetchBatchLabelPdf({ internalCodes, format = 'code128' }) {
  return apiRequest('/orders/print-batch', { method: 'POST', body: { internalCodes, format }, responseType: 'blob' });
}
