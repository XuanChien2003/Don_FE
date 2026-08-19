import { apiRequest } from './client';

export function listOrders(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  ).toString();
  return apiRequest(`/orders${query ? `?${query}` : ''}`);
}

export function getOrderDetail(vtpCode) {
  return apiRequest(`/orders/${encodeURIComponent(vtpCode)}`);
}

export function importOrders({ file, partnerId }) {
  const form = new FormData();
  form.append('file', file);
  if (partnerId) form.append('partnerId', partnerId);
  return apiRequest('/orders/import', { method: 'POST', body: form, isFormData: true });
}

export function fetchLabelPdf(vtpCode, format = 'code128') {
  return apiRequest(`/orders/${encodeURIComponent(vtpCode)}/label?format=${format}`, { responseType: 'blob' });
}

export function fetchLabelBarcode(vtpCode, format = 'code128') {
  return apiRequest(`/orders/${encodeURIComponent(vtpCode)}/barcode?format=${format}`, { responseType: 'blob' });
}

export function fetchBatchLabelPdf({ vtpCodes, format = 'code128' }) {
  return apiRequest('/orders/print-batch', { method: 'POST', body: { vtpCodes, format }, responseType: 'blob' });
}
